# Yerel geliştirme ve doğrulama

Varsayılan: her servis kendi konteynerinde. `.cursor/rules/local-dev.mdc` geçerlidir. Tek satırlık UI/API doğrulaması için tüm imajları yeniden derleme.

## Sunumu aç

- Tam platform: `./deploy/scripts/present-platform.ps1` → http://localhost:3000
- Hazır imajlarla: `./deploy/scripts/present-platform.ps1 -NoBuild`
- Bağımsız atlas: `./deploy/scripts/present-local.ps1` → http://127.0.0.1:5080
- Durdur: `./deploy/scripts/stop-local.ps1` (volume korunur)

Eşdeğer: `docker compose --env-file docker/.env up -d --build`

## Günlük UI döngüsü

Gateway zaten ayaktaysa web için host Vite yeter: `npm --prefix web-app run dev -- --host 127.0.0.1 --port 5173 --strictPort`.

Portlar: PostgreSQL `POSTGRES_HOST_PORT` (varsayılan 5432), Redis 6380, RabbitMQ 5672/15672, gateway 5000, servisler 5001–5007, web 3000.

## Kontroller

- Ön yüz: `npm --prefix web-app run lint` / `run build` / test.
- Bağımsız tarayıcı: `npm --prefix web-app run test:e2e`.
- Mock hesap: `npm --prefix web-app run test:e2e:auth`.
- Gerçek hesap/ticaret: `npm --prefix web-app run test:e2e:live` (`WEB_BASE`; varsayılan http://localhost:3000).
- Tam doğrulama: `./deploy/scripts/test-all.ps1 -Configuration Review -Integration -Live -Browser -PaymentDocker -Recovery -WebBase http://localhost:3000`.

Atlas yenileme: `node deploy/scripts/refresh-atlas.mjs`; ağdan medya için `--fetch`. Bilimsel JSON değişince ilgili imajı yeniden derle.
