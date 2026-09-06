# Open risks / known gaps

## Incomplete Atlas photo coverage

- Manifest (~2026-09-06): **40 photos**, **51 compound structures**, **169 keys** (118 elements + 51 compounds).
- Many elements (e.g. Co, Ni and most gases/synthetics) correctly have `photo: null`.
- Optional: re-run `node deploy/scripts/refresh-atlas.mjs --fetch` when improving coverage; expect Wikipedia rate limits.

## Commerce / saga local fragility

Verified 2026-09-06 on this host:

| Piece | State |
|-------|-------|
| Gateway `:5000` | Up (`/health` 200) |
| Identity / catalog / compound / shipment / notification | Up |
| Market board via gateway | 200 |
| Auth register via gateway | 200 |
| Order on gateway cluster `:5003` | **Down** (start-local log: RabbitMQ `ACCESS-REFUSED` PLAIN auth) |
| Payment `:5005` | **Down** (prior start failed: Logstash appender class missing after obs deps removed; `logback-spring.xml` deleted in working tree — needs clean rebuild/restart) |
| Stray Node `:3001` `/health` | Unrelated/orphan listener; **not** the gateway order target |

**Implication:** Full buy/sell saga and `test-e2e` / live order smoke may fail until `start-local.ps1 -Restart -IncludePayment` succeeds with correct `docker/.env` Rabbit credentials. Science, Atlas, and `/lab` do **not** require order/payment.

## Uncommitted mega-diff

Working tree still has huge uncommitted scientific JSON, media, compose, and docs changes. Easy to lose or mix with unrelated edits. Commit only when the user asks; consider splitting Atlas vs infra commits.

## Payment logging leftover

Infra simplify removed `logstash-logback-encoder` from `pom.xml` and deleted `logback-spring.xml`. Any **old** `target/` build that still embeds Logstash config will crash on boot. Fix: rebuild payment from current tree (no Logstash XML).

## Vite / SignalR noise

`npm run build` may print Rolldown `INVALID_ANNOTATION` warnings from `@microsoft/signalr`. Build still succeeds; ignore unless it becomes an error.

## Helm / k8s removed

`deploy/helm` and `deploy/k8s` deleted in this track. Anyone relying on those manifests needs another deploy path (compose or restore from git history).
