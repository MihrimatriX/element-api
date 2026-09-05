import { Router } from 'express';
import { packageJson } from '../meta.js';

export const apiInfoRouter = Router();

apiInfoRouter.get('/', (_req, res) => {
  const base = `${_req.protocol}://${_req.get('host')}`;
  res.json({
    orders: `${base}/api/v1/orders`,
    orders_search: `${base}/api/v1/orders/search?status=Submitted`,
    orders_stats: `${base}/api/v1/orders/stats`,
    wallet: `${base}/api/v1/me/wallet`,
    holdings: `${base}/api/v1/me/holdings`,
    desk_sell: `${base}/api/v1/desk/sell`,
    health: `${base}/health`,
    info: `${base}/info`,
    metrics: `${base}/metrics`,
    version: packageJson.version,
  });
});
