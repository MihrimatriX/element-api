# Open risks / known gaps

## Incomplete Atlas photo coverage

- Manifest (~2026-09-06): **40 photos**, **51 compound structures**, **169 keys** (118 elements + 51 compounds).
- Many elements (e.g. Co, Ni and most gases/synthetics) correctly have `photo: null`.
- Optional: re-run `node deploy/scripts/refresh-atlas.mjs --fetch` when improving coverage; expect Wikipedia rate limits.

## Stale Release bin Data after atlas refresh

`start-local.ps1 -NoBuild` can leave `catalog-service/.../bin/Release/net9.0/Data/scientific-elements.json` older than `Infrastructure/Data/`. Symptom: Fe (and atlas fields) missing from live API until rebuild **or** copy source JSON into Release `Data/` and restart catalog. Prefer `start-local.ps1 -Restart` (with build) after atlas edits.

## Commerce / saga — fixed on this host (2026-09-07)

Root cause of RabbitMQ `ACCESS-REFUSED` / `guest`: `start-local.ps1` used PowerShell `-match` with `[A-Za-z_…]` to parse `docker/.env`. Under **Turkish locale**, letter **I** falls out of that range, so keys like `RABBITMQ_DEFAULT_USER` / `INTERNAL_API_KEY` never loaded → fallback `guest`. Fixed by Split-based `.env` parse in `deploy/scripts/start-local.ps1`.

Verified live: order `:5003` + payment `:5005` up; `./deploy/scripts/test-smoke.ps1` → **20/20** including saga Completed + desk sell.

Stray Node `:3000` / `:3001` may still be unrelated orphans — not the gateway order target.

## Uncommitted mega-diff

Working tree still has huge uncommitted scientific JSON, media, compose, and docs changes. Easy to lose or mix with unrelated edits. Commit only when the user asks; consider splitting Atlas vs infra commits.

## Payment logging leftover

Infra simplify removed `logstash-logback-encoder` from `pom.xml` and deleted `logback-spring.xml`. Any **old** `target/` build that still embeds Logstash config will crash on boot. Fix: rebuild payment from current tree (no Logstash XML). Current clean package boots fine.

## Vite / SignalR noise

`npm run build` may print Rolldown `INVALID_ANNOTATION` warnings from `@microsoft/signalr`. Build still succeeds; ignore unless it becomes an error.

## Helm / k8s removed

`deploy/helm` and `deploy/k8s` deleted in this track. Anyone relying on those manifests needs another deploy path (compose or restore from git history).
