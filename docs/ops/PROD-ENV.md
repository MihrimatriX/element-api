# Prod env — fill once on the server

Single page for turning example env into a real public stack. Do **not** commit the filled file.

## 1. Copy / generate (this machine)

```powershell
# Local prod smoke (:8082) with fresh JWT / INTERNAL_API_KEY / DB / Rabbit secrets:
pwsh -NoProfile -File ./deploy/scripts/fill-public-prod-env.ps1

# Real host template (CADDY_SITE + 80/443 + https origins) — still needs DNS:
pwsh -NoProfile -File ./deploy/scripts/fill-public-prod-env.ps1 -ServerTemplate -Force
```

Manual equivalent:

```powershell
cp docker/.env.public.prod.example docker/.env.public.prod
```

File is gitignored (`.env.*` except `*.example`).

## Status (2026-09-26, this workstation)

| Item | Status |
|------|--------|
| `docker/.env.public.prod` | Create via `fill-public-prod-env.ps1` (gitignored) |
| JWT / INTERNAL_API_KEY / Postgres / Rabbit | Generated (≥32 hex) by script |
| SMTP_* | **Empty** — e-postasız beta (matches product decision) |
| Turnstile | **Empty** — paste when Cloudflare widget exists |
| Real-host `CADDY_SITE`/80/443 | Only if you used `-ServerTemplate`; DNS still operator |

## 2. Generate secrets by hand (host without the script)

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # INTERNAL_API_KEY
openssl rand -hex 32   # POSTGRES_PASSWORD
openssl rand -hex 32   # RABBITMQ_DEFAULT_PASS
```

On Windows without openssl, the fill script uses `RandomNumberGenerator`.

Rules: ≥32 chars; no `ChangeMe`; not `element-internal-dev-key`.

## 3. Set public identity (real server)

```bash
ELEMENT_ENV=prod
CADDY_SITE=elements-api.ahmetfuzunkaya.com
CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443
PUBLIC_WEB_ORIGIN=https://elements-api.ahmetfuzunkaya.com
VITE_PUBLIC_SITE_URL=https://elements-api.ahmetfuzunkaya.com
PUBLIC_API_BASE=https://elements-api.ahmetfuzunkaya.com
VITE_API_BASE_URL=/api/v1
ASPNETCORE_ENVIRONMENT=Production
NODE_ENV=production
TRUSTED_PROXY_CIDRS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
WALLET_WELCOME_GRANT=1000
```

Paste the openssl / script values into `JWT_SECRET`, `INTERNAL_API_KEY`, DB, and Rabbit fields.

## 4. Optional toggles

| Feature | Keys | Default beta |
|---------|------|--------------|
| Captcha | `CAPTCHA_SECRET_KEY` + `VITE_CAPTCHA_SITE_KEY` | empty = off |
| SMTP / reset | `SMTP_*` | empty = e-postasız |

## 5. Start

```powershell
# Local smoke:
./deploy/scripts/present-public.ps1 -Environment Prod

# Real server (after DNS + -ServerTemplate env):
./deploy/scripts/present-public.ps1 -Server
```

Script throws if site/ports/secrets still look like placeholders.

## 6. Verify

See [DEPLOY-CHECKLIST.md](../DEPLOY-CHECKLIST.md) and [DNS-TLS.md](./DNS-TLS.md). Rebuild web after any `VITE_*` change.
