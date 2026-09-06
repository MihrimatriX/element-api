import express from 'express';
import { config } from './config.js';
import { initDb, pool } from './db/pool.js';
import { connectMessaging, getChannel } from './messaging/bus.js';
import { handleSagaMessage } from './saga/orchestrator.js';
import { startOutboxDispatcher } from './messaging/outboxDispatcher.js';
import { startTimeoutSweeper } from './saga/timeoutSweeper.js';
import { ordersRouter } from './routes/orders.js';
import { apiInfoRouter } from './routes/apiInfo.js';
import { deskRouter, internalWalletRouter, meRouter } from './routes/wallet.js';
import { logger, requestLogger } from './observability.js';
import { registerOpsEndpoints } from './ops.js';
import { httpErrorHandler } from './http.js';

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
      .catch(async (err) => {
        logger.error({ err }, 'Saga handler error');
        const attempts = Number(msg.properties.headers?.['x-retry-count'] || 0);
        // Preserve failed events for inspection; never acknowledge before the retry is durable.
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          ch.sendToQueue(attempts < 4 ? config.sagaQueue : `${config.sagaQueue}_failed`, msg.content, {
            ...msg.properties,
            persistent: true,
            headers: { ...msg.properties.headers, 'x-retry-count': attempts + 1 },
          });
          await ch.waitForConfirms();
          ch.ack(msg);
        } catch { ch.nack(msg, false, true); }
      });
  });

  startOutboxDispatcher();
  startTimeoutSweeper();

  const app = express();
  app.use(express.json({ limit: '32kb' }));
  app.use(requestLogger);
  registerOpsEndpoints(app, checkHealth);
  app.use('/api/v1', apiInfoRouter);
  app.use('/api/v1/me', meRouter);
  app.use('/api/v1/desk', deskRouter);
  app.use('/internal/wallet', internalWalletRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use(httpErrorHandler);

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'order-service listening');
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'order-service failed to start');
  process.exit(1);
});
