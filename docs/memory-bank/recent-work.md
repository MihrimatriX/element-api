# Son çalışma — 18 Eylül 2026 (tek domain public host)

Kullanıcı tüm servislerin `https://elements-api.ahmetfuzunkaya.com` altında çalışmasını istedi. Commit yok.

- Envanter + mevcut Caddy/compose public overlay doğrulandı; yeni reverse-proxy yığını yok.
- `VITE_API_BASE_URL=/api/v1` (same-origin) `.env.public.example`; Caddy’ye `/swagger*` eklendi.
- Gateway rate limit: peer loopback iken ilk `X-Forwarded-For` (`ClientIp` + 3 birim test).
- [docs/PUBLIC-HOST.md](../PUBLIC-HOST.md) path tablosu; README tek-host örneği güncellendi.

---

# Son çalışma — 17 Eylül 2026 (ana sayfa ikinci tur)

Kullanıcı `/` hâlâ slop buldu; tablo-odaklı kalıp kimlik eklendi. Commit yok.

- Karşılama şeridi ("Periyodik tablo, ders kitabı değil tezgâh.") + El kitabı/Lab CTA'ları; "Günün elementi/bileşiği" (tarihten deterministik, `ponytail:` yorumlu, çevrimdışı çalışır); yapışkan filtre çubuğu; özenli boş durum. 2 dosya: `PeriodicExplorer.tsx`, `design-system.css`.
- `/periodic` aynı bileşenin yalın hali. `npm test` 24/24, `tsc` temiz, `vite build` yeşil. Tarayıcı `:5173` doğrulandı (ekran görüntüsü alındı).

---

# Son çalışma — 17 Eylül 2026

## Verify-close: de-slop + el kitabı + API kapanışı

Üç kardeş track bitti; bu dilim yalnız doğrulama + kapanış. Commit yok.

- `npm install` sonrası `npx tsc -b` temiz. Kök neden: `mergeRemote` generic kısıtı (`scienceCatalog.ts`) yalandı — fonksiyon her satır tipiyle çalışır, kısıt kalktı, okuma iç cast'e indi. `science.ts` değişmedi.
- İkincil nav'a "Geliştiriciler" (`/developers`); kalan "Koleksiyonum" metinleri "Defterim"e çevrildi (ana nav, Lab dipnotu, atlas-only ekranı + 2 e2e spec). Demo/Settings zaten çevrilmişti.
- Yeni `web-app/tests/handbook.test.mjs`: el kitabı iç bağlantılarının route karşılığı + `/developers` nav girişi + `public/openapi.json` kilidi.
- `npm test` **24/24**, `npx vite build` yeşil (chunk/signalr uyarıları eski). `og.png` mevcut (1.4MB) — planın "eksik asset" tespiti bayattı, risk değil.

---

## Atlas kabuğu: defter şeridi + Spline/GSAP/Framer

Kullanıcı admin dashboard kromunu (yan menü, sage SaaS) istemedi; sınıf posteri + 3D/animasyon istedi. Commit yok.

- **Kabuk:** sabit sidebar yok. Yapışkan üst defter şeridi (`El` + ElementAPI + hap nav: Periyodik tablo / Bileşikler / Laboratuvar / Koleksiyonum, Daha fazla, Giriş yap). Altında aile rengi 8 px şerit. Ana sahne tablo. Mobil: `Menüyü aç` Sheet.
- **Spline:** yalnız `/lab` keşif kartında (`SplineStage`, lazy). Sahne resmi Spline Next.js örneği `https://prod.spline.design/KFonZGtsoUXP-qx7/scene.splinecode` (~246KB, “design” maskot — atom değil). Ana inset’ten çıkarıldı (kimlik üzerine biniyordu). `canUseSpline`: WebGL + genişlik ≥768 + çekirdek >2 + reduced-motion kapalı; aksi halde AtlasVisual/foto/Bohr. 8s timeout + error boundary.
- **GSAP:** tablo hücre stagger; lab `.lab-result` başarı. **Framer:** `MotionConfig reducedMotion="user"`, rota `RouteStage`, Kartlar tile, önizleme dialog. Aynı elemanda iki kütüphane yok.
- **Bağımlılık:** `@splinetool/react-spline`, `@splinetool/runtime`, `gsap`, `framer-motion`.
- Tarayıcı Vite `:5173`: `/` H+Fe önizleme + Tam kayıt, Kartlar, `/lab` H→H₂O Birleştir (Spline inset), `/element/fe`. 390: `Menüyü aç`, Spline yok. `npm --prefix web-app test` **23/23**. Playwright e2e bu dilimde çalıştırılmadı (etiketler duruyor).

