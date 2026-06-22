import express from 'express';
import { config } from './config.js';
import { initDb, pool } from './db/pool.js';
import { connectMessaging, getChannel } from './messaging/bus.js';
import { handleSagaMessage } from './saga/orchestrator.js';
import { startOutboxDispatcher } from './messaging/outboxDispatcher.js';
import { startTimeoutSweeper } from './saga/timeoutSweeper.js';
import { ordersRouter } from './routes/orders.js';
import { apiInfoRouter } from './routes/apiInfo.js';
import { getMetrics, logger, metricsMiddleware, requestLogger } from './observability.js';
import { registerOpsEndpoints } from './ops.js';

async function checkHealth(): Promise<{ ok: boolean; checks: { name: string; ok: boolean; durationMs: number; description?: string }[] }> {
  const checks: { name: string; ok: boolean; durationMs: number; description?: string }[] = [];

  const dbStart = performance.now();
  let dbOk = false;
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch {
    dbOk = false;
  }
  checks.push({
    name: 'PostgreSQL',
    ok: dbOk,
    durationMs: performance.now() - dbStart,
    description: dbOk ? 'PostgreSQL connection is healthy.' : 'PostgreSQL is unreachable.',
  });

  const rabbitStart = performance.now();
  let rabbitOk = false;
  try {
    getChannel();
    rabbitOk = true;
  } catch {
    rabbitOk = false;
  }
  checks.push({
    name: 'RabbitMQ',
    ok: rabbitOk,
    durationMs: performance.now() - rabbitStart,
    description: rabbitOk ? 'RabbitMQ connection is open.' : 'RabbitMQ is unreachable.',
  });

  return { ok: checks.every((c) => c.ok), checks };
}

async function main() {
  await initDb();
  await connectMessaging();

  const ch = getChannel();
  ch.consume(config.sagaQueue, (msg) => {
    if (!msg) return;
    handleSagaMessage(msg.content)
      .then(() => ch.ack(msg))
      .catch((err) => {
        logger.error({ err }, 'Saga handler error');
        ch.nack(msg, false, false);
      });
  });

  startOutboxDispatcher();
  startTimeoutSweeper();

  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.use(metricsMiddleware);
  registerOpsEndpoints(app, checkHealth);
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(await getMetrics());
  });
  app.use('/api/v1', apiInfoRouter);
  app.use('/api/v1/orders', ordersRouter);

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'order-service listening');
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'order-service failed to start');
  process.exit(1);
});
