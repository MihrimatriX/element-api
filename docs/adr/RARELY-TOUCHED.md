# Solo maintenance — rarely touched services

Surfaces that should stay boring. Prefer env/docs fixes over code.

| Service | Why rare | Touch when |
|---------|----------|------------|
| `shipment-service` | Demo carrier only | Saga contract / tracking format |
| `notification-service` | Webhook fanout only | SSRF allowlist / event names |
| `compound-service` | Scientific JSON host | Catalog refresh pipeline |
| `science-service` | Atlas-only compose | Independent demo profile |
| `wallet-service` | Java ledger | Credit limit / welcome grant / debit bugs |
| `inventory-service` | Java stock | Default grams / reserve bugs |
| `shared-lib` | Cross-cutting | Event URN / prod config guards |

**Hot paths:** `web-app`, `gateway-service`, `identity-service`, `order-service`, `catalog-service` (pricing/science proxy).

Quarterly simplification target: see [SIMPLIFICATION-ROADMAP.md](./SIMPLIFICATION-ROADMAP.md).
