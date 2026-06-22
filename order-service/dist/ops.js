import { buildHealthUiResponse } from './healthUi.js';
import { packageJson } from './meta.js';
export function registerOpsEndpoints(app, checkHealth) {
    app.get('/health/live', (_req, res) => {
        res.json(buildHealthUiResponse([]));
    });
    app.get('/health/ready', async (_req, res) => {
        const h = await checkHealth();
        const body = buildHealthUiResponse(h.checks);
        res.status(h.ok ? 200 : 503).json(body);
    });
    app.get('/health', async (_req, res) => {
        const h = await checkHealth();
        const body = buildHealthUiResponse(h.checks);
        res.status(h.ok ? 200 : 503).json(body);
    });
    app.get('/info', (req, res) => {
        const base = `${req.protocol}://${req.get('host')}`;
        res.json({
            name: packageJson.name,
            version: packageJson.version,
            environment: process.env.NODE_ENV ?? 'development',
            links: {
                api: `${base}/api/v1`,
                orders: `${base}/api/v1/orders`,
                orders_search: `${base}/api/v1/orders/search`,
                health: `${base}/health`,
                metrics: `${base}/metrics`,
            },
        });
    });
}
