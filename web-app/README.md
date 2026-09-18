# Arayüz (`web-app`)

Ekranda gördüğün ElementAPI. Periyodik tablo, kayıt, laboratuvar, koleksiyon; ayrı bir köşede sanal mağaza.

> Ürün budur. Diğer servisler buna veri taşır. Tek başına Vite, çalışan bir API’ye (veya gömülü JSON’a) bağlanır.

| | |
|--|--|
| **Geliştirme** | http://127.0.0.1:5173 |
| **Docker web** | http://localhost:3000 |
| **Teknoloji** | React 19, Vite, TypeScript, Tailwind 4, shadcn/Radix |

---

## Bu kutu ne yapar?

- Tabloyu çizer (hücre rengi element ailesi). Ayrıntı: yerelde `scientific-elements.json`; canlı API gelince üzerine yazar.
- Laboratuvar: kart seç, oran tut, bilinen molekül aç. Kurallar tarayıcıda (`chemistry.ts`). Cüzdana dokunmaz.
- Formülü kur, Element dedektifi, 6 rota, koleksiyon. Misafir kayıt tarayıcıda; girişliyse identity ile birleşir.
- `/docs` bilimsel API tezgâhı. Vite’de `/api/v2` → host science `:5080` (gateway şart değil).
- `/market` `/shop` kâğıt KREDI; SignalR fiyat.

Statik SPA. Docker imajında nginx `/*` + `/health` + `/info`.

## Ne yapmaz?

Gerçek ödeme. Öğretmen notu. 3D molekül motoru. Eksik elementi uydurma fotoğrafla doldurma.

## Nasıl açılır?

**Günlük (tercih):** gateway veya science zaten ayaktayken tüm web imajını derleme.

```powershell
npm --prefix web-app ci
npm --prefix web-app run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Bu makinede Docker web yoksa ürün UI **5173**’tür; `:3000` başka uygulamaya ait olabilir.

**Tam sunum:** `./deploy/scripts/present-platform.ps1` → `:3000` (web imajı bake edilmiş API adresini taşır; değişince rebuild).

**Yalnız atlas:** `present-local.ps1` → science imajının içindeki aynı arayüz, hesap kapalı.

```powershell
npm test          # 22 birim testi
npm run build
npm run lint
npm run test:e2e           # bağımsız tarayıcı
npm run test:e2e:auth      # hesap UI
npm run test:e2e:live      # WEB_BASE, gerçek yığın
```

İlk e2e: `npx playwright install chromium`.

## Önemli adresler

| Yol | Ne |
|-----|----|
| `/`, `/periodic` | tablo |
| `/element/:sembol`, `/compound/:slug` | kayıt |
| `/lab`, `/lab/formula`, `/lab/detective` | oyunlar |
| `/collection` | defterim, rotalar |
| `/docs`, `/sozluk` | API ve dil |
| `/market`, `/shop` | sanal ticaret |
| `/stack` | eski ops → `/hakkinda` |

Kabuk: `src/components/ProductShell.tsx`. Tema: `src/design-system.css`. [Tasarım](../docs/memory-bank/design-system.md) · [senaryolar](../docs/PRODUCT-SCENARIOS.md).

## Ortam

| Değişken | Ne işe yarar |
|----------|----------------|
| `VITE_API_BASE_URL` | tarayıcının v1 kapısı (build anı) |
| `VITE_PUBLIC_SITE_URL` | canonical, OG, sitemap (build) |
| `SCIENCE_BASE_URL` | Vite’de v2 (dev’de `/api/v2` proxy) |
| `PUBLIC_SITE_URL` | konteyner start’ta sitemap `__SITE_URL__` |

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| `/docs` Failed to fetch | science `:5080` kapalı; Vite proxy oraya gider |
| Docker sitede eski API host | imaj `localhost:5000` bake; nginx `/api` yok |
| Tablo var, kayıt “yeniden dene” | eski davranış; şimdi yerel JSON yedekler |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
