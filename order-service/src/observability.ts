import type { IncomingMessage } from 'http';
import pino from 'pino';
import { pinoHttp } from 'pino-http';

// Logs stay on stdout, where the local runner or container can capture them.
export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info', base: { service: 'order-service' } });
export const requestLogger = pinoHttp({
  logger,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url?.split('?')[0] }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: { ignore: (req: IncomingMessage) => req.url?.startsWith('/health') ?? false },
});
