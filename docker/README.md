# Docker — env ve init

Burada **compose dosyası yok** (onlar repo kökünde). Bu klasör sırlar, örnek env’ler, Postgres init ve özel Postgres Dockerfile’ı tutar.

> Çalıştırma script’leri: [deploy/README.md](../deploy/README.md). Public host: [PUBLIC-HOST.md](../docs/PUBLIC-HOST.md).

---

## Bu klasörde ne var?

| Dosya / klasör | Ne |
|----------------|----|
| `.env.example` | Yerel tam platform şablonu → kopyala: `docker/.env` |
| `.env` | Yerel sırlar (**commit etme**; gitignore’da) |
| `.env.public.example` | Eski/tek dosyalık public şablon (prod-local’e yakın) |
| `.env.public.{dev,test,prod}.example` | Üç ortamlı public şablonlar |
| `.env.public.{dev,test,prod}` | Üretilmiş public env’ler (gitignore) |
| `Dockerfile.postgres` | Init script gömülü Postgres imajı |
| `init.sql` / `init-scripts/` | DB oluşturma (identity, market, order, wallet, inventory, …) |

Compose’lar kökte:

| Dosya | Ne |
|-------|----|
| `docker-compose.yml` | Tam platform (web + tüm servisler + Postgres/Redis/Rabbit) |
| `docker-compose.science.yml` | Tek science imajı `:5080` |
| `docker-compose.public.yml` | Caddy overlay; host portlarını kapatır |

---

## İlk kurulum (yerel)

```powershell
# Repo kökünden
Copy-Item docker/.env.example docker/.env   # zaten varsa dokunma
./deploy/scripts/present-platform.ps1
```

Eşdeğer:

```powershell
docker compose --env-file docker/.env up -d --build
```

`present-platform.ps1` `.env` yoksa örneği kendisi kopyalar.

---

## Önemli değişkenler (yerel `.env`)

| Değişken | Ne işe yarar |
|----------|----------------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Tüm servis DB’leri |
| `POSTGRES_HOST_PORT` | Host’ta Postgres (5432 doluysa `5434`) |
| `JWT_SECRET` | Identity token imzası |
| `INTERNAL_API_KEY` | Gateway ↔ identity iç uçlar; notification webhook listesi |
| `PUBLIC_WEB_ORIGIN` | CORS / mail linkleri |
| `VITE_API_BASE_URL` | Web imajına bake edilen API kökü |
| `VITE_PUBLIC_SITE_URL` | Canonical / OG / sitemap |
| `VITE_CAPTCHA_SITE_KEY` | Turnstile site key (bake); secret → `CAPTCHA_SECRET_KEY` |
| `PUBLIC_API_BASE` | Catalog HATEOAS / swagger link kökü |
| `RABBITMQ_DEFAULT_USER` / `_PASS` | Broker |
| `SMTP_*` | Boşsa şifre kurtarma **kapalı** (bilinçli) |
| `CAPTCHA_SECRET_KEY` | Boşsa captcha **kapalı**; doluysa register/login zorunlu |

Web veya `VITE_*` değişince **web-app imajını yeniden derle**; bake edilmiş değerler runtime’da değişmez.

---

## Public env

Üç ortam yan yana (yerel HTTP):

```powershell
Copy-Item docker/.env.public.dev.example docker/.env.public.dev
./deploy/scripts/present-public.ps1 -Environment Dev
# -All → Dev :8080, Test :8081, Prod-local :8082
```

Ortam dosyasında dikkat:

- `CADDY_SITE`, `CADDY_HTTP_PORT` / HTTPS
- `VITE_API_BASE_URL=/api/v1` (aynı origin)
- `ELEMENT_ENV`, `ASPNETCORE_ENVIRONMENT`, `NODE_ENV`
- `TRUSTED_PROXY_CIDRS` (public örneklerde Docker RFC1918; gateway ClientIp)
- Gerçek sırları `replace-with-...` yerlerine koy (`openssl rand -hex 32`); örnekleri commit’le, gerçek `.env.public.*`’ı etme
- `SMTP_*` boş = e-postasız beta (kurtarma kapalı)
- `CAPTCHA_SECRET_KEY` / `VITE_CAPTCHA_SITE_KEY` boş = captcha kapalı; prod’da Turnstile için doldur + web rebuild ([PUBLIC-HOST.md](../docs/PUBLIC-HOST.md))

Sunucu (gerçek domain + 80/443): `present-public.ps1 -Server` — `CADDY_SITE` / 80/443 / sırlar eksikse script durur. Adımlar: [PUBLIC-HOST.md](../docs/PUBLIC-HOST.md).

---

## Portlar (yerel compose)

| Host port | Servis |
|-----------|--------|
| 3000 | web-app |
| 5000 | gateway |
| 5001 | identity |
| 5002 | catalog |
| 5003 | order |
| 5004 | shipment |
| 5005 | wallet (Java) |
| 5006 | notification |
| 5007 | compound |
| 5008 | inventory (Java) |
| 5432* | Postgres (`POSTGRES_HOST_PORT`) |
| 6380 | Redis (konteyner içi 6379) |
| 5672 / 15672 | RabbitMQ / yönetim |

\* Host’ta çakışma varsa `.env` içinde portu kaydır.

Bağımsız atlas: **5080** (science compose; bu tablodaki DB/broker yok).

---

## Init / DB

Postgres ayağa kalkınca `init.sql` veritabanlarını oluşturur (`element_identity_db`, `element_market_db`, `element_order_db`, `element_wallet_db`, `element_inventory_db`, `element_shipment_db`, `element_compound_db`, …). Servisler kendi migrasyonunu uygular.

Volume silmeden (`down` without `-v`) veriler kalır. Sıfırdan: `docker compose --env-file docker/.env down -v`.

---

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| “password authentication failed” | `.env` ile çalışan volume eski şifre; `down -v` veya şifreyi eski haline getir |
| Redis bağlantı hatası | Host’ta `localhost:6379` yanlış; compose **6380** yayınlar |
| Web eski API adresi | `VITE_API_BASE_URL` değişti, imaj rebuild edilmedi |
| Public’te port çakışması | `-All` iken 8080/8081/8082 dolu; `stop-local.ps1 -Public` |

[← Ana README](../README.md) · [Deploy](../deploy/README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
