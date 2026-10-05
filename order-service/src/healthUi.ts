type HealthStatus = "Healthy" | "Unhealthy";

/** Outcome of one dependency probe (PostgreSQL, RabbitMQ). */
export interface HealthCheckResult {
  name: string;
  ok: boolean;
  durationMs: number;
  description?: string;
}

/** All dependency probes together; `ok` is true only when every check passed. */
export interface HealthReport {
  ok: boolean;
  checks: HealthCheckResult[];
}

/** Builds the JSON body returned by every /health endpoint. */
export function buildHealthResponse(checks: HealthCheckResult[]): {
  status: HealthStatus;
  checks: { name: string; ok: boolean; ms: number }[];
} {
  const allHealthy = checks.every((check) => check.ok);
  return {
    status: allHealthy ? "Healthy" : "Unhealthy",
    checks: checks.map((check) => ({
      name: check.name,
      ok: check.ok,
      ms: check.durationMs,
    })),
  };
}
