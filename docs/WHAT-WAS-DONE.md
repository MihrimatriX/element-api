# Ne yapıldı? — Ayrıntılı anlatım

Bu dosya, kök `README.md` hızlı başlangıcını bozmadan **son dönemde (ChatGPT + Cursor devamı) yapılan her şeyi** Türkçe açıklar. Güncel agent özeti: [`docs/memory-bank/`](./memory-bank/).

## 19 Eylül — public dev/test/prod

Public stack üç ortama ayrıldı: `docker/.env.public.{dev,test,prod}.example`, `present-public.ps1 -Environment Dev|Test|Prod` veya `-All` (yerel HTTP :8080/:8081/:8082, ayrı compose project). Caddy `{$CADDY_SITE}`; gerçek domain/TLS için prod env’de site + 80/443. Ayrıntı: [PUBLIC-HOST.md](./PUBLIC-HOST.md). Commit yok.

---

## 19 Eylül — tek compose + domain (Phase A)


Public yayın artık host’ta ayrı Caddy gerektirmiyor: `docker-compose.public.yml` içinde Caddy (`:80`/`:443`), diğer portlar kapalı. Caddyfile `deploy/Caddyfile.elements-api`. Komut: `present-public.ps1` veya `docker compose --env-file docker/.env -f docker-compose.yml -f docker-compose.public.yml up -d --build`. Gateway rate limit Docker private peer’de XFF okur. `web-app/scripts` build yardımcıları geri yüklendi. Ayrıntı: [PUBLIC-HOST.md](./PUBLIC-HOST.md). DNS/sırlar sunucuda. Phase B (web-app ürün) sonraki. Commit yok.

---

## 18 Eylül — tek domain (elements-api.ahmetfuzunkaya.com)

Public yayın yolu netleştirildi: Caddy tek host; `/` → web, `/api*` `/hub*` `/swagger*` → gateway; same-origin `VITE_API_BASE_URL=/api/v1`. Gateway hız sınırı Caddy arkasında gerçek istemci IP’sini okur. Adım adım: [PUBLIC-HOST.md](./PUBLIC-HOST.md). DNS/TLS/sırlar sunucuda. Commit yok.

---

## 17 Eylül — de-slop + el kitabı + API ürünü (kapanış)

Üç paralel track bitti, bu dilim yalnız doğrulama + kapanış yaptı. Kullanıcının gördüğü:

- Görsel dil sadeleşti: gökkuşağı şerit, rozet, stok 3D sahne ve ölü stiller silindi; hareket tek sistem (Framer), kısa ve sakin.
- `/collection` artık "Defterim" diliyle konuşuyor (nav, Lab, atlas-only ekranı dahil); el kitabı `/nasil` "ilk 10 dakika" + SSS oldu ve nav'da üstte.
- Üyelik vaadi tek cümle: defter eşitlenir, 10.000 kredi ve API anahtarı, sipariş geçmişi. Kayıt/giriş ve hesap ekranları aynı dili söylüyor.
- Yeni `/developers` sayfası (TR + EN özet), statik `openapi.json`, doğru rate limit metni (gateway 100/10sn), webhook + v1 yüzeyi, [API şartları](./API-TERMS.md) ve [değişiklik kaydı](./API-CHANGELOG.md).
- `og.png` zaten mevcutmuş (1.4MB); sosyal önizleme referansı boş değil. Test: `npm test` 24/24, `npx vite build` yeşil. Commit yok.

---

## 17 Eylül — defter şeridi, Spline, GSAP, Framer

Admin sidebar kalktı; üst defter şeridi + renkli tablo sahne. Spline yalnız laboratuvar keşif inset’inde (resmi Spline “design” örneği; ana tabloya konmadı). GSAP tablo/lab, Framer rota/kart/dialog. Reduced-motion ve mobilde 3D yok. Commit yok.

---

## 17 Eylül — kicker, kesim, public host

ALL-CAPS kicker cümle haline geldi (slogan yok). Catalog Redis DTO cache ve ölü sarmalayıcılar silindi; ticaret yığını duruyor. Public: [PUBLIC-HOST.md](./PUBLIC-HOST.md) — Caddy 443 → `:3000` / `/api*` `/hub*` → `:5000`. Commit yok.

