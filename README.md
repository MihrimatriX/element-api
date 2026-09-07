# ElementAPI

**Bilimsel katalog v2:** Referans periyodik tablo, anlatımlı element/bileşik kayıtları, laboratuvar keşfi (`/lab`), `view/include/fields`, ETag ve açık CORS. Plan ve örnekler: [Bilimsel katalog](deploy/scientific-catalog.md). Başlangıç: `GET /api/v2/elements/fe`, `GET /api/v2/compounds/aspirin`.

118 elementin ve 51 bileşiğin kaynaklı bilimsel özellikleri için halka açık API; yanında fiyat tablosu, ürün mağazası ve kişisel kasa. **Kredi** uygulamanın sanal para birimidir. Piyasa fiyatları, stoklar, ödeme ve kargo simülasyondur; gerçek borsa verisi, tahsilat veya fiziksel teslimat yoktur.

Yerel geliştirme: **[localhost:5173](http://localhost:5173)** · API: **[localhost:5000/api/v1](http://localhost:5000/api/v1)**. Docker web sürümü 3000 portunu kullanır.

MIT lisansı: [LICENSE](./LICENSE).

**Son iş paketi (Atlas / `/lab` / infra sadeleştirme):** ayrıntılı Türkçe anlatım → [docs/WHAT-WAS-DONE.md](./docs/WHAT-WAS-DONE.md) · agent bellek bankası → [docs/memory-bank/](./docs/memory-bank/).

[![Stack](https://img.shields.io/badge/stack-.NET%20%7C%20Node%20%7C%20Java%20%7C%20React-blue)](#servis-kataloğu)
[![Gateway](https://img.shields.io/badge/gateway-YARP%20%2B%20GraphQL-512BD4)](#api-gateway)

---

## Hızlı başlangıç

### Günlük geliştirme (hafif)

Docker'da yalnız PostgreSQL, Redis ve RabbitMQ; uygulamalar bilgisayarda çalışır. Her değişiklikte Docker imajlarını yeniden derlemek gerekmez. Node.js 22+, .NET 9 ASP.NET Core runtime ve uyumlu SDK, Java 21 ve Maven gerekir. Bu bilgisayardaki taşınabilir araçlar varsa `artifacts/` içinden otomatik bulunur.

```powershell
# İlk kurulum: docker/.env.example dosyasını docker/.env olarak kopyala; mevcut .env dosyasını koru.
docker compose --env-file docker/.env up -d postgres redis rabbitmq
npm --prefix order-service ci
npm --prefix web-app ci
./deploy/scripts/start-local.ps1 -IncludePayment
npm --prefix web-app run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Kod güncellendikten sonra `start-local.ps1 -Restart -IncludePayment`; yalnız derlenmiş servisleri açmak için `-NoBuild`. Script başka projelerin dolu portlarındaki işlemlerini durdurmaz. Loglar `artifacts/local/` içindedir. Bu bilgisayarda PostgreSQL portu **5434**, web portu **5173** seçilmiştir. İzleme araçları günlük geliştirme için gerekli değildir.

### Kontrol

Tüm yerel derleme, birim testi ve npm güvenlik kontrolleri için `./deploy/scripts/test-all.ps1`.
Docker üzerinde ayrı test konteynerleriyle entegrasyon için `-Integration`; çalışan yerel servislere karşı bilimsel API, alışveriş ve smoke kontrolleri için `-Live` ekleyin. Örneğin `./deploy/scripts/test-all.ps1 -Integration -Live`. Script Docker imajlarını yeniden derlemez; Java 21/Maven ve npm bağımlılıkları kurulu olmalıdır.

```powershell
./deploy/scripts/test-unit.ps1
npm --prefix order-service run check
./deploy/scripts/test-saga.ps1
node deploy/scripts/test-e2e.mjs
./deploy/scripts/test-smoke.ps1
npm --prefix web-app run build
npm --prefix web-app run lint
```

`test-saga.ps1`, gerçek PostgreSQL üzerinde geçici ve ayrı bir şemada çift ödeme, iade, zaman aşımı ve geç mesajları sınar; sonunda kendi şemasını kaldırır. `test-e2e.mjs` ve smoke testi çalışan yerel servislere bağlanır, ayrı deneme hesapları açar. Docker web sürümünü denemek için smoke testine `-WebBase http://localhost:3000` ver.

Tam Docker ortamı hazır olduğunda `node deploy/scripts/test-platform.mjs`, sekiz backend servisinin sağlık uçlarını, derlenmiş web sayfalarını (`/lab` dahil), GraphQL fiyat sorgusunu ve gateway üzerinden gerçek SignalR fiyat olayını doğrular. Varsayılan web adresi `http://localhost:3000`; başka bir derlenmiş web sunucusu için `WEB_BASE` ortam değişkenini ayarlayın.

### Bilimsel veri ve alışveriş sözleşmesi

- Elementlerin kütle, yoğunluk, sıcaklık, elektron dizilimi ve elektronegatiflik verisi [PubChem periyodik tablosundan](https://pubchem.ncbi.nlm.nih.gov/periodic-table/) alınan sürümlenmiş dosyadan gelir. Yanıtlarda `sourceUrl`, `retrievedAt` ve `units` bulunur; kaynaktaki bilinmeyen değerler `null` kalır. Atom numarası 119 gibi varsayımsal kayıtlar yayımlanmaz.
- 51 bileşikte molekül formülü, molar kütle (`g/mol`), IUPAC adı, InChIKey ve PubChem bağlantısı bulunur. Allotrop ve preparatlar saf bir bileşik kaydı gibi sunulmaz. Mağaza 118 saf elementi ve mevcut bileşik/preparat ürünlerini listeler.
- Atlas katmanı (Türkçe anlatım, görseller, Wikipedia/PubChem linkleri) `node deploy/scripts/refresh-atlas.mjs` ile yeniden uygulanır; bilimsel yenilemeden sonra otomatik çalışır. Medya indirme: `node deploy/scripts/refresh-atlas.mjs --fetch`.
- Veriyi bilinçli yenilemek için `node deploy/scripts/refresh-element-properties.mjs` ve `node deploy/scripts/refresh-compound-properties.mjs --force`; API çalışırken dış kaynağa bağımlı değildir.
- Siparişe gram cinsinden sayısal `quantity` gönderilir (en fazla dört ondalık). `Idempotency-Key` olarak aynı UUID ile tekrar gönderilen aynı sipariş yalnız bir kez ücretlendirilir; farklı içerik `409` döner.
- Kasadaki her ürün `symbol + compoundSlug` ile ayrılır. NaCl, saf Na gibi satılamaz. Satışta aynı `compoundSlug` gönderilir; alış ve satış fiyatı sunucuda hesaplanır. Başarısız/zaman aşımına uğramış siparişte ayrılan stok serbest bırakılır, tahsil edilmiş Kredi bir kez iade edilir.
- Para birimi kodu `KREDI`, fiyat kaynağı `simulation`dır. **Kasıtlı kırıcı rename yok:** wire/API alan adları ve reason kodları geçmişten kalan `*Elx` biçiminde kalır; değerler Kredi'dir. Korunan isimler: `balanceElx`, `avgCostElx`, `proceedsElx`, `requiredElx`, reason `INSUFFICIENT_ELX`, DB kolonları `balance_elx` / `avg_cost_elx` / `elx`. Yanıtta `currency: "KREDI"` ile doğrulayın. Bu paragraf tek kaynak gerçeğidir (servis README’leri buraya işaret eder).
- Cüzdan ve siparişler ortak yanıt önbelleğine girmez. Özel sipariş durumları herkese açık SignalR kanalında yayımlanmaz; istemci kendi siparişlerini kimlik doğrulayarak sorgular. İç servis çağrıları ayrıca paylaşılan servis anahtarı ister.

### Tam Docker ortamı

**Lab** (tüm portlar açık: postgres host `${POSTGRES_HOST_PORT:-5432}`, redis `:6380`, rabbit, servisler). Host’ta 5432 doluysa `docker/.env` içinde `POSTGRES_HOST_PORT=5434`.

```bash
cp docker/.env.example docker/.env
docker compose --env-file docker/.env up -d --build
```

**Public demo** (host’ta yalnızca web `:3000` ve gateway `:5000`):

```bash
cp docker/.env.example docker/.env
docker compose --env-file docker/.env -f docker-compose.yml -f docker-compose.public.yml up -d --build
```

| Adres | Ne için? |
|-------|----------|
| **[localhost:3000](http://localhost:3000)** | Tablo · Bileşikler · Laboratuvar (`/lab`) · Piyasa · Mağaza · API |
| [localhost:5000](http://localhost:5000) | API Gateway |
| [localhost:5000/swagger](http://localhost:5000/swagger) | Catalog OpenAPI (proxy) |

Kayıt → `GET /api/v1/me/wallet` 10.000 kredi grant → mağazadan Au (ask) → kasa → masadan sat (bid).

Durdurma: `docker compose down` · Verileri sil: `docker compose down -v`

---

## Mimari

```mermaid
flowchart TB
    subgraph clients [İstemciler]
        Web[web-app :3000]
        API[REST / GraphQL]
    end

    GW[gateway-service :5000]

    subgraph public [Gateway üzerinden erişilebilir]
        ID[identity :5001]
        CAT[catalog :5002]
        CMP[compound :5007]
        ORD[order :5003]
        NOT[notification :5006]
    end

    subgraph internal [Mesaj tabanlı — internal]
        PAY[payment :5005]
        SHP[shipment :5004]
    end

    subgraph infra [Altyapı]
        PG[(PostgreSQL)]
        RD[(Redis)]
        MQ[RabbitMQ]
    end

    Web --> GW
    API --> GW
    GW --> ID & CAT & CMP & ORD & NOT
    ORD -->|saga events| MQ
    MQ --> PAY & SHP & CAT & NOT
    ID & CAT & CMP & ORD & SHP --> PG
    CAT & GW --> RD
```

### Saga akışı

```
POST /api/v1/orders  →  Submitted
  → catalog (stok ayır)  →  StockReserved
  → payment (ödeme)      →  PaymentProcessed
  → shipment (kargo)     →  ShipmentDispatched
  → Completed
```

---

## Servis kataloğu

Her servisin kendi README'si endpoint tabloları, ortam değişkenleri ve tek başına çalıştırma adımlarını içerir.

| Servis | Port | Stack | Rol | Dokümantasyon |
|--------|------|-------|-----|---------------|
| **gateway-service** | 5000 | .NET YARP + GraphQL | Tek giriş, API key, rate limit | [README](./gateway-service/README.md) |
| **identity-service** | 5001 | .NET 9 | Auth, JWT, API anahtarları | [README](./identity-service/README.md) |
| **catalog-service** | 5002 | .NET 9 | Element kataloğu, arama, stok | [README](./catalog-service/README.md) |
| **compound-service** | 5007 | .NET 9 | Bileşik / allotrop / preparat | [README](./compound-service/README.md) |
| **order-service** | 5003 | Node.js 22 | Sipariş + saga orkestrasyonu | [README](./order-service/README.md) |
| **shipment-service** | 5004 | .NET 9 | Kargo worker + sorgu API | [README](./shipment-service/README.md) |
| **payment-service** | 5005 | Java 21 | Ödeme worker | [README](./payment-service/README.md) |
| **notification-service** | 5006 | .NET 9 | SignalR push bildirimleri | [README](./notification-service/README.md) |
| **web-app** | 3000 | React + Vite | Tablo · laboratuvar · mağaza · API | [README](./web-app/README.md) |
| **shared-lib** | — | .NET lib | Ortak event, logging, ops | [README](./shared-lib/README.md) |
| **contracts** | — | JSON şemalar | Polyglot mesaj sözleşmeleri | [README](./contracts/README.md) |

---

## API Gateway — rota özeti

Gateway üzerinden (`localhost:5000`) erişilen rotalar:

| Rota | Hedef | Auth |
|------|-------|------|
| `GET /api/v1` | Catalog discovery | — |
| `GET /api/v2/elements/**` | Catalog (bilimsel) | Public (`fields` / ETag / CORS) |
| `GET /api/v2/compounds/**` | Compound (bilimsel) | Public |
| `GET /api/v1/elements/**` | Catalog | History API key; **ticker public** |
| `GET /api/v1/compounds/**` | Compound | Public |
| `GET /api/v1/market/**` | Catalog | Public (movers, board) |
| `POST /api/v1/auth/register\|login` | Identity | — |
| `* /api/v1/api-keys/**` | Identity | JWT |
| `* /api/v1/webhooks/**` | Identity | JWT |
| `* /api/v1/me/**`, `/desk/**` | Order | API key |
| `* /api/v1/orders/**` | Order | API key (`X-API-Key`) |
| `WS /hub/notifications` | Notification SignalR | — |
| `POST /graphql` | Gateway BFF | — |

**Internal (gateway dışı):** payment, shipment saga worker'ları; identity `POST /api/v1/internal/api-keys/validate`.

Keşif: `GET http://localhost:5000/info` · RabbitMQ yönetim UI: `localhost:15672` (`docker/.env` kullanıcı/şifre)

---

## Standart operasyon endpoint'leri

Tüm backend servislerde tutarlı ops yüzeyi:

| Endpoint | Açıklama |
|----------|----------|
| `GET /info` | Servis adı, sürüm, ortam, link haritası |
| `GET /health` | Readiness (bağımlılıklar dahil) |
| `GET /health/live` | Liveness (process ayakta mı) |
| `GET /health/ready` | Readiness (DB, Redis, RabbitMQ…) |

Payment ek olarak: `/actuator/health/liveness`, `/actuator/health/readiness`

Prometheus `/metrics`, HealthChecks UI (`/health-ui`) ve ELK/Grafana yığını **bilinçli olarak kaldırıldı**; bu uçlar 404 beklenir.

---

## Veritabanları

Tek Postgres instance, ayrı veritabanları:

| DB | Servis |
|----|--------|
| `element_identity_db` | identity-service |
| `element_market_db` | catalog-service |
| `element_compound_db` | compound-service |
| `element_order_db` | order-service |
| `element_shipment_db` | shipment-service |

---

## Geliştirme

```bash
./deploy/scripts/build-all.ps1
./deploy/scripts/test-unit.ps1
./deploy/scripts/test-smoke.ps1   # Yerel servisler ayaktayken smoke test
```

Günlük döngü: host’ta `start-local.ps1` + `web-app` Vite; Docker yalnız postgres/redis/rabbitmq (üstteki **Hızlı başlangıç**). Tek servisi Docker ile denemek için o servisin README’sine bakın — platformu her değişiklikte `docker compose up --build` ile yeniden derlemeyin.

---

## Public / subdomain

Kâğıt kredi **para değildir**. Ev piyasa yapıcısı; emir defteri ve eşleştirme yok. MIT: [LICENSE](./LICENSE).

**Public overlay** (host’ta yalnızca `:3000` + `:5000`; DB portları kapalı):

```bash
cp docker/.env.example docker/.env   # sırları değiştir
docker compose --env-file docker/.env -f docker-compose.yml -f docker-compose.public.yml up -d --build
```

TLS compose’da yok — önüne Caddy / nginx / Cloudflare koy.

| Env | Ne işe yarar |
|-----|----------------|
| `VITE_PUBLIC_SITE_URL` | Canonical, Open Graph, sitemap. **Build arg** — değişince web-app rebuild. |
| `VITE_API_BASE_URL` | Tarayıcının çağırdığı **public gateway** (`…/api/v1`). Rebuild. |
| `PUBLIC_WEB_ORIGIN` | Gateway + notification CORS (SignalR dahil). Runtime. |
| `PUBLIC_API_BASE` | Catalog HATEOAS (`X-Forwarded-Host` gelmezse). Gateway origin, `/api/v1` yok. |
| `PUBLIC_SITE_URL` | Container start’ta `robots.txt` / `sitemap.xml` `__SITE_URL__` yerini doldurur (compose bunu `VITE_PUBLIC_SITE_URL` ile set eder). |

JWT `localStorage`’da; origin-scoped. Cookie auth yok.

**Tek host** (`https://market.example.com` → UI `/`, API `/api` + `/hub`):

```
PUBLIC_WEB_ORIGIN=https://market.example.com
VITE_PUBLIC_SITE_URL=https://market.example.com
VITE_API_BASE_URL=https://market.example.com/api/v1
PUBLIC_API_BASE=https://market.example.com
```

**İki subdomain** (`app` + `api`):

```
PUBLIC_WEB_ORIGIN=https://app.example.com
VITE_PUBLIC_SITE_URL=https://app.example.com
VITE_API_BASE_URL=https://api.example.com/api/v1
PUBLIC_API_BASE=https://api.example.com
```

Reverse-proxy `X-Forwarded-Host` / `X-Forwarded-Proto` geçirmeli; yoksa `PUBLIC_API_BASE` linkleri düzeltir.

SPA: `index.html` varsayılan meta taşır; rota başlıkları istemcide `Seo` ile yazılır. `robots.txt` + `sitemap.xml` (`/lab`, bileşikler, 118 `/element/{symbol}`) nginx’ten statik.

---

## Dizin yapısı

```
element-api/
├── gateway-service/     identity-service/    catalog-service/
├── order-service/       shipment-service/    payment-service/
├── notification-service/  web-app/           shared-lib/
├── contracts/           deploy/              docker/
├── docker-compose.yml   docker/.env.example
└── README.md            ← bu dosya
```
