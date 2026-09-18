# Public host — elements-api.ahmetfuzunkaya.com

Compose has no TLS. Bind only loopback (`docker-compose.public.yml`: web `127.0.0.1:3000`, gateway `127.0.0.1:5000`). Caddy on the host terminates HTTPS.

Browser and API share one origin. Prefer relative `VITE_API_BASE_URL=/api/v1` (baked at image build). Caddy splits traffic; web nginx does **not** proxy `/api`.

## Path map

| Public path | Target | Notes |
|---|---|---|
| `/`, `/lab`, `/element/*`, `/compound/*`, … | web `:3000` | SPA `try_files` → `index.html` |
| `/media/atlas/*`, `/assets/*`, `og.png` | web `:3000` | Static; science JSON uses root-relative `/media/…` |
| `/api/v1/**` | gateway `:5000` | Auth, market, orders, shipments track |
| `/api/v2/elements/**`, `/api/v2/compounds/**` | gateway `:5000` | Public science CORS |
| `/hub/notifications` | gateway → notification | SignalR / WebSocket |
| `/swagger/**` | gateway → catalog | OpenAPI UI (product docs stay at `/docs`) |
| `/health` (HTML host) | web nginx | Gateway `/health` stays on loopback `:5000` only |
| `/metrics`, `/health-ui` | — | Gone; expect 404 |

Internal only (no public port in overlay): postgres, redis, rabbitmq, identity, catalog, compound, order, payment, shipment, notification.

## 1. Env

```bash
cp docker/.env.public.example docker/.env
```

Replace every `replace-with-…` placeholder. `JWT_SECRET` and `INTERNAL_API_KEY` must be ≥32 characters, must not contain `ChangeMe`, and must not be `element-internal-dev-key`. Rebuild web-app after changing any `VITE_*`.

## 2. Compose

```bash
docker compose --env-file docker/.env -f docker-compose.yml -f docker-compose.public.yml up -d --build
```

Do not publish `:443` from Compose. Do not bind `0.0.0.0:443` in Compose.

## 3. Caddy + DNS

1. DNS A/AAAA for `elements-api.ahmetfuzunkaya.com` → the server.
2. Install Caddy on the host; copy/run `deploy/Caddyfile.elements-api.example`.
3. Caddy obtains TLS (Let's Encrypt) and sets `X-Forwarded-*` on `reverse_proxy` by default. Gateway rate limiting reads the first `X-Forwarded-For` hop only when the peer is loopback.

Stop: `docker compose --env-file docker/.env -f docker-compose.yml -f docker-compose.public.yml down` (volumes kept unless `-v`).

## Verify

```bash
curl -sI https://elements-api.ahmetfuzunkaya.com/ | head -n1
curl -s https://elements-api.ahmetfuzunkaya.com/api/v2/elements/fe | head -c 200
curl -sI https://elements-api.ahmetfuzunkaya.com/lab | head -n5
# Local without DNS: compose + curl http://127.0.0.1:3000/ and http://127.0.0.1:5000/api/v2/elements/fe
```

Auth JWT stays in `localStorage` (same origin). No cookie domain config. CORS: same-origin SPA; `PUBLIC_WEB_ORIGIN` still registers the public origin for SignalR / credentialed edge cases and recovery email links.
