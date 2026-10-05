import type { Express, Request, Response } from "express";
import { buildHealthResponse, type HealthReport } from "./healthUi.js";
import { packageJson } from "./meta.js";

/** Registers the health and service-info endpoints used by Docker, the gateway and operators. */
export function registerOpsEndpoints(
  app: Express,
  checkHealth: () => Promise<HealthReport>,
): void {
  const respondWithDependencyHealth = async (_req: Request, res: Response) => {
    const report = await checkHealth();
    const body = buildHealthResponse(report.checks);
    res.status(report.ok ? 200 : 503).json(body);
  };

  // Liveness only proves the process answers; it never touches dependencies.
  app.get("/health/live", (_req, res) => {
    res.json(buildHealthResponse([]));
  });
  app.get("/health/ready", respondWithDependencyHealth);
  app.get("/health", respondWithDependencyHealth);

  app.get("/info", (req: Request, res: Response) => {
    const base = `${req.protocol}://${req.get("host")}`;
    res.json({
      name: packageJson.name,
      version: packageJson.version,
      environment: process.env.NODE_ENV ?? "development",
      links: {
        api: `${base}/api/v1`,
        orders: `${base}/api/v1/orders`,
        orders_search: `${base}/api/v1/orders/search`,
        health: `${base}/health`,
      },
    });
  });
}
