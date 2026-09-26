# Yerel geliştirme ve doğrulama

Varsayılan: her servis kendi konteynerinde. `.cursor/rules/local-dev.mdc` geçerlidir. Tek satırlık UI/API doğrulaması için tüm imajları yeniden derleme. Kutular: [servis kılavuzu](../SERVIS-KILAVUZU.md).

## Sunumu aç

- Tam platform (yerel portlar): `./deploy/scripts/present-platform.ps1` → http://localhost:3000
- Hazır imajlarla: `./deploy/scripts/present-platform.ps1 -NoBuild`
- **Public host** (dev/test/prod): `./deploy/scripts/present-public.ps1 -Environment Dev` (Test|Prod) veya `-All` (yerel :8080/:8081/:8082). Domain/TLS: [PUBLIC-HOST.md](../PUBLIC-HOST.md)
- Bağımsız atlas: `./deploy/scripts/present-local.ps1` → http://127.0.0.1:5080
- Durdur: `./deploy/scripts/stop-local.ps1` (volume korunur); public için `-Public` veya `-Environment Dev`

Eşdeğer yerel: `docker compose --env-file docker/.env up -d --build` — env ayrıntısı [docker/README.md](../../docker/README.md), script’ler [deploy/README.md](../../deploy/README.md).

Eşdeğer public (ör. Dev):

```bash
cp docker/.env.public.dev.example docker/.env.public.dev
docker compose -p element-dev --env-file docker/.env.public.dev -f docker-compose.yml -f docker-compose.public.yml up -d --build
```

## Günlük UI döngüsü

Gateway zaten ayaktaysa web için host Vite yeter: `npm --prefix web-app run dev -- --host 127.0.0.1 --port 5173 --strictPort`.

Portlar (yerel): PostgreSQL `POSTGRES_HOST_PORT` (varsayılan 5432), Redis 6380, RabbitMQ 5672/15672, gateway 5000, servisler 5001–5004 ve 5006–5007, web 3000. Public overlay’de bunlar kapalı; Caddy `CADDY_HTTP_PORT` (dev 8080 / test 8081 / prod-local 8082; sunucuda 80/443).

## Kontroller

- Kök kısayollar: `./scripts/test.ps1` · `./scripts/lint.ps1` · `./scripts/up.ps1` · `./scripts/present.ps1` ([CONTRIBUTING.md](../../CONTRIBUTING.md)).
- Ön yüz: `npm --prefix web-app run lint` / `run build` / test.
- Bağımsız tarayıcı: `npm --prefix web-app run test:e2e` (`e2e/` atlas-lab + auth smoke).
- Mock hesap: `npm --prefix web-app run test:e2e:auth`.
- Gerçek hesap/ticaret: `npm --prefix web-app run test:e2e:live` (`WEB_BASE`; varsayılan http://localhost:3000).
- Tam doğrulama: `./deploy/scripts/test-all.ps1 -Configuration Review -Integration -Live -Browser -Recovery -WebBase http://localhost:3000`.
- Jenkins path CI: [CI-JENKINS.md](../CI-JENKINS.md).

Atlas yenileme: `node deploy/scripts/refresh-atlas.mjs`; ağdan medya için `--fetch`. Bilimsel JSON değişince ilgili imajı yeniden derle.