---

## Üç takip: kicker, ponytail kesim, public host

Kullanıcı “hepsini yapalım”: ALL-CAPS kicker öldü (cümle hali, slogan yok); 17 Eylül denetiminin **ölü** kesimleri uygulandı; `https://elements-api.ahmetfuzunkaya.com` için Caddy + `.env` taslağı. Commit/push yok. Ticaret yığını donduruldu, silinmedi. `chemistry.ts` solver’a dokunulmadı.

- **A:** `.kicker` / `.science-eyebrow` `text-transform: none`; BİRLEŞTİR → Birleştir vb. E2E `Birleştir` / `İsteği gönder` duruyor. Hesap silme onayı `HESABIMI SİL` duruyor.
- **B uygulandı:** catalog 118-satır Redis DTO cache (`CatalogCache` + GET cache); ölü `Values.tsx` / `Trading.tsx` / `ElementDetail.tsx`; `lab.ts` `unlockedElements` + `equationText`; test log 51 → gerçek sayı; PRODUCT-ROADMAP “bugün” 167/53/6 rota.
- **B atlandı:** üç element kataloğu (tablo layout string hâlâ lazım); `start-local.ps1` (smoke/payment hâlâ işaret eder — belgelendi, silinmedi); identity JSON zaten web-app kopyası; IElementRepository / Identity.Core / PublicBaseUrl / MASS tablosu / Java ödeme.
- **C:** `docker/.env.public.example`, `deploy/Caddyfile.elements-api.example`, [docs/PUBLIC-HOST.md](../PUBLIC-HOST.md). Komut: `docker compose --env-file docker/.env -f docker-compose.yml -f docker-compose.public.yml up -d --build` sonra host Caddy. Compose `:443` yok.

Tarayıcı Vite `:5173`: `/`, `/lab` (H₂O Birleştir), `/element/fe`, `/collection`, `/sozluk`, `/docs`, `/shop`; 390 `Menüyü aç`. `npm --prefix web-app test` **22/22**. Catalog `dotnet build` 0 uyarı.

---

## Servis README + kılavuz

Uç tablosu jargonu yerine günlük dil. [docs/SERVIS-KILAVUZU.md](../SERVIS-KILAVUZU.md) tüm kutuları anlatır; her servis (science dahil) kendi README’sinde “ne yapar / ne yapmaz / nasıl açılır / bozulursa”. Kök katalog .NET 10 + science `:5080`. Commit yok.

---

## Ana: hücreler dolu, sınıf posteri

Sage/beyaz SaaS slop: aile rengi 2 px şeritte kalıyordu. Hücreler `color-mix(--element-color)` doldu; hover scale; seçili çerçeve element rengi. Zemin krem kâğıt, marka H-pembe `El` kiremit, Laboratuvar mercan. Slogan/kicker yok.

Tarayıcı Vite `:5173`: tablo dolu hücre, H tık → pembe inset + dialog, Kartlar, `/lab` H kartı tezgâh, `/element/fe`, 390 Menüyü aç. `npm --prefix web-app test` **22/22**.

---

## Tam yığın + arayüz (layout, kopya değil)

