# Deploy checklist — public / prod

Check these before you point DNS at a host. Full domain/TLS walkthrough: [PUBLIC-HOST.md](./PUBLIC-HOST.md). Env fill procedure: [ops/PROD-ENV.md](./ops/PROD-ENV.md).

## Ports (must hold)

Public overlay (`docker-compose.public.yml`) sets `ports: !override []` on every app and infra service. Only Caddy publishes host ports:

| Host | Service |
|------|---------|
| `CADDY_HTTP_PORT` (prod: 80) | Caddy, proxying to web + gateway |
| `CADDY_HTTPS_PORT` (prod: 443 + UDP) | Caddy TLS |

Closed on the host (do not re-publish): postgres, redis, rabbitmq, identity, catalog, compound, order, wallet, inventory, shipment, notification, and also gateway and web-app.

Verify after `present-public.ps1 -Server`:

```powershell
docker compose -p element-prod --env-file docker/.env.public.prod `
  -f docker-compose.yml -f docker-compose.public.yml ps
# Expect: only caddy maps 0.0.0.0:80 / :443
```

If a service shows `0.0.0.0:5000` (or any app port), stop and fix the overlay. The gateway must stay internal.

## Secrets

- [x] Generator: `deploy/scripts/fill-public-prod-env.ps1` (gitignored `docker/.env.public.prod`)
- [ ] On the deploy host: confirm `JWT_SECRET` is ≥32, not `ChangeMe*` and not the example placeholder
- [ ] On the deploy host: confirm `INTERNAL_API_KEY` is ≥32 and not `element-internal-dev-key`
- [ ] Postgres / Rabbit passwords are unique (the script generates them; copy the file to the host securely)
- [ ] `present-public.ps1 -Server` passes (rejects weak secrets)

These processes exit in prod when `INTERNAL_API_KEY` is weak: order-service (`NODE_ENV=production`), .NET services (`ValidateProductionConfiguration`), wallet-service (`ProductionSecretsGuard`). See [ops/INTERNAL-API-KEY.md](./ops/INTERNAL-API-KEY.md).

## Captcha / SMTP / DNS

- [ ] Turnstile: [ops/TURNSTILE.md](./ops/TURNSTILE.md). Empty means off (OK for beta)
- [x] SMTP: [ops/SMTP.md](./ops/SMTP.md). E-postasız beta (leave empty)
- [ ] DNS/TLS: [ops/DNS-TLS.md](./ops/DNS-TLS.md). Still NXDOMAIN until the Hostinger A record points at the deploy host IP

## Smoke after DNS

```bash
curl.exe -sI https://elements-api.ahmetfuzunkaya.com/ | findstr /I "HTTP"
curl.exe -sI https://elements-api.ahmetfuzunkaya.com/api/v2/elements/fe | findstr /I "HTTP"
# Expect 200; /metrics and /health-ui may 404 (intentional)
```
