type HealthStatus = 'Healthy' | 'Unhealthy';

export interface HealthCheckResult {
  name: string;
  ok: boolean;
  durationMs: number;
  description?: string;
}

export function buildHealthResponse(checks: HealthCheckResult[]): {
  status: HealthStatus;
  checks: { name: string; ok: boolean; ms: number }[];
} {
  return {
    status: checks.every((c) => c.ok) ? 'Healthy' : 'Unhealthy',
    checks: checks.map((c) => ({ name: c.name, ok: c.ok, ms: c.durationMs })),
  };
}
