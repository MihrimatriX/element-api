import type { IncomingMessage } from "http";
import pino from "pino";
import { pinoHttp } from "pino-http";

/** Shared JSON logger; writes to stdout so the local runner or container can capture it. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "order-service" },
});

/** Express middleware that logs every request (except health probes) under a correlation id. */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) =>
    trimmedHeader(req, "x-request-id") ||
    trimmedHeader(req, "x-correlation-id") ||
    randomRequestId(),
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url?.split("?")[0],
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: {
    ignore: (req: IncomingMessage) => req.url?.startsWith("/health") ?? false,
  },
});

function trimmedHeader(
  req: IncomingMessage,
  name: string,
): string | undefined {
  return (req.headers[name] as string | undefined)?.trim();
}

/** Short unique id for log correlation only; not cryptographically random. */
function randomRequestId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
