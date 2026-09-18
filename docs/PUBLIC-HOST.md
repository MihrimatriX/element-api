# Public host — elements-api.ahmetfuzunkaya.com

Compose has no TLS. Bind only loopback (`docker-compose.public.yml`: web `127.0.0.1:3000`, gateway `127.0.0.1:5000`). Caddy on the host terminates HTTPS.

Web nginx does **not** proxy `/api`. Browser calls `https://elements-api.ahmetfuzunkaya.com/api/v1` (baked at image build). Caddy splits `/` → `:3000` and `/api*` + `/hub*` → `:5000`.

## 1. Env

```bash
cp docker/.env.public.example docker/.env
```

Replace every `replace-with-…` placeholder. `JWT_SECRET` and `INTERNAL_API_KEY` must be ≥32 characters, must not contain `ChangeMe`, and must not be `element-internal-dev-key`. `VITE_*` is baked into the web image — change them only if you will rebuild.

## 2. Compose

```bash
docker compose --env-file docker/.env -f docker-compose.yml -f docker-compose.public.yml up -d --build
```

Do not publish `:443` from Compose. Do not bind `0.0.0.0:443` in Compose.

## 3. Caddy

Point DNS at the machine. Copy `deploy/Caddyfile.elements-api.example` (or `caddy run --config` that file). Caddy sets `X-Forwarded-*` on `reverse_proxy` by default. `/api/v2` uses the same gateway as `/api/v1`.

Stop: `docker compose --env-file docker/.env -f docker-compose.yml -f docker-compose.public.yml down` (volumes kept unless `-v`).
