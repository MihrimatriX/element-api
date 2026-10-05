import { setTimeout as delay } from "node:timers/promises";
import type { ConfirmChannel, ConsumeMessage } from "amqplib";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { initDb, pool } from "./db/pool.js";
import type { HealthCheckResult, HealthReport } from "./healthUi.js";
import { httpErrorHandler, problem } from "./http.js";
import {
  closeMessaging,
  connectMessaging,
  FAILED_SAGA_QUEUE,
  getChannel,
} from "./messaging/bus.js";
import { startOutboxDispatcher } from "./messaging/outboxDispatcher.js";
import { logger, requestLogger } from "./observability.js";
import { registerOpsEndpoints } from "./ops.js";
import { apiInfoRouter } from "./routes/apiInfo.js";
import { ordersRouter } from "./routes/orders.js";
import { handleSagaMessage } from "./saga/orchestrator.js";
import { startTimeoutSweeper } from "./saga/timeoutSweeper.js";

/** A failing saga message is re-queued this many times before it is parked in the failed queue. */
const MAX_SAGA_RETRIES = 4;
/** Pause before re-queueing, so a briefly unavailable database can recover. */
const SAGA_RETRY_DELAY_MS = 1000;
const RETRY_COUNT_HEADER = "x-retry-count";
/** docker stop grace: force-exit if draining takes longer than this. */
const SHUTDOWN_TIMEOUT_MS = 8000;

/** Times one dependency probe; a thrown error counts as unhealthy. */
async function runHealthCheck(
  name: string,
  probe: () => unknown,
  healthyText: string,
  unhealthyText: string,
): Promise<HealthCheckResult> {
  const startedAt = performance.now();
  let ok = true;
  try {
    await probe();
  } catch {
    ok = false;
  }
  return {
    name,
    ok,
    durationMs: performance.now() - startedAt,
    description: ok ? healthyText : unhealthyText,
  };
}

/** Probes PostgreSQL and RabbitMQ for /health and /health/ready. */
async function checkHealth(): Promise<HealthReport> {
  const database = await runHealthCheck(
    "PostgreSQL",
    () => pool.query("SELECT 1"),
    "PostgreSQL connection is healthy.",
    "PostgreSQL is unreachable.",
  );
  const broker = await runHealthCheck(
    "RabbitMQ",
    () => getChannel(),
    "RabbitMQ connection is open.",
    "RabbitMQ is unreachable.",
  );
  const checks = [database, broker];
  return { ok: checks.every((check) => check.ok), checks };
}

/**
 * Re-publishes a failed saga message with an incremented retry counter (to the failed queue once the
 * retries are used up) and acks the original only after the broker confirmed the copy, so no event is lost.
 * If even that fails, the original is nacked back onto the queue.
 */
async function retryOrPark(
  channel: ConfirmChannel,
  message: ConsumeMessage,
  err: unknown,
): Promise<void> {
  logger.error({ err }, "Saga handler error");
  const retryCountHeader = message.properties.headers?.[RETRY_COUNT_HEADER];
  const attempts = Number(retryCountHeader || 0);
  const targetQueue =
    attempts < MAX_SAGA_RETRIES ? config.sagaQueue : FAILED_SAGA_QUEUE;
  try {
    await delay(SAGA_RETRY_DELAY_MS);
    channel.sendToQueue(targetQueue, message.content, {
      ...message.properties,
      persistent: true,
      headers: {
        ...message.properties.headers,
        [RETRY_COUNT_HEADER]: attempts + 1,
      },
    });
    await channel.waitForConfirms();
    channel.ack(message);
  } catch {
    channel.nack(message, false, true);
  }
}

/**
 * Feeds every message of the saga queue to the orchestrator; acks on success, retries on failure.
 * Returns the consumer tag so shutdown can cancel the consumer.
 */
async function consumeSagaEvents(channel: ConfirmChannel): Promise<string> {
  const { consumerTag } = await channel.consume(config.sagaQueue, (message) => {
    // RabbitMQ delivers null when the consumer is cancelled.
    if (!message) return;
    handleSagaMessage(message.content)
      .then(() => channel.ack(message))
      .catch((err) => retryOrPark(channel, message, err));
  });
  return consumerTag;
}

/** Boots the service: database schema, RabbitMQ consumer, background workers, then the HTTP API. */
async function main(): Promise<void> {
  await initDb();
  const channel = await connectMessaging();
  const consumerTag = await consumeSagaEvents(channel);
  const timers = [startOutboxDispatcher(), startTimeoutSweeper()];

  const app = express();
  app.use(
    helmet({
      // Behind gateway/Caddy; API JSON only — no CSP needed here.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(requestLogger);
  registerOpsEndpoints(app, checkHealth);
  app.use("/api/v1", apiInfoRouter);
  app.use("/api/v1/orders", ordersRouter);
  // JSON 404 instead of Express's HTML "Cannot GET …" page (public API surface).
  app.use((_req, res) => problem(res, 404, "Not found."));
  app.use(httpErrorHandler);

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, "order-service listening");
  });

  // docker stop: drain, then exit. Unacked saga messages are redelivered and deduped
  // via processed_messages, so anything cut off here is safe to replay.
  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "order-service shutting down");
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);
    timers.forEach(clearInterval);
    channel.cancel(consumerTag)
      .then(() => new Promise((resolve) => server.close(resolve)))
      .then(closeMessaging)
      .then(() => pool.end())
      .then(
        () => process.exit(0),
        (err) => {
          logger.error({ err }, "Shutdown failed");
          process.exit(1);
        },
      );
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, "order-service failed to start");
  process.exit(1);
});
