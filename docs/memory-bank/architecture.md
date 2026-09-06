# Architecture (scannable)

## Request path

```
Browser / API client
  → gateway :5000  (REST + GraphQL + SignalR proxy)
    → identity / catalog / compound / order / notification
order saga → RabbitMQ → payment + shipment (+ catalog stock events)
identity, catalog, compound, order, shipment → PostgreSQL (separate DBs)
catalog + gateway → Redis (where configured)
```

Host-local Postgres port on this machine: **5434** (`POSTGRES_HOST_PORT`). Web dev: **5173**. Docker web: **3000**.

## Scientific API v2

- Elements: `GET /api/v2/elements/{symbol}` (also v1 market/catalog routes under `/api/v1/...`)
- Compounds: `GET /api/v2/compounds/{slug}`
- Supports `fields`, ETag, CORS; provenance + units on scientific properties
- Atlas fields on records: `editorial`, `media`, `external_links` (+ compounds: `display_formula`, `composition`)

## Lab (`/lab`)

- Client-only discovery game (localStorage progress). Does **not** touch wallet/orders.
- Logic: `web-app/src/services/lab.ts`
- UI: `web-app/src/pages/Laboratory.tsx`
- Tests: `web-app/tests/lab.test.mjs` (18 reachable recipes, unlock stages, equation conservation)
- Legacy `/stack` → redirect to `/hakkinda` (observability stack page removed)

## Atlas media pipeline

1. `node deploy/scripts/refresh-atlas.mjs` — offline reapply editorial + manifest into scientific JSON
2. `node deploy/scripts/refresh-atlas.mjs --fetch` — Wikipedia/Commons + PubChem structure download
3. Scientific refresh scripts call atlas reapply after property updates
4. Photos only when Commons license matches allowlist (CC BY, CC0, Public domain, **FAL** / Free Art License)
5. Element photos: specimen-name heuristics (reject portraits/diagrams/lab gear)

## Observability (intentionally removed)

No Prometheus `/metrics`, HealthChecks UI, Seq, ELK, Grafana, Loki, OTLP in the default stack. Ops surface left: `/info`, `/health`, `/health/live`, `/health/ready`. Helm/k8s deploy folders removed in the same cleanup track.
