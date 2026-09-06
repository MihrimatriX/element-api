# Project overview — ElementAPI

**What it is:** Public scientific catalog API (118 elements + 51 compounds) plus a paper-credit market/shop simulation and a React discovery UI.

**Not real money / not physical delivery.** Currency code `KREDI`; price source `simulation`.

## Surfaces

| Surface | Role |
|---------|------|
| `web-app` | Periodic table, compound explorer, `/lab` discovery game, market, shop, API docs |
| `gateway-service :5000` | YARP + GraphQL BFF; single public API entry |
| `catalog-service :5002` | Elements + market/stock |
| `compound-service :5007` | Compounds |
| `identity-service :5001` | Auth, JWT, API keys |
| `order-service :5003` | Orders + saga orchestration (Node) |
| `payment-service :5005` | Payment worker (Java) |
| `shipment-service :5004` | Shipment worker |
| `notification-service :5006` | SignalR notifications |

## Scientific / Atlas layer

- Source data: PubChem-derived JSON in catalog/compound Infrastructure `Data/` folders.
- Atlas overlay: Turkish editorial copy, media, Wikipedia/PubChem links via `deploy/scripts/refresh-atlas.mjs`.
- Editorial source: `deploy/data/atlas-editorial.mjs`
- Media manifest: `deploy/data/atlas-media.json`
- Static files: `web-app/public/media/atlas/`

## Docs map

- Quickstart: root [`README.md`](../../README.md)
- Exhaustive Turkish narrative of recent work: [`docs/WHAT-WAS-DONE.md`](../WHAT-WAS-DONE.md)
- This folder: agent + human memory bank
- Local verify rule: [`.cursor/rules/local-dev.mdc`](../../.cursor/rules/local-dev.mdc)
- Older agent notes: [`deploy/AGENTS.md`](../../deploy/AGENTS.md)
