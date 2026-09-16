# web-app

ElementAPI arayüzü — React 19 + Vite + TypeScript + Tailwind 4 + shadcn/ui (Radix) + nginx.

| | |
|--|--|
| **Port** | `3000` (Docker web) · `5173` (dev) |
| **Health** | `GET /health` |
| **Info** | `GET /info` |

---

## Sorumluluklar

- Periyodik tablo ve bileşik keşfi, bilimsel ayrıntı, laboratuvar (`/lab`)
- Piyasa masası (`/market`), mağaza (`/shop`), hesap, API dokümantasyonu
- Kâğıt kredi cüzdan, gram sepet, SignalR fiyat (login gerekmez)
- Atlas medya: `public/media/atlas/` (fotoğraf + PubChem yapı PNG)

Statik SPA — tam platformda API gateway, bağımsız profilde bilim servisi kullanılır. Bilimsel kayıtlar `GET /api/v2/...`; piyasa/sipariş `GET /api/v1/...`.

---

## Önemli rotalar

| Path | Sayfa |
|------|-------|
| `/`, `/periodic` | Keşif / periyodik tablo |
| `/element/:symbol`, `/compound/:slug` | Bilimsel ayrıntı |
| `/compounds` | Bileşik listesi |
| `/lab` | Keşif laboratuvarı (misafir yerel; hesaplı ilerleme sunucuda) |
| `/market`, `/shop` | Piyasa · mağaza |
| `/docs` | API dokümantasyonu |
| `/hakkinda` | Hakkında |
| `/stack` | Eski ops sayfası → `/hakkinda` yönlendirmesi |

---

## Endpoint'ler (nginx / container)

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

Tercih: host Vite (tam Docker web rebuild gerekmez). Tam profil gateway `localhost:5000` kullanır; bağımsız bilim profili için SCIENCE API adresi ayarlanabilir.

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
# http://localhost:5173
```

Test: `npm test` (laboratuvar keşif mantığı). Üretim derlemesi: `npm run build`.

Docker web: kök `docker-compose.yml` içindeki `web-app` servisi (host Vite tercih edilir).

Build arg (Docker) — subdomain / HTTPS için public origin yaz, sonra rebuild:

```yaml
VITE_API_BASE_URL: https://api.example.com/api/v1
VITE_PUBLIC_SITE_URL: https://app.example.com
```

Runtime (`PUBLIC_SITE_URL`): `robots.txt` ve `sitemap.xml` içindeki `__SITE_URL__` yerini doldurur.

OG görseli: `/og.png` (1200×630). Favicon: `/favicon.svg`.

Ayrıntı: kök README **Public / subdomain**; atlas yenileme: `node deploy/scripts/refresh-atlas.mjs`.

---

[← Ana README](../README.md)

## Tasarım ve senaryolar

Ortak kabuk `src/components/ProductShell.tsx`; shadcn kaynakları `src/components/ui`; tema `src/design-system.css`. [Tasarım sözleşmesi](../docs/memory-bank/design-system.md) ve [ürün senaryoları](../docs/PRODUCT-SCENARIOS.md).
