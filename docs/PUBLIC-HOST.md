# Public host — elements-api.ahmetfuzunkaya.com

One compose path brings up infra + services + web-app + **Caddy**. Browser and API share one origin (`VITE_API_BASE_URL=/api/v1`). Caddy splits traffic; web nginx does **not** proxy `/api`.

## Environments (dev / test / prod)

| Env | Local URL | Compose project | ASP.NET / Node | Env file |
|---|---|---|---|---|
| Dev | http://localhost:8080 | `element-dev` | Development / development | `docker/.env.public.dev` |
| Test | http://localhost:8081 | `element-test` | Staging / production | `docker/.env.public.test` |
| Prod (local smoke) | http://localhost:8082 | `element-prod` | Production / production | `docker/.env.public.prod` |
| Prod (real server) | https://elements-api.ahmetfuzunkaya.com | `element-prod` | Production / production | same file — set `CADDY_SITE` + ports `80`/`443` + `https://` origins |

Side-by-side local stacks use different `ELEMENT_ENV` container name prefixes and host ports so they do not collide. Real Let's Encrypt needs DNS A/AAAA on the server and `CADDY_SITE=elements-api.ahmetfuzunkaya.com`.

## Path map

| Public path | Target | Notes |
|---|---|---|
| `/`, `/lab`, `/element/*`, `/compound/*`, … | web-app | SPA `try_files` → `index.html` |
| `/media/atlas/*`, `/assets/*`, `og.png` | web-app | Static; science JSON uses root-relative `/media/…` |
| `/api/v1/**` | gateway | Auth, market, orders, shipments track |
| `/api/v2/elements/**`, `/api/v2/compounds/**` | gateway | Public science CORS |
| `/swagger/**` | gateway → catalog | OpenAPI UI (product docs stay at `/docs`) |
| `/health` (HTML host) | web nginx | Gateway `/health` is internal only |
| `/metrics`, `/health-ui` | — | Gone; expect 404 |

Internal only (no host ports — public overlay `ports: !override []`): postgres, redis, rabbitmq, identity, catalog, compound, order, wallet, inventory, shipment, notification, gateway, web-app. **Do not** publish those on a public server. Public ports: Caddy `CADDY_HTTP_PORT` / `CADDY_HTTPS_PORT` only.

Abuse edge: Caddy security headers (nosniff, frame deny, referrer, permissions, **production CSP** for SPA + Turnstile + Google Fonts) + `request_body` 1MB. Stock Caddy has **no** `rate_limit` plugin — gateway enforces register **5/min**, other auth POST **15/min**, else **60/10s**. Public wallet welcome grant defaults to **1000** (`WALLET_WELCOME_GRANT`).

### Captcha (Cloudflare Turnstile)

Env-gated. Empty keys → captcha **off** (local/dev still works).

| Key | Where | Role |
|---|---|---|
| `CAPTCHA_SECRET_KEY` | identity (compose env) | Server siteverify; when set, register + login require a token |
| `VITE_CAPTCHA_SITE_KEY` | web-app **build arg** | Widget on `/login` + `/register`; rebuild web after change |

`GET /api/v1/auth/capabilities` includes `captcha: true|false`. Honest Turkish error if token missing/invalid.

Create a widget in the [Cloudflare Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile), paste both keys into `docker/.env.public.prod`, then rebuild identity + web (or full public stack).

### Optional Cloudflare proxy (real WAF)

After DNS A/AAAA points here, you can orange-cloud the hostname in Cloudflare DNS. That gives Cloudflare’s WAF/DDoS in front of Caddy. Not required for the stack to work; ACME still needs port 80 reachable (HTTP-01) or use Cloudflare Full (strict) + origin cert later. Default path here is **direct** Let’s Encrypt on Caddy.

## 1. Env

```bash
cp docker/.env.public.dev.example  docker/.env.public.dev
cp docker/.env.public.test.example docker/.env.public.test
cp docker/.env.public.prod.example docker/.env.public.prod
```