Kullanıcı: tüm servisler çalışırken arayüz hâlâ kötü. Compose `up -d` (web imajı yok: :3000 Indie Valley). UI Vite `http://127.0.0.1:5173`. Gateway `:5000` Healthy, Fe 200. Host science `:5080` Fe 200. Servisler açık bırakıldı; `docker down` yok.

Görsel (ikinci tasarım sistemi yok): koyu krom kabuk; auth `auth-sheet` (kart/panel yok, yinelenen marka rayı silindi); koleksiyon 6 rota kartı sol şerit + `--lesson-tint`; sözlük 25 kart; mağaza SKU koyu formül başlığı (tablo yok, Au süzünce 3 ürün); piyasa 118 `quote-tile` + bilet (tablo yok). Ana: `Periyodik tablo` + `İlk keşfini yap` (üç slogan kartı yok).

Tarayıcı (tık): `/` CTA, Hidrojen önizleme → `/element/h`, bileşikler → `/compound/h2o`, sözlük, `/docs` İsteği gönder Fe JSON (Failed to fetch değil), `/lab` Birleştir + H tezgâh, `/lab/formula`, `/lab/detective`, koleksiyon `/ 6 rota`, giriş, mağaza, piyasa. Mobil 390: `Menüyü aç` çekmece + lab-modes kaydırılır, sayfa taşması yok. `npm --prefix web-app test` **22/22**.

---

## Ana sayfa: AI slop (koyu krom + slogan)

`/` iniş sayfasıydı: koyu krom, kicker, şiir, tezgâh daveti, API şeridi. Silindi.

- Kabuk açık (`#f4f5f1`). Marka `ElementAPI`. Nav `Periyodik tablo`.
- Tablo önde; araç çubuğunda `Laboratuvar`. Önizleme `Tam kayıt`.
- `WorkshopInvite` yok. E2E: `#main-content` Laboratuvar, `Tam kayıt`.

---

## Tam arayüz geçişi (görsel + yer)

Kullanıcı yalnız kopya değişimini yetersiz buldu; tüm yüzey elden geçti. İkinci tasarım sistemi yok; shadcn + mevcut atlas/lab geometrisi. Slogan kart yığını geri gelmedi.

- WorkshopMarks / `WorkshopInvite` kaldırıldı (ana). Grup renkleri `categorySwatches`, bileşik kartı grup tinti, lab kartı aile rengi.
- Sözlük: 25 terim kart + bölüm atlama + “dene” linki + VSEPR’de su geometrisi.
- Her üründe yer adı başlık (Hakkında, Kullanım rehberi, Mağaza, Geri bildirim…). E2E: `İlk keşfini yap`, `Birleştir`, `Hidrojen`, `İsteği gönder`, `0 / 6 rota`, playground Demir. `/docs` fetch/proxy’ye dokunulmadı (paralel düzeltme recent-work’te).
- Tarayıcı Vite `:5173`: ana, lab (su birleştirme), sözlük, formül (NaCl), about/rehber/koleksiyon/bileşik/Fe/dedektif/docs/data/demo/geri bildirim/giriş/404/mağaza/piyasa. Mobil 390: sözlük kabuğu + lab drawer. `npm --prefix web-app test` 22/22. Commit yok.

---

## `/docs` playground fetch (Failed to fetch)

Vite `:5173` playground `http://localhost:5000/api/v2/elements/fe` çağırıyordu; gateway ve atlas kapalıydı, CORS/Failed to fetch. Vite artık `/api/v2` → `127.0.0.1:5080` proxy’liyor; dev `SCIENCE_BASE_URL=/api/v2`. Curl sayfa origin’ini gösterir. Fe/H₂O GET için tam platform gerekmez; science `:5080` yeterli (şu an host `dotnet run`, atlas imajı yoktu). Tarayıcı: Fe 200 JSON, Su chip, ETag 304. `npm --prefix web-app test` 22/22.

---

## API dokümanı, sözlük, tezgâh dili

