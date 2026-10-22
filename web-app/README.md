# Arayüz (`web-app`)

web-app, ElementAPI’nin kullanıcı arayüzüdür: periyodik tablo, element kayıtları, laboratuvar ve defter. Sanal mağaza ayrı bir bölümde durur.

Kullanıcının gördüğü ürün budur; diğer servisler buna veri sağlar. Vite ile tek başına açıldığında çalışan bir API’ye ya da paketteki JSON’a bağlanır.

| | |
|--|--|
| **Geliştirme** | http://127.0.0.1:5173 |
| **Docker web** | http://localhost:6241 (`WEB_HOST_PORT`) |
| **Teknoloji** | React 19, TypeScript, Vite, Tailwind 4, Radix (shadcn kalıbı), framer-motion, lucide-react |
| **Komşular** | gateway `:5000` (hesap, cüzdan, sipariş) · science `:5080` (Vite’de `/api/v2` proxy) |
| **İçi** | [sistem kılavuzu: web-app](../docs/kilavuz/web-app.md): rotalar, tasarım sistemi, dosya dosya kod haritası |

## Bu kutu ne yapar?

- Periyodik tabloyu çizer (karo rengi element ailesini gösterir). Kayıt verisi önce paketteki JSON’dan gelir; API yanıt verince onun üzerine yazılır.
- Laboratuvar: öğeyi paletten tezgâha tıklayarak, klavyeyle veya sürükleyerek ekle, sonra Dene’ye bas; isabetler deftere yazılır. Kurallar tarayıcıda çalışır (`services/lab.ts`, `services/chemistry.ts`). Cüzdana dokunmaz.
- Formülü kur, Element dedektifi, 6 öğrenme rotası ve defter. Misafir kaydı tarayıcıda tutulur; kullanıcı giriş yapmışsa identity’deki kayıtla birleşir.
- `/docs`: bilimsel API başvurusu ve canlı deneme. Vite’de `/api/v2` istekleri science `:5080`’e gider; gateway gerekmez.
- `/kilavuz`: sistem kılavuzu. `scripts/write-guide.mjs`, `docs/kilavuz/*.md` sayfalarını `src/data/guide.json` dosyasına çevirir. Bu dosya git’e girmez; `npm run dev`, `build` ve `test` öncesinde kendiliğinden yeniden üretilir.
- `/market`, `/shop`, `/account`: kâğıt KREDI ile sanal ticaret; fiyatlar anketle güncellenir. Cüzdan istekleri gateway üzerinden wallet’a gider.

Uygulama statik bir SPA’dır. Docker imajındaki nginx bilinmeyen her yol için `index.html` döner, ayrıca `/health` ve `/info` sunar.

## Ne yapmaz?

Gerçek ödeme almaz, öğretmen notu tutmaz, 3D molekül motoru içermez. Fotoğrafı eksik elementleri uydurma görselle doldurmaz. Backend saga’sını çalıştırmaz; o iş order, wallet ve inventory’nin.

## Nasıl açılır?

Günlük geliştirmede (tercih edilen yol) gateway veya science zaten ayaktaysa web imajını derleme, Vite’ı host’ta aç:

```powershell
npm --prefix web-app ci
npm --prefix web-app run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Tam sunum için `./deploy/scripts/present-platform.ps1`; arayüz `:6241`’de açılır. Web imajı derleme anındaki API adresini taşır, adres değişince imajı yeniden derle.

Yalnız atlas için `present-local.ps1`; aynı arayüz science imajının içinden, hesaplar kapalı olarak sunulur.

## Testler

Komutlar `web-app` klasöründe çalıştırılır:

| Komut | Ne sınar | Gereken |
|-------|----------|---------|
| `npm test` | Birim testleri (`tests/*.test.mjs`, Node test koşucusu) | — |
| `npm run lint` | ESLint | — |
| `npm run build` | Tür denetimi + üretim derlemesi | — |
| `npm run test:e2e` | `e2e/`: tablo, kayıt, laboratuvar, kılavuz, hesaplar kapalıyken ekranlar (masaüstü + 390 px) | science-service (`dotnet run`) ve Vite’ı kendisi açar |
| `npm run test:e2e:auth` | `e2e-auth/`: kayıt, giriş, çıkış; identity API’si tarayıcıda taklit edilir | Vite’ı `:5174`’te kendisi açar |
| `npm run test:e2e:live` | `e2e-live/`: kayıt, hoş geldin Kredisi, 1 g Au alma, siparişin teslimi, satış | Tam Docker platformu (`WEB_BASE`, varsayılan http://localhost:6241) |

Playwright ilk kullanımdan önce bir kez `npx playwright install chromium` ister.

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

Tam liste ve her sayfanın davranışı: [kılavuzdaki Rotalar bölümü](../docs/kilavuz/web-app.md#rotalar).

Arayüz "Mineral" tasarım sistemini kullanır. Jetonlar `src/styles.css`, bileşenler `src/components/ui/`, kabuk `src/components/ProductShell.tsx` + `src/components/shell/` içinde. Kurallar: [design-system.md](../docs/memory-bank/design-system.md) · [senaryolar](../docs/PRODUCT-SCENARIOS.md).

## Ortam

Hepsi derleme anında okunur (`import.meta.env`); değişince yeniden derle.

| Değişken | Ne işe yarar |
|----------|----------------|
| `VITE_API_BASE_URL` | Tarayıcının v1 kapısı (varsayılan `http://localhost:5000/api/v1`) |
| `VITE_SCIENCE_API_BASE_URL` | v2 bilim API’si; boşsa dev’de `/api/v2` (Vite proxy), derlemede gateway kökü |
| `VITE_ACCOUNTS_ENABLED` | `false` ise hesap ve ticaret ekranları kapalı |
| `VITE_PUBLIC_SITE_URL` | Canonical, OG, sitemap |
| `VITE_CAPTCHA_SITE_KEY` | Turnstile site anahtarı; boşsa captcha kapalı |

Konteyner açılırken `PUBLIC_SITE_URL`, `index.html`, `robots.txt` ve `sitemap.xml` içindeki `__SITE_URL__` yer tutucusunu doldurur.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| `/docs` Failed to fetch (dev) | science `:5080` kapalı; Vite proxy oraya gider |
| Docker sitede eski API adresi | `VITE_API_BASE_URL` imaja derleme anında gömülür; nginx `/api` sunmaz |
| `/kilavuz` boş veya derlemede `guide.json` hatası | `docs/kilavuz/` sayfası beklenen kalıba uymuyor; `node scripts/write-guide.mjs` hatalı satırın numarasını yazar |
| Cüzdan 502 | wallet `:5005` veya gateway’deki `me` rotası |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
