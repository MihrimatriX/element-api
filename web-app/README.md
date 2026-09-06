# web-app

ElementAPI arayüzü — React 19 + Vite + TypeScript + nginx.

| | |
|--|--|
| **Port** | `3000` (Docker) · `5173` (dev) |
| **Health** | `GET /health` |
| **Info** | `GET /info` |

---

## Sorumluluklar

- Periyodik tablo ve bileşik keşfi, bilimsel ayrıntı, laboratuvar (`/lab`)
- Piyasa masası (`/market`), mağaza (`/shop`), hesap, API dokümantasyonu
- Kâğıt kredi cüzdan, gram sepet, SignalR fiyat (login gerekmez)

Statik SPA — tüm veri gateway API'den gelir.

---

## Endpoint'ler

| Path | Açıklama |
|------|----------|
| `/*` | React SPA |
| `/health` | nginx health probe |
| `/info` | Statik servis metadata |

---

## Bağımlılıklar

| Servis | Adres |
|--------|-------|
| gateway-service | `VITE_API_BASE_URL` → `http://localhost:5000/api/v1` |
| SignalR | `http://localhost:5000/hub/notifications` |

---

## Çalıştırma

```bash
# Geliştirme (tercih)
npm ci
npm run dev    # http://localhost:5173

# Docker web (gateway ayakta olmalı)
cd web-app && docker compose up -d --build
```

Test: `npm test` (laboratuvar keşif mantığı).

Build arg (Docker) — subdomain / HTTPS için public origin yaz, sonra rebuild:

```yaml
VITE_API_BASE_URL: https://api.example.com/api/v1
VITE_PUBLIC_SITE_URL: https://app.example.com
```

Runtime (`PUBLIC_SITE_URL`): `robots.txt` ve `sitemap.xml` içindeki `__SITE_URL__` yerini doldurur.

OG görseli: `/og.png` (1200×630). Favicon: `/favicon.svg`.

Ayrıntı: kök README **Public / subdomain**.

---

[← Ana README](../README.md)