Ponytail *denetimi* kod silmedi; bu dilimde de tüm-repo silme yok. Ticaret yığını duruyor.

- `/docs`: v2 parametre tablosu (Türkçe), Fe + H₂O curl, ETag/304, 400/404 gövdeleri, playground’da Demir/Su ve “Aynı ETag ile sor”. KREDI vs legacy `*Elx` duruyor. Uydurma uç yok.
- `/sozluk`: laboratuvar / API / kredi masası; formül birimi, stoikiometri, VSEPR, keşif ≠ reaksiyon, ETag, KREDI.
- Kopya: slogan yığını yok. Su/tuz/pas, somut başlık. About’taki “üç rota” artık altı. `İsteği gönder` / `İlk keşfini yap` / `Birleştir` e2e etiketleri aynı.

---

## İçerik/oyun planı: 6 rota + iki oyun

`content-and-games-plan.md` kalan ürün dilimi: Formülü kur, Element dedektifi, 3 ek rota, bileşik grup filtreleri, laboratuvar sıradaki hedef + kayıt türü sorusu.

- Rotalar `web-app/src/data/lessons.json` (ön yüz + identity `Data/lessons.json`). Eski `everyday`/`salts`/`oxides` kimlikleri durur.
- Oyun skorları `elementapi:games:v1`; keşif/rota JSON’una yazılmaz.
- LearningController ders üst sınırı `Lessons.Count`; hesap eşitlemesi için identity imajı yeniden derlenmeli.
- Bileşik listesi grup süzgeci formül/kullanımdan türetilir. 65 fotoğraf eksiği ve PubChem tam anlık görüntü bu dilimde yok.

---

## Laboratuvar formül sırası ve geometri

Deneme alanı Hill/alfabetik torba sırası gösteriyordu (`O₂Si`, `ClNa`). `bagFormula` artık katalog formülünü (yoksa elektropositif/`writeFormula`) kullanır. SiO₂ kuvars ağı olarak etiketlenir. Keşif kartı + bileşik ayrıntısında VSEPR/ağ geometrisi (SVG, 3D yok). Katalog 167; izomerler hâlâ tek anahtar.

---

## Ponytail denetimi (kod silinmedi)

Tüm servisler tarandı. Canvas: Cursor canvases `ponytail-audit.canvas.tsx`. Ölçülebilir kesim ~−480 satır, 0 bağımlılık; Java ödeme süreci satıra dahil değil (demo dondurulur). Uygulanan silme yok — laboratuvar geometrisi/formül sırası ayrı iş.

Öne çıkanlar: üç element kataloğu; Redis önbelleği 118 satır için; `start-local.ps1`; README:21 ve PRODUCT-ROADMAP hâlâ 51/18; identity/compound imajı JSON gömülü. `chemistry.ts` solver’ına dokunulmadı.

---

## Atlas ayrıntısı API olmadan (Yeniden dene)

Vite’de gateway yokken periyodik tablo yerelde çiziliyor, ayrıntı `useScience` ile `/api/v2` bekliyordu → “Temel tablo gösteriliyor / Yeniden dene”. `useScience` artık `scientific-elements.json` + `known-compounds.json` ile hemen kayıt gösteriyor; canlı API gelince üzerine yazar. 404 olan yeni bileşikler de yerel katalogdan açılır.

---

## Bileşik kataloğu ve laboratuvar (stoikiometri)

Kullanıcı bileşik sayısını ve oyunun basitliğini yetersiz buldu. 18 tariflik iki kart eşleşmesi kalktı.

