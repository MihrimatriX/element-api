# Arayüz (`web-app`)

Ekranda gördüğün ElementAPI. Periyodik tablo, kayıt, laboratuvar, defter; ayrı bir köşede sanal mağaza.

> Ürün budur. Diğer servisler buna veri taşır. Tek başına Vite, çalışan bir API’ye (veya paketteki JSON’a) bağlanır.

| | |
|--|--|
| **Geliştirme** | http://127.0.0.1:5173 |
| **Docker web** | http://localhost:6241 (`WEB_HOST_PORT`) |
| **Teknoloji** | React 19, TypeScript, Vite, Tailwind 4, Radix (shadcn kalıbı), framer-motion, lucide-react |
| **Komşular** | gateway `:5000` (hesap, cüzdan, sipariş) · science `:5080` (Vite’de `/api/v2` proxy) |
| **İçi** | [sistem kılavuzu: web-app](../docs/kilavuz/web-app.md) — rotalar, tasarım sistemi, dosya dosya kod haritası |

---

## Bu kutu ne yapar?

- Tabloyu çizer (karo rengi element ailesi). Kayıt verisi önce paketteki JSON’dan gelir; API yanıt verince onun üzerine yazılır.
- Laboratuvar: paletten tezgâha tıkla, klavyeyle veya sürükleyerek ekle, **Dene** — isabet deftere yazılır. Kurallar tarayıcıda (`services/lab.ts`, `services/chemistry.ts`). Cüzdana dokunmaz.
- Formülü kur, Element dedektifi, 6 rota, defter. Misafir kaydı tarayıcıda; girişliyse identity ile birleşir.
- `/docs` bilimsel API başvurusu ve canlı deneme. Vite’de `/api/v2` → science `:5080` (gateway şart değil).
- `/kilavuz` sistem kılavuzu: `docs/kilavuz/*.md` sayfalarını `scripts/write-guide.mjs` `src/data/guide.json` dosyasına çevirir (git’e girmez; `npm run dev`, `build` ve `test` öncesi kendiliğinden yeniden üretilir).
- `/market` `/shop` `/account` kâğıt KREDI; fiyatlar anketle güncellenir. Cüzdan uçları gateway → **wallet**.

Statik SPA. Docker imajında nginx: bilinmeyen her yol `index.html`, ayrıca `/health` ve `/info`.

## Ne yapmaz?

Gerçek ödeme. Öğretmen notu. 3D molekül motoru. Eksik elementi uydurma fotoğrafla doldurma. Backend saga’sı çalıştırma — o order/wallet/inventory’nin işi.

## Nasıl açılır?

**Günlük (tercih):** gateway veya science zaten ayaktayken tüm web imajını derleme.

```powershell
npm --prefix web-app ci
npm --prefix web-app run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

**Tam sunum:** `./deploy/scripts/present-platform.ps1` → `:6241` (web imajı derleme anındaki API adresini taşır; değişince yeniden derle).

**Yalnız atlas:** `present-local.ps1` → science imajının içindeki aynı arayüz, hesaplar kapalı.

## Testler

`web-app` içinden:

| Komut | Ne sınar | Gereken |
|-------|----------|---------|
| `npm test` | Birim testleri (`tests/*.test.mjs`, Node test koşucusu) | — |
| `npm run lint` | ESLint | — |
| `npm run build` | Tür denetimi + üretim derlemesi | — |
| `npm run test:e2e` | `e2e/`: tablo, kayıt, laboratuvar, kılavuz, hesaplar kapalı ekranlar (masaüstü + 390 px) | science-service (`dotnet run`) ve Vite’ı kendisi açar |
| `npm run test:e2e:auth` | `e2e-auth/`: kayıt, giriş, çıkış; identity API’si tarayıcıda taklit edilir | Vite’ı `:5174`’te kendisi açar |
| `npm run test:e2e:live` | `e2e-live/`: kayıt → hoş geldin Kredisi → 1 g Au al → sipariş teslim → sat | Tam Docker platformu (`WEB_BASE`, varsayılan http://localhost:6241) |

Playwright ilk kullanımdan önce bir kez: `npx playwright install chromium`.

## Önemli adresler

| Yol | Ne |
|-----|----|
| `/`, `/periodic` | açılış, tablo |
| `/element/:sembol`, `/compound/:slug`, `/compounds` | kayıtlar |
| `/lab`, `/lab/formula`, `/lab/detective` | laboratuvar ve oyunlar |
| `/collection` | defter, rotalar |
| `/nasil`, `/sozluk` | el kitabı, sözlük |
| `/developers`, `/docs`, `/data` | API ve veri kapsamı |
| `/kilavuz`, `/kilavuz/:bölüm` | sistem kılavuzu |
| `/market`, `/shop`, `/account`, `/demo` | sanal ticaret |
| `/_ui` | tasarım sistemi vitrini (yalnız `npm run dev`) |
| `/stack`, `/values`, `/trading` | eski adresler; `/hakkinda`, `/market`, `/shop`’a yönlenir |

Tam liste ve her sayfanın davranışı: [kılavuz → Rotalar](../docs/kilavuz/web-app.md#rotalar).

Tasarım: "Mineral" sistemi. Jetonlar `src/styles.css`, bileşenler `src/components/ui/`, kabuk `src/components/ProductShell.tsx` + `src/components/shell/`. Kurallar: [design-system.md](../docs/memory-bank/design-system.md) · [senaryolar](../docs/PRODUCT-SCENARIOS.md).

## Ortam

Hepsi derleme anında okunur (`import.meta.env`); değişince yeniden derle.

| Değişken | Ne işe yarar |
|----------|----------------|
| `VITE_API_BASE_URL` | Tarayıcının v1 kapısı (varsayılan `http://localhost:5000/api/v1`) |
| `VITE_SCIENCE_API_BASE_URL` | v2 bilim API’si; boşsa dev’de `/api/v2` (Vite proxy), derlemede gateway kökü |
| `VITE_ACCOUNTS_ENABLED` | `false` ise hesap ve ticaret ekranları kapalı |
| `VITE_PUBLIC_SITE_URL` | Canonical, OG, sitemap |
| `VITE_CAPTCHA_SITE_KEY` | Turnstile site anahtarı; boşsa captcha kapalı |

Konteyner açılışında `PUBLIC_SITE_URL`, `index.html`, `robots.txt` ve `sitemap.xml` içindeki `__SITE_URL__` yerini doldurur.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| `/docs` Failed to fetch (dev) | science `:5080` kapalı; Vite proxy oraya gider |
| Docker sitede eski API adresi | imaja `VITE_API_BASE_URL` derleme anında gömülür; nginx `/api` sunmaz |
| `/kilavuz` boş veya derleme `guide.json` hatası | `docs/kilavuz/` sayfası kalıba uymuyor; `node scripts/write-guide.mjs` satır numarasını yazar |
| Cüzdan 502 | wallet `:5005` veya gateway `me` rotası |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