---

## 17 Eylül — servis kılavuzu

Uç tablosu yerine günlük dil. Okumaya [docs/SERVIS-KILAVUZU.md](./SERVIS-KILAVUZU.md) ile başla; her klasörün README’si “ne yapar / yapmaz / nasıl açılır”. `science-service` artık kendi README’sine sahip.

---

Ana sayfa sage/beyaz kiremit + 2 px şerit duruyordu. Hücreler kategori rengini doldurur; krem kâğıt kabuk; `El` pembe kiremit; Laboratuvar mercan. Slogan yok. Aç: `http://127.0.0.1:5173`.

---

Compose Element servisleri healthy. **Aç:** `http://127.0.0.1:5173` (Docker web yok; :3000 başka uygulama). Gateway `http://127.0.0.1:5000`, science `http://127.0.0.1:5080`. UI: krom kabuk, auth sayfa formu, mağaza/piyasa kart, öğrenme kartı sol şerit. `docker down` yapılmadı.

---

## 1. Büyük resim

ElementAPI iki dünyayı birleştirir:

1. **Bilimsel katalog** — 118 element + 167 bileşik; 51’i tam PubChem anlık görüntüsü, yeniler eğitim kaydı. Kaynaklı özellikler, Türkçe anlatım (atlas), görseller, Wikipedia/PubChem linkleri, açık API (`/api/v2/...`).
2. **Simülasyon piyasası** — Kredi bakiyesi, mağaza, sipariş saga’sı. Gerçek para / fiziksel teslimat yok.

Son iş paketi özellikle **atlas + laboratuvar (`/lab`) + altyapı sadeleştirme** etrafındaydı. ChatGPT çoğu parçayı yazmış ama Fe fotoğrafı (FAL lisansı) ve dokümantasyon/`/metrics` temizliği yarım kalmıştı; Cursor oturumunda bunlar tamamlandı.

---

## 2. Atlas katmanı nedir?

Ham bilimsel JSON (PubChem vb.) zaten vardı. Atlas, bunun üstüne **anlatım ve medya** ekler:

| Parça | Dosya / konum | Ne işe yarar |
|-------|----------------|--------------|
| Editöryel metin | `deploy/data/atlas-editorial.mjs` | Her element/bileşik için TR `summary`, `uses`, `story`, bileşiklerde `display_formula` |
| Medya manifesti | `deploy/data/atlas-media.json` | İndirilen fotoğraf/yapı URL’leri, lisans, Wikipedia linki |
| Statik dosyalar | `web-app/public/media/atlas/` | `fe.jpg`, `h2o-structure.png` vb. |
| Uygulama scripti | `deploy/scripts/refresh-atlas.mjs` | Manifest + editöryeli bilimsel JSON’a yazar |

API kaydında tipik alanlar:

- `editorial` — özet, kullanım, hikâye, kaynaklar
- `media.photo` / `media.structure` — görsel meta + `/media/atlas/...` yolu
- `external_links.wikipedia` / `pubchem`
- Bileşiklerde `composition` (formülden türetilir; moleküler formülle tutarlılık kontrolü var)

### Script nasıl çalışır?

```powershell
# İnternetsiz: mevcut manifest + editöryeli JSON’a basar
node deploy/scripts/refresh-atlas.mjs

# İnternetli: Wikipedia/Commons + PubChem yapı PNG (yavaş, rate-limit)
node deploy/scripts/refresh-atlas.mjs --fetch
```

`--fetch` kabaca:

1. Element/bileşik adlarıyla Wikipedia batch sorgusu (yönlendirme + TR dil linki + pageimage).
2. Elementlerde yalnız **numune benzeri** dosya adları kabul edilir (portre, diyagram, spektrum tüpü vb. elenir).
3. Commons’tan lisans okunur; izin listesindeyse dosya `web-app/public/media/atlas/` altına indirilir.
4. Bileşiklerde PubChem 2D yapı PNG’si indirilir (`{slug}-structure.png`).
5. Sonunda tüm kayıtlara editorial/media/external_links yazılır.

