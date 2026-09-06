# Ne yapıldı? — Ayrıntılı anlatım

Bu dosya, kök `README.md` hızlı başlangıcını bozmadan **son dönemde (ChatGPT + Cursor devamı) yapılan her şeyi** Türkçe açıklar. Güncel agent özeti: [`docs/memory-bank/`](./memory-bank/).

---

## 1. Büyük resim

ElementAPI iki dünyayı birleştirir:

1. **Bilimsel katalog** — 118 element + 51 bileşik; kaynaklı özellikler, Türkçe anlatım (atlas), görseller, Wikipedia/PubChem linkleri, açık API (`/api/v2/...`).
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
| `web-app/src/pages/Laboratory.tsx` | UI: kartlar, slotlar, birleştir, ipucu, defter |
| `web-app/src/services/lab.ts` | 18 tarif, açılma eşikleri, localStorage |
| `web-app/tests/lab.test.mjs` | Ulaşılabilirlik, denklem koruması, progress |
| `web-app/src/atlas.css` + `AtlasVisual.tsx` | Görsel dil / yapı veya fotoğraf |

Davranış özeti:

- Başlangıçta 6 element; keşfettikçe yeni elementler açılır; 18 bileşik hedef.
- İlerleme yalnız tarayıcıda (`localStorage`); cüzdan/siparişi etkilemez.
- `/lab?material=H` gibi deep-link; kilitliyse uyarı.
- Nav’da “Laboratuvar”; eski `/stack` → `/hakkinda` yönlendirmesi.
- Sitemap’e `/lab` eklendi.

Test: `npm --prefix web-app test` → 5/5.

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

Kök README ve servis README’leri laboratuvarı, atlas yenilemeyi ve “izleme araçları günlük geliştirme için gerekli değil” notunu yansıtacak şekilde güncellendi. `test-platform.mjs` derlenmiş web’de `/lab` arar. Bu dosya (`WHAT-WAS-DONE.md`) “her en ufak şey” anlatımı içindir; hızlı başlangıç hâlâ kök README’dedir.

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
- `GET /api/v2/compounds/aspirin`
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

### Bilinçli / ayrı konu

- Eksik element fotoğrafları (filtre politikası)
- Yerelde order `:5003` / payment `:5005` bazen ayağa kalkmıyor (RabbitMQ kimlik bilgisi, payment rebuild) → tam alışveriş e2e bu oturumda doğrulanamadı
- Devasa uncommitted diff — commit kullanıcı istemeden yapılmadı

---

## 10. İleride agent’lar için

Çalışmaya başlamadan [`docs/memory-bank/`](./memory-bank/) klasörünü oku. Cursor kuralı: `.cursor/rules/memory-bank.mdc` (alwaysApply). Ayrı bir “skill” yok; tek bellek kaynağı bu klasör + bu anlatım.
