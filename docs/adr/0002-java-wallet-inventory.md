# ADR: Java wallet / inventory stay Java

- **Status:** Accepted
- **Date:** 2026-09-26
- **Context:** KREDI ledger and stock are Spring Boot / Java 21 services (`:5005`, `:5008`). Solo maintenance cost of polyglot is real; Node rewrite is tempting.

## Decision

**Do not migrate wallet-service or inventory-service to Node** in the next quarter unless a hard hiring/ops constraint appears.

Reasons to keep Java:

- Bounded contexts already isolated (ledger + stock); MassTransit-compatible messaging works
- Domain rules are thin JDBC + Spring; rewrite cost ≫ benefit
- Order-service (Node) already owns saga orchestration; duplicating debit/stock in Node would blur ownership

## Consequences

- CI keeps `mvn test` path stages for these two folders
- Documented as “rarely touched” — prefer config/env fixes over feature churn
- Revisit only if Java toolchain becomes unavailable on the solo maintainer machine