Replace every `replace-with-…` placeholder (especially Prod). Generate secrets:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # INTERNAL_API_KEY
openssl rand -hex 32   # POSTGRES_PASSWORD / RABBITMQ_DEFAULT_PASS
```

`JWT_SECRET` and `INTERNAL_API_KEY` must be ≥32 characters, must not contain `ChangeMe`, and must not be `element-internal-dev-key`. Rebuild web-app after changing any `VITE_*` (including `VITE_CAPTCHA_SITE_KEY`).

Leave `SMTP_*` empty for **e-postasız beta** (password recovery stays off; `GET /auth/capabilities` is honest). Optional Resend later: see [LOCAL-VERIFICATION.md](./LOCAL-VERIFICATION.md#resend-kararı).

Leave `CAPTCHA_SECRET_KEY` / `VITE_CAPTCHA_SITE_KEY` empty until you want Turnstile on register/login (see Captcha section above).

`TRUSTED_PROXY_CIDRS` defaults to Docker private ranges in public examples so gateway `ClientIp` / rate limit trust Caddy’s `X-Forwarded-For`. Empty falls back to the same RFC1918 heuristic in code.

### Real server Prod checklist

Do this on the host after DNS points here (do not invent another domain):

1. **DNS:** A (and AAAA if any) for `elements-api.ahmetfuzunkaya.com` → this server.
2. **Env** in `docker/.env.public.prod`:

```bash
CADDY_SITE=elements-api.ahmetfuzunkaya.com
CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443
PUBLIC_WEB_ORIGIN=https://elements-api.ahmetfuzunkaya.com
VITE_PUBLIC_SITE_URL=https://elements-api.ahmetfuzunkaya.com
PUBLIC_API_BASE=https://elements-api.ahmetfuzunkaya.com
# paste openssl rand -hex 32 values for JWT / INTERNAL_API_KEY / DB / Rabbit
```

3. **Ports:** 80/443 open to the world (firewall / cloud SG).
4. **Start:** `./deploy/scripts/present-public.ps1 -Server`  
   Script **fails clearly** if `CADDY_SITE` is missing, still `http://:80`, ports aren’t 80/443, or secrets still look like placeholders.
5. **Verify:** `curl -sI https://elements-api.ahmetfuzunkaya.com/ | head -n1`

## 2. Compose

One env:

```powershell
./deploy/scripts/present-public.ps1 -Environment Dev
# Test | Prod
```

All three local (ports 8080 / 8081 / 8082):

```powershell
./deploy/scripts/present-public.ps1 -All
```

Manual equivalent:

```bash
docker compose -p element-dev --env-file docker/.env.public.dev \
  -f docker-compose.yml -f docker-compose.public.yml up -d --build
```

Caddyfile: `deploy/Caddyfile.elements-api` (`{$CADDY_SITE}`). Compose refuses empty `CADDY_SITE`. Stop: `./deploy/scripts/stop-local.ps1 -Public` (or `-Environment Dev`).

### Optional: TLS on the host instead

If you prefer host Caddy and loopback binds, use `deploy/Caddyfile.elements-api.example` and keep web/gateway on `127.0.0.1`. Default path is in-compose Caddy.

## Verify

Local:

```bash
curl -sI http://localhost:8080/ | head -n1
curl -s http://localhost:8080/api/v2/elements/fe | head -c 200
curl -sI http://localhost:8081/ | head -n1
curl -sI http://localhost:8082/ | head -n1
```

Server:

```bash
curl -sI https://elements-api.ahmetfuzunkaya.com/ | head -n1
curl -s https://elements-api.ahmetfuzunkaya.com/api/v2/elements/fe | head -c 200
```

Matrix self-check: `node deploy/tests/public-env-matrix.test.mjs`

Auth JWT stays in `localStorage` (same origin). Gateway rate limiting trusts `X-Forwarded-For` from loopback or `TRUSTED_PROXY_CIDRS` / RFC1918 peers (in-compose Caddy).
