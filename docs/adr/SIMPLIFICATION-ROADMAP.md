# Simplification roadmap (quarterly)

**Horizon:** through **2026-12-31**.

| Goal | Action | Status |
|------|--------|--------|
| One CI system | Jenkins Multibranch path matrix (not GitHub Actions) | Done (docs + Jenkinsfile) |
| Observability lean | Keep metrics red; correlation id only | Done (ADR 0001) |
| Polyglot freeze | Java wallet/inventory stay | Done (ADR 0002) |
| Auth storage | httpOnly / refresh — revisit | Backlog 2026-12-31 |
| Notification durability | Persistent retry + history | **Deferred to P3** (see below) |
| Atlas photo gaps | Content backlog, not engineering | Product list |
| Monorepo UX | Root `test` / `lint` / `up` / `present` scripts | Done |

## Notification — P3 deferral (decision record)

**Decision (2026-09-26):** Do **not** implement durable retry queues + delivery history this quarter.

- Current: best-effort webhook fanout; failures are logged
- Ceiling: at-most-once under broker/DB blips — acceptable for demo webhooks
- Upgrade path (P3): outbox table in notification DB + admin list of deliveries

## Atlas photo gaps (product, not tech)

~75/118 element photos; intentional nulls for gases / synthesis / weak Commons matches. Do **not** fill with bad licenses. Content backlog lives with editorial/media inventory — not a CI or service ticket.
