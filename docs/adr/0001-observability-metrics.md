# ADR: Observability — `/metrics` and Prometheus

- **Status:** Accepted
- **Date:** 2026-09-26
- **Context:** Full Prometheus / Grafana / ELK / HealthChecks UI stack was removed to keep local and demo runs lean. `/metrics` and `/health-ui` return 404. Product track still needs request correlation and honest health.

## Decision

1. **Do not restore Prometheus scraping or a metrics UI** in the default platform. Keep `/info`, `/health`, `/health/live`, `/health/ready`.
2. **Correlation:** Gateway mints or echoes `X-Request-Id` and forwards it via YARP. Order-service (and other services that log HTTP) should prefer that header as the request id. Structured stdout logs remain the observability surface.
3. **Alternative if metrics are needed later:** add a thin Prometheus endpoint behind the gateway on a private network only — not in the public Caddy path — as a separate ADR. Until then this is **documented debt closed**, not an open “forgot metrics” bug.

## Consequences

- Operators use container logs + health probes, not Grafana.
- Scrape dashboards are out of scope for beta.
- Correlation id is the cross-service join key in logs.