- Katalog: **51 → 167** bilinen gerçek molekül (`web-app/src/data/known-compounds.json`). Mağaza SKU listesine otomatik ürün eklenmedi.
- Oyun: element seç + atom sayısı + Birleştir. Başarı kaydı gösterir; başarısızlık oranı (`HO` vs `H2O`), kararsız stoikiometri veya soygaz olarak açıklanır. Hayali bileşik yok.
- Doğrulama: `web-app/tests/chemistry.test.mjs` + `lab.test.mjs`. LearningController izin listesi aynı JSON’dan; hesap eşitlemesi için identity imajının yeniden derlenmesi gerekir.
- Yeni bilimsel kayıtlarda yapı PNG yok (`media.structure: null`); 51 eski kayıtta yapı duruyor. PubChem tam anlık görüntü yeniler için sonradan `refresh-scientific-catalog.mjs`.

---

# Son çalışma — 15 Eylül 2026

## Varsayılan çalıştırma: tam Docker

Host/`artifacts` hibrit akış bırakıldı. `present-platform.ps1` → `docker compose up -d [--build]` (http://localhost:3000); `present-local.ps1` → `docker-compose.science.yml` (:5080); `stop-local.ps1` → compose stop. `start-local.ps1` duruyor ama varsayılan değil. `contracts/` silindi (kaynak: `shared-lib/Events`).

## Laboratuvar öncelikli fotoğraf paketi 2 (tamamlandı)

İçerik/oyun planındaki görsel izinin yarım kalan laboratuvar dilimi tamamlandı. C, N, P, Sn, Cr, Mn, Pb için lisanslı Commons numuneleri seçildi; fotoğraf 46 → **53/118** (65 eksik). Lab 15 elementinden yalnız **H** şemada kaldı (Commons’ta kabul edilebilir numune yok; deşarj tüpü politika dışı). Seçimler `atlas-photo-selections.json`; envanter yenilendi. Host: 13 birim testi + üretim build geçti. Bileşik katalog / yeni oyun modları bu pakette yok.

## İlk hızlı teslim: 6 numune fotoğrafı

Alüminyum, silisyum, titanyum, çinko, kobalt ve nikel fotoğrafları kaynak/lisanslarıyla eklendi (sonra paket 2 ile 53’e çıktı). Kalıcı seçim listesi atlas-photo-selections.json; envanter ../ELEMENT-MEDIA-INVENTORY.md.


## Yeni talep: içerik, oyunlar ve görseller

Kullanıcı bileşik ve oyun kapsamını yetersiz buldu; element resimlerinin tamamlanmasını istedi. [Yapılacaklar planı](content-and-games-plan.md) aktif; görseller ilerledi, bileşik/oyun genişlemesi hâlâ açık. ÖğrenmeController 18 keşif / 3 rota sınırı bağımlılığı duruyor.

Güncel durum: [ürün özeti](project-overview.md), [tasarım sistemi](design-system.md), [senaryolar](../PRODUCT-SCENARIOS.md).

- Ürün odağı atlas → laboratuvar → 3 rota → koleksiyon olarak düzenlendi; 18 keşif korunuyor.
- Hesap eşitlemesi, misafir aktarımı, özel veri indirme, şifre/hesap yaşam döngüsü ve API anahtar iptali eklendi.
- Bağımsız bilim profili :5080, tam platform :3000 (Docker compose). Servisler .NET 10'a taşındı.
- Yerel doğrulama ve DB restore araçları tamamlandı; önceki tam sonuçlar LOCAL-VERIFICATION.md içinde tarihli.
- Ön yüz gerçek shadcn kaynakları + Radix + Tailwind 4 ortak katmanına taşındı. Yeni sidebar/mobile Sheet; Dialog/Tabs/DropdownMenu/Disclosure; ortak form, tablo, kart, düğme ve ilerleme bileşenleri.
- Sloganlı başlıklar ve fazla tanıtım alanları sadeleştirildi; sıcak beyaz/grafit/yeşil görsel yön seçildi.
- Bileşen geçişinde Card Slot sınırları ve bilimsel bölüm açma davranışı düzeltildi. Test raporu klasörleri Vite izlemesinden çıkarıldı; Playwright profillerine ayrı çıktı dizinleri verildi.
- Resend tercihi kaydedildi; gerçek e-posta gönderimi ve internet yayını yapılmadı.

Aşağıdaki eski kayıtlar tarihsel bağlamdır; portlar ve test sayıları güncel durum için kaynak değildir.

---

# Recent work (ChatGPT → Cursor continuation)

Timeline context: conversation Resume Atlas Lab work (conversation ID: `288cf6e9-1d7b-4dc0-9110-6e9e098ada75`). Commits on `main` are mostly placeholder messages (`aaa`); the real unfinished track lived as large **uncommitted** diffs.

## ChatGPT started

1. **Scientific catalog v2 + Atlas** — editorial Turkish copy, media schema, PubChem structures, Wikipedia links
2. **Laboratuvar UI** — `/lab` discovery game replacing the old observability “stack” marketing page
3. **Infra simplify** — remove ELK/Grafana/Prometheus/OpenTelemetry/HealthChecks.UI packages and compose services (`artifacts/simplify-infra.mjs` was the rewrite helper)
4. **Doc sync** — README / sitemap / platform tests pointed at `/lab` instead of `/stack`
5. **Fe photo gap** — Iron Commons sample is FAL-licensed; script initially rejected FAL → `media.photo` stayed null

## Cursor continuation finished (2026-09-06)

| Item | Status |
|------|--------|
| Accept FAL in `refresh-atlas.mjs` license regex | Done |
| Re-fetch Fe → `web-app/public/media/atlas/fe.jpg` + manifest + scientific JSON | Done |
| API returns Fe `media.photo.url=/media/atlas/fe.jpg` | Verified live |
| `/lab` live on Vite `:5173` | Verified |
| `/metrics` + `/health-ui` → 404 | Intentional; verified |
| `Stack.tsx` / `docker/observability` / `OpenTelemetryExtensions.cs` gone | Verified absent |
| Docs mention `/lab`, atlas refresh | In root README |
| web-app tests 5/5 + production build | Verified |
| catalog / gateway / compound `dotnet build` | Verified |

## Local stack re-verify (2026-09-07)

| Item | Status |
|------|--------|
| Fix `start-local.ps1` `.env` parse (TR locale dropped `RABBITMQ_*`) | Done |
| Order `:5003` + payment `:5005` + Rabbit `element` user | Up |
| `test-smoke.ps1` buy saga + desk sell | **20/20** |
| Fe atlas via gateway after refreshing Release `Data/` JSON | `media.photo` FAL `/media/atlas/fe.jpg` |
| `/`, `/lab`, `/market`, `/shop`, compounds, auth | Verified |

## Ponytail delete pass (2026-09-07)

| Item | Status |
|------|--------|
| Delete `web-app/design/` handoff | Done |
| Remove HotChocolate GraphQL BFF from gateway (+ QueryTests; platform check → REST ticker) | Done |
| Delete eight per-service `docker-compose.yml` (keep root compose) | Done |
| Catalog gRPC (`GrpcServices` / `element.proto` / `Grpc.AspNetCore`) | Done |
| Unused NuGet: catalog MediatR+FluentValidation; identity FluentValidation; catalog MassTransit.EFCore; shared Rabbitmq health pkg; gateway UI.Client direct | Done |
| order: drop unused `ioredis` + `redisUrl` | Done |
| payment: drop redundant `jackson-databind` | Done |
| Empty `deploy/helm`, `deploy/k8s`, redundant `deploy/docker` shim | Done |
| Dead `financeProfiles` / `valuationFor` in elementData | Done |
| Host verify: gateway/catalog/identity/shared + web build + order tsc | Done |
| Git commit | **Not done** — user did not ask |

## README doc pass (2026-09-07)

| Item | Status |
|------|--------|
| Inventory all `README*` (13 files) | Done |
| Root + gateway: `/api/v2` routes; ops note that `/metrics` gone | Done |
| catalog / compound: scientific v2 + atlas pointers | Done |
| web-app: routes (`/lab`, `/stack`→`/hakkinda`), host Vite prefer | Done |
| order: KREDI grant wording; drop `LOGSTASH_HTTP_URL` | Done |
| payment: drop prometheus; KREDI limits; keep `INSUFFICIENT_ELX` reason | Done |
| shared-lib: compound consumer; HealthChecks.UI.Client clarification | Done |
| identity / shipment / notification: host-first run notes | Done |
| memory-bank README | Left as-is (accurate) |
| contracts/ | Removed — docs-only JSON samples; truth is shared-lib/Events |

## Remaining follow-through (2026-09-07, later)

| Item | Status |
|------|--------|
| KREDI vs ELX wire rename | **Keep legacy wire** (non-breaking). Canonical list in root README; decision in `decisions.md` |
| ApiDocs + order/payment README point at legacy `*Elx` / `INSUFFICIENT_ELX` | Done |
| Comment/assert copy still saying “ELX” as currency | Fixed (`compoundPrice.ts`, `ledger.check.ts`) |
| `docker/README.md` | Skipped (duplication) |
| Git commit (Atlas / infra / docs split) | **Not done** — user did not ask |
| Atlas photo coverage expansion | Left intentional gaps; no scrape |

## Ponytail simplify pass 2 (2026-09-07)

| Item | Status |
|------|--------|
| Gateway API-key CoR → `ApiKeyValidator.ValidateApiKeyAsync` (7 handler files gone) | Done |
| Gateway.Tests 7/7 (needs `DOTNET_ROLL_FORWARD=LatestMajor` without net9 runtime) | Done |
| compound + shipment: fold Core into Infrastructure; drop `ICompoundRepository` | Done |
| identity: `ITokenService` / `IApiKeyService` → concrete DI | Done |
| `IElementRepository` one-impl | **Skipped** — fans across catalog API/controllers |
| web-app axios → fetch; drop axios dep | Done |
| order uuid v4 → `crypto.randomUUID()`; keep `uuid` for v5 | Done |
| shared-lib: drop HealthChecks.UI.Client; compact `/health` JSON | Done |
| order `healthUi` → `{ status, checks:[{name,ok,ms}] }` | Done |
| inline `storage.ts` into App; merge Shipment* events | Done |
| parallel `element-properties.json` | **Skipped** — non-trivial data path |
| README boilerplate / GraphQL leftovers | light only (integration comment) |
| Git commit | **Not done** |

## Intentionally incomplete (not blockers for this track)

- Only **~40 / 118** elements have specimen photos (strict Commons filters). Rest stay `photo: null` with schema/Bohr fallback in UI.
- Large uncommitted working tree (JSON blobs, media, compose/docs) — **not committed** unless user asks.
- After atlas JSON edits, avoid relying on stale Release bin Data with `-NoBuild` (see `open-risks.md`).
- No `docker/README.md` — root README + `docker/.env.example` cover compose; avoid a third copy.

## Key new / touched files

- `deploy/scripts/refresh-atlas.mjs`, `deploy/data/atlas-editorial.mjs`, `deploy/data/atlas-media.json`
- `web-app/src/pages/Laboratory.tsx`, `web-app/src/services/lab.ts`, `web-app/src/atlas.css`, `AtlasVisual.tsx`
- `web-app/public/media/atlas/*` (photos + `*-structure.png`)
- Compose / Program.cs / csproj / order observability strip across services
- Service + root `README.md` sync (lab, v2, host verify, no observability stack)
- KREDI/ELX legacy wire documented: root README, `decisions.md`, ApiDocs, order/payment READMEs


## Ön yüz doğrulama sonucu — 15 Eylül 2026

28 keşif/gezinti + 10 hesap arayüzü + 2 gerçek platform tarayıcı senaryosu geçti; web 11 birim testi, lint ve üretim build başarılı. 3080 tam web ve 5080 bağımsız atlas yeni tasarımı sunar. Sonuç ayrıntısı LOCAL-VERIFICATION.md içinde.
