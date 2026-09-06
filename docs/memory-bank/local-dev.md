# Local development & verify

**Rule:** never `docker compose up --build` the whole platform just to verify UI or one service. See `.cursor/rules/local-dev.mdc`.

## Daily loop

```powershell
# Infra only if missing (no --build)
docker compose --env-file docker/.env up -d postgres redis rabbitmq

# Apps on host
./deploy/scripts/start-local.ps1 -IncludePayment
# after code changes:
./deploy/scripts/start-local.ps1 -Restart -IncludePayment
# skip rebuild:
./deploy/scripts/start-local.ps1 -NoBuild -IncludePayment

npm --prefix web-app run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Logs / PIDs: `artifacts/local/`. This machine: Postgres host **5434**, web **5173**, gateway **5000**.

## Verify without full Docker rebuild

| Check | Command / probe |
|-------|-----------------|
| Lab unit tests | `npm --prefix web-app test` |
| Web build | `npm --prefix web-app run build` |
| Catalog | `dotnet build catalog-service/Element.Services.Element.API/Element.Services.Element.API.csproj` |
| Order static checks | `npm --prefix order-service run check` |
| Live Fe + atlas | `GET http://127.0.0.1:5000/api/v2/elements/fe?fields=symbol,names,editorial,media` |
| Live lab page | `GET http://127.0.0.1:5173/lab` |
| Fe image | `GET http://127.0.0.1:5173/media/atlas/fe.jpg` |
| Metrics removed | `GET /metrics` and `/health-ui` → **404** |

## Atlas refresh

```powershell
# Offline: rewrite editorial/media onto scientific JSON from manifest
node deploy/scripts/refresh-atlas.mjs

# Online: Wikipedia + Commons photos + PubChem structures (slow, rate-limited)
node deploy/scripts/refresh-atlas.mjs --fetch
```

Scientific property refresh then auto-reapplies atlas via `refresh-scientific-catalog.mjs`.

## Do not

- Rebuild ELK/Grafana/all microservices images to confirm a landing or `/lab` change
- Treat full `docker compose up --build` as the default verify step (demo-only, user-requested)
