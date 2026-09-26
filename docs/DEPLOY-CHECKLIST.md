# Deploy checklist — public / prod

Operator gate before pointing DNS at a host. Full domain/TLS narrative: [PUBLIC-HOST.md](./PUBLIC-HOST.md). Env fill procedure: [ops/PROD-ENV.md](./ops/PROD-ENV.md).

## Ports (must hold)

Public overlay (`docker-compose.public.yml`) sets `ports: !override []` on **every** app and infra service. Only **Caddy** publishes host ports:

| Host | Service |
|------|---------|
| `CADDY_HTTP_PORT` (prod: **80**) | Caddy → web + gateway |
| `CADDY_HTTPS_PORT` (prod: **443** + UDP) | Caddy TLS |

**Closed on the host (do not re-publish):** postgres, redis, rabbitmq, identity, catalog, compound, order, wallet, inventory, shipment, notification, **gateway**, **web-app**.

Verify after `present-public.ps1 -Server`:

```powershell
docker compose -p element-prod --env-file docker/.env.public.prod `
  -f docker-compose.yml -f docker-compose.public.yml ps
# Expect: only caddy maps 0.0.0.0:80 / :443
```

If a service shows `0.0.0.0:5000` (or any app port), stop and fix the overlay — gateway must stay internal.

## Secrets

- [x] Generator: `deploy/scripts/fill-public-prod-env.ps1` (gitignored `docker/.env.public.prod`)
- [ ] On **deploy host**: confirm `JWT_SECRET` ≥32, not `ChangeMe*`, not example placeholder
- [ ] On **deploy host**: `INTERNAL_API_KEY` ≥32, **not** `element-internal-dev-key`
- [ ] Postgres / Rabbit passwords unique (script generates; copy file to host securely)
- [ ] `present-public.ps1 -Server` passes (rejects weak secrets)

Prod process kill on weak `INTERNAL_API_KEY`: order-service (`NODE_ENV=production`), .NET services (`ValidateProductionConfiguration`), wallet-service (`ProductionSecretsGuard`). See [ops/INTERNAL-API-KEY.md](./ops/INTERNAL-API-KEY.md).

## Captcha / SMTP / DNS

- [ ] Turnstile: [ops/TURNSTILE.md](./ops/TURNSTILE.md) — empty = off (OK for beta)
- [x] SMTP: [ops/SMTP.md](./ops/SMTP.md) — e-postasız beta (leave empty)
- [ ] DNS/TLS: [ops/DNS-TLS.md](./ops/DNS-TLS.md) — still **NXDOMAIN** until Hostinger A record + deploy host IP

## Smoke after DNS

```bash
curl.exe -sI https://elements-api.ahmetfuzunkaya.com/ | findstr /I "HTTP"
curl.exe -sI https://elements-api.ahmetfuzunkaya.com/api/v2/elements/fe | findstr /I "HTTP"
# Expect 200; /metrics and /health-ui may 404 (intentional)
```
