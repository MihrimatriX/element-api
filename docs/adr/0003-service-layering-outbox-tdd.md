# ADR: Service layering, transactional outbox and test-first domain rules

- **Status:** Accepted
- **Date:** 2026-10-22
- **Context:** The project is a pilot for microservice practice (SOLID, ACID, DDD, TDD). Service boundaries were already right (one database per service, events between them), but inside the services business rules were spread over controllers, listeners and SQL; Java and .NET services published events in or after their database transaction (dual write); several money and stock paths had no tests. wallet-service is the reference implementation of this ADR.

## Decision

### 1. Layers, dependencies pointing inwards

| Layer | Holds | May depend on |
|---|---|---|
| `domain` | Aggregates, entities, value objects, domain rules | nothing (no framework, SQL or broker) |
| `application` | One use case per method; ports (`*Repository`, `Outbox`) as interfaces | `domain` |
| `infrastructure` / `messaging` / `web` | JDBC/EF adapters implementing the ports; HTTP controllers and queue listeners that parse input and call a use case | `application`, `domain` |

Controllers and listeners authenticate, validate and translate; they do not decide. Repositories store and load; they do not decide. The aggregate decides.

### 2. Tactical DDD only where there are invariants

Model aggregates and value objects where the service protects a rule that can be broken: balance never negative, stock never oversold, an order moving only along allowed transitions. Read-only or pass-through services (science, compound reads, gateway) stay simple: SOLID and tests, no aggregates. A layer without a rule to protect is cost without benefit.

### 3. ACID rules

- **One use case = one database transaction.** Its boundary is visible in the application service (`TransactionTemplate`, `IDbContextTransaction`, `BEGIN … COMMIT`), not hidden on a listener.
- **Lock the aggregate row first** (`SELECT … FOR UPDATE`), then read anything the decision depends on.
- **Inbox:** record the delivery id (`processed_messages`) in the same transaction, so a redelivery is skipped and a rolled-back attempt is retried.
- **Outbox:** outgoing events are rows written in the same transaction as the state change. A relay publishes committed rows, waits for the broker confirm, then marks them; the row id is the message id so consumers can dedupe. Never publish to the broker inside or after the business transaction.
- **The database enforces invariants too:** CHECK constraints, unique indexes. Add constraints `NOT VALID` so a legacy row cannot make startup fail and the container restart-loop.
- **Money and quantities are decimals end to end** (`BigDecimal`, `decimal`, `NUMERIC`), never `double`.
- **No network calls inside a transaction** (prices, other services): fetch first, then open the transaction.

### 4. Test-first

- Domain rules are written test-first: a failing unit test, then the code. These tests use no database and run in milliseconds.
- Transaction guarantees are proven against a real database with Testcontainers: concurrent writers cannot break the invariant, state and outbox commit or roll back together, constraints reject bad data, the relay publishes each row once. These tests skip (not fail) when Docker is missing.
- The end-to-end smoke (`deploy/scripts/test-smoke.ps1`) must still pass.

## Rollout

| Service | Invariants worth an aggregate | Work |
|---|---|---|
| wallet (Java) | balance, charge/refund once, assets only for paid orders | Done: domain model, ports, outbox, CHECKs, Testcontainers |
| inventory (Java) | stock never oversold, reservation closed once | Done: StockItem/Reservation, outbox, CHECKs, Testcontainers |
| order (Node) | saga transitions, compensation | Done: Order aggregate on the transition functions; outbox/inbox already existed |
| catalog (.NET) | price moves once per completed order or desk sale | Done: behaviour in ChemicalElement/StockReservation, row locks, MassTransit EF Core outbox + inbox (its old reservation consumers were never registered and were removed; stock belongs to inventory) |
| shipment, notification (.NET) | shipment decided once; at-least-once delivery | Done: ShipmentRecord.Open + EF outbox/inbox; notification has no DB, webhooks carry X-Element-Delivery for dedupe |
| identity (.NET) | API key and webhook limits, revocation | Done: rules in ApiKey/WebhookSubscription; publishes no events, so no outbox |
| compound, science, gateway | none (read or pass-through) | Done: tests only, no production change needed |

## Consequences

- More files per service (domain, ports, adapters), in exchange for rules that live in one place and are tested without infrastructure.
- Events are delivered at least once and slightly later (relay poll, default 500 ms); every consumer must stay idempotent.
- The outbox and inbox tables grow; both are pruned at startup (outbox: published rows older than 7 days).
- Every stateful service waits for Postgres at startup (shared-lib `IsTransientStartupError`, order-service `waitForDatabase`) instead of crash-looping while it boots.
- Testcontainers is pinned to 1.21.4 in Java services because Spring Boot 3.4.1 ships 1.20.4, which Docker Engine 29 rejects.
