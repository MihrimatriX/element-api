import { Writable } from 'stream';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import client from 'prom-client';
function logstashStream() {
    const url = process.env.LOGSTASH_HTTP_URL;
    if (!url)
        return undefined;
    return new Writable({
        write(chunk, _encoding, callback) {
            fetch(url, {
                method: 'POST',
                body: chunk,
                headers: { 'Content-Type': 'application/x-ndjson' },
            })
                .then(() => callback())
                .catch(() => callback()); // ponytail: fire-and-forget; Filebeat is the durable path
        },
    });
}
const streams = [{ stream: process.stdout }];
const ls = logstashStream();
if (ls)
    streams.push({ stream: ls });
export const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: 'order-service' },
}, pino.multistream(streams));
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});
const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});
export const requestLogger = pinoHttp({
    logger,
    autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/metrics',
    },
});
export function metricsMiddleware(req, res, next) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
        const route = req.route?.path ?? req.path;
        const labels = { method: req.method, route, status_code: String(res.statusCode) };
        httpRequestDuration.observe(labels, durationSec);
        httpRequestsTotal.inc(labels);
    });
    next();
}
export async function getMetrics() {
    return register.metrics();
}
