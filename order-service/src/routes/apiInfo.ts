import { Router } from "express";
import { packageJson } from "../meta.js";

/** GET /api/v1 — a small discovery document listing this service's main links. */
export const apiInfoRouter = Router();

apiInfoRouter.get("/", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  res.json({
    orders: `${base}/api/v1/orders`,
    orders_search: `${base}/api/v1/orders/search?status=Submitted`,
    orders_stats: `${base}/api/v1/orders/stats`,
    health: `${base}/health`,
    info: `${base}/info`,
    version: packageJson.version,
  });
});