Bilimsel özellik yenilemesi (`refresh-scientific-catalog.mjs`) bittikten sonra atlas **otomatik yeniden uygulanır** — böylece özellik güncellemesi atlas alanlarını silmez.

---

## 3. FAL lisansı ve Demir (Fe) fotoğrafı

**Sorun:** Wikimedia’daki ünlü element numune fotoğraflarının bir kısmı (Alchemist-hp) **FAL / Free Art License** ile yayımlanıyor. Script başlangıçta yalnız CC BY / CC0 / Public domain kabul ediyordu → Fe için uygun görsel varken `media.photo` null kalıyordu.

**Çözüm:** Lisans regex’ine `FAL` ve `Free Art License` eklendi. Sonra `--fetch` ile Fe çekildi:

- Dosya: `web-app/public/media/atlas/fe.jpg`
- Manifest: `deploy/data/atlas-media.json` → `"Fe".photo.license = "FAL"`
- API: `GET /api/v2/elements/fe?fields=...media` → `url: "/media/atlas/fe.jpg"`

**Bilinçli eksik:** Tüm 118 elemente fotoğraf yok (~40 fotoğraf). Gazlar, sentetikler veya lisans/heuristik uymayanlar `null` kalır; arayüz şematik görsele düşer. Bu bir bug değil, politika.

---

## 4. Laboratuvar sayfası (`/lab`)

Eski **stack / gözlemlenebilirlik** tanıtım sayfası ürün yüzeyi olmaktan çıktı. Yerine eğitim keşif oyunu geldi.

| Dosya | Rol |
|-------|-----|
| `web-app/src/pages/Laboratory.tsx` | UI: elementler, atom sayısı, birleştir, ipucu, defter |
| `web-app/src/services/chemistry.ts` | Formül ayrıştırma, stoikiometri, bilinen-molekül bakışı |
| `web-app/src/services/lab.ts` | Katalog, localStorage, keşif kaydı |
| `web-app/tests/chemistry.test.mjs` | H2O/NaCl/CH5/HO ve parantezli formüller |
| `web-app/src/atlas.css` + `AtlasVisual.tsx` | Görsel dil / yapı veya fotoğraf |

Davranış özeti (17 Eylül 2026):

- Tüm kimya elementleri açık; 167 bilinen formül stoikiometri ile kurulur (2 H + 1 O → H₂O).
- Laboratuvar girişinde üç oyun: Birleştir, Formülü kur (`/lab/formula`), Element dedektifi (`/lab/detective`). Oyun skorları `elementapi:games:v1`; keşif defterine yazılmaz.
- Altı öğrenme rotası (`lessons.json`); eski üç kimlik korunur. Yeni rotalarda iki soru vardır.
- İlerleme yalnız tarayıcıda (`localStorage`); cüzdan/siparişi etkilemez. Hesaplı keşif eşitlemesi identity’nin `known-compounds.json` + `lessons.json` izin listesine bağlıdır.
- `/lab?material=H` gibi deep-link.
- Nav’da “Laboratuvar”; eski `/stack` → `/hakkinda` yönlendirmesi.
- Sitemap’e `/lab`, `/lab/formula`, `/lab/detective` eklendi.

Test: `npm --prefix web-app test` (chemistry + lab + learning).

---

## 5. Altyapı sadeleştirme (observability kaldırma)

Amaç: günlük geliştirmede ELK/Grafana/Prometheus yığınını **zorunlu kılmamak** ve makineyi ısıtmamak.

Kaldırılan / temizlenen örnekler:

- `docker/observability/**` (Prometheus, Grafana, Loki, ELK, hub, …)
- Compose içindeki observability servisleri ve volume’lar
- .NET: OpenTelemetry paketleri, `MapPrometheusScrapingEndpoint`, HealthChecks UI, Seq/OTLP ayarları
- `shared-lib` OpenTelemetry eklentisi
- Order: `prom-client` / `/metrics`
- Payment: micrometer/otel/logstash bağımlılıkları; `logback-spring.xml` (Logstash appender) silindi
- `deploy/helm`, `deploy/k8s` ağaçları
- Platform testinden metrics/observability assert’leri; `/stack` → `/lab`

**Kasıtlı 404:** `GET /metrics`, `GET /health-ui` → bulunamaz. Sağlık için `/health`, `/health/live`, `/health/ready`, `/info` kaldı.

Yardımcı script (bir kerelik rewrite): `artifacts/simplify-infra.mjs` — geçmiş referans; her gün çalıştırmak gerekmez.

---

## 6. Dokümantasyon senkronu

Kök README ve servis README’leri laboratuvarı, atlas yenilemeyi ve “izleme araçları günlük geliştirme için gerekli değil” notunu yansıtacak şekilde güncellendi. `test-platform.mjs` derlenmiş web’de `/lab` arar. 2026-09-07’de ikinci bir README turu v2 gateway rotalarını, catalog/compound bilimsel uçlarını, payment/order’daki Prometheus/Logstash/ELX drift’ini ve host-first çalıştırma notlarını hizaladı. Aynı günün devamında **KREDI** kullanıcı yüzü + legacy wire (`balanceElx`, `INSUFFICIENT_ELX`, …) tek kaynak olarak kök README’de sabitlendi; kırıcı rename yok. 17 Eylül 2026: uygulama `/docs` Fe+H₂O curl, parametre tablosu, ETag/304 ve 400/404 örnekleriyle genişledi; `/sozluk` tezgâh diline çekildi. Aynı günün devamında kopyanın üstüne görsel geçiş: formül damgaları, grup rengi, sözlük kartları, boş durum çağrıları; slogan yığını geri gelmedi. Bu dosya (`WHAT-WAS-DONE.md`) “her en ufak şey” anlatımı içindir; hızlı başlangıç hâlâ kök README’dedir.

---

## 7. Sistem nasıl çalışır? (kısa tur)

```
Tarayıcı :5173 (dev) veya :3000 (docker web)
    → API istekleri gateway :5000
        → identity / catalog / compound / order / notification
Sipariş saga → RabbitMQ → payment + shipment
Veri → PostgreSQL (ayrı DB’ler), bazı önbellek → Redis
Atlas medyası → web’in statik /media/atlas (gateway üzerinden değil, SPA origin)
```

Bilimsel keşif için tipik çağrılar:

- `GET /api/v2/elements/fe`
- `GET /api/v2/compounds/h2o`
- `fields=symbol,names,editorial,media` ile daraltma

Laboratuvar tamamen istemci tarafı; API şart değil ama sonuç kartlarında yapı görseli için compound API kullanılır.

---

## 8. Nasıl doğrularsın? (full Docker rebuild yok)

```powershell
npm --prefix web-app test
npm --prefix web-app run build
dotnet build catalog-service/Element.Services.Element.API/Element.Services.Element.API.csproj
# Gateway zaten ayaktaysa:
#   /api/v2/elements/fe?fields=symbol,names,editorial,media
#   /lab  ve  /media/atlas/fe.jpg
#   /metrics ve /health-ui → 404
```

Ayrıntı: [`memory-bank/local-dev.md`](./memory-bank/local-dev.md) ve `.cursor/rules/local-dev.mdc`.

---

## 9. Ne tamamlandı / ne bilinçli eksik?

### Tamamlandı (bu iş paketi)

- Atlas script + editorial + medya pipeline
- `/lab` oyunu + testler + build
- Fe FAL fotoğrafı API + statik dosya
- Observability yığını ve `/stack` kaldırma; docs `/lab` ile uyumlu
- Host-local doğrulama: web test/build, .NET build, canlı Fe/`/lab`/404 metrics
- KREDI sözleşmesi: UI/docs Kredi; wire `*Elx` / `INSUFFICIENT_ELX` bilinçli korunur

### Bilinçli / ayrı konu

- Eksik element fotoğrafları (filtre politikası)
- Devasa uncommitted diff — commit kullanıcı istemeden yapılmadı
- Saga/smoke bu host’ta 2026-09-07’de **20/20** geçti; yine de uncommitted ağaç commit edilene kadar kayıp riski var

---

## 10. İleride agent’lar için

Çalışmaya başlamadan [`docs/memory-bank/`](./memory-bank/) klasörünü oku. Cursor kuralı: `.cursor/rules/memory-bank.mdc` (alwaysApply). Ayrı bir “skill” yok; tek bellek kaynağı bu klasör + bu anlatım.
