# Sipariş servisi (order-service)

> Müşterinin alış emrini doğrular, fiyatlar ve kaydeder. Sonra stok → ödeme → kargo adımlarını bir saga ile sırayla yürütür.

| Özellik | Değer |
|---|---|
| Teknoloji | Node.js 22, TypeScript (ESM), Express 4, pg, amqplib, zod, pino |
| Port | 5003 (host) → 8080 (konteyner, `PORT`) |
| Klasör | `order-service` |
| Veri | PostgreSQL `element_order_db`; tablolar: `orders`, `saga_state`, `outbox_messages`, `processed_messages` |
| Mesajlaşma | yayınlar: OrderSubmittedEvent, UpdateOrderStatusEvent, PaymentRequestedEvent, ShipmentRequestedEvent, AssetsCreditedEvent, OrderCompletedEvent, OrderStockReleaseEvent, PaymentRefundRequestedEvent · dinler: StockReservedEvent, StockReservationFailedEvent, PaymentProcessedEvent, PaymentFailedEvent, ShipmentDispatchedEvent, ShipmentFailedEvent |

## Ne işe yarar?

Element Market'te "satın al" düğmesine basınca bu servis çalışır. Müşteri bir elementi (ör. 10 g Fe) ya da bir bileşiğini (ör. NaCl) almak istediğinde siparişi bu servis alır, fiyatını hesaplar ve kaydeder. Sonra diğer servislerin adımlarını sırayla başlatır. Paranın (KREDI) defteri wallet-service'te, stok inventory-service'te tutulur. Bu servis yalnızca emir verir ve durumu izler.

Bir istek şöyle akar. Gateway `X-API-Key` anahtarını doğrular ve isteğe `INTERNAL_API_KEY` ile `X-User-Id` başlıklarını ekler. `POST /api/v1/orders` gövdeyi zod ile doğrular. `Idempotency-Key` başlığı varsa UUID olduğunu kontrol eder (küçük harfe çevrilir). Bu anahtarla kayıtlı bir sipariş varsa hiçbir kardeş servise gitmeden eski siparişi döner, böylece catalog/inventory kapalıyken de tekrar deneme çalışır. Yoksa catalog-service'ten anlık ask fiyatını, inventory-service'ten satılabilir gramı, compound-service'ten bileşiğin fiyat çarpanını (`priceMult`) alır. Toplamın 50.000 KREDI tavanını aşmadığını ve wallet bakiyesinin yettiğini kontrol eder. Sonra tek bir veritabanı işleminde (transaction) siparişi, saga satırını ve iki olayı (outbox) yazar ve 202 Accepted döner.

Gerisi arka planda olur. Outbox dağıtıcısı olayları RabbitMQ'ya basar. Inventory stoğu ayırır (`StockReservedEvent`), bu servis wallet'tan ödeme ister (`PaymentRequestedEvent`), wallet parayı çeker (`PaymentProcessedEvent`), bu servis kargo ister (`ShipmentRequestedEvent`), shipment gönderir (`ShipmentDispatchedEvent`) ve sipariş Completed olur. Durum sırası Submitted → StockReserved → Shipping → Completed şeklindedir. Herhangi bir adımda hata olursa sipariş Failed olur ve telafi olayları (stoğu bırak, parayı iade et) gönderilir.

Siparişin durum kuralları tek bir yerde durur: `Order` aggregate'i (`src/domain/order.ts`). Hangi olayın hangi durumda kabul edileceğine, siparişin hangi duruma geçeceğine ve hangi olayların (ödeme isteği, telafi vb.) yollanacağına o karar verir. Veritabanı, RabbitMQ veya HTTP bilmez, bu yüzden testleri veritabanısız ve milisaniyede çalışır. Katmanlar şöyledir: `src/domain` kuralları tutar; `src/application/orderSaga.ts` her kullanım durumunu (use case) tek bir veritabanı işleminde yürütür; RabbitMQ tüketicisi (`src/saga/orchestrator.ts`), zaman aşımı süpürücüsü ve HTTP rotaları yalnızca girdiyi çözer ve bu kullanım durumlarını çağırır. Sipariş verirken fiyat ve bakiye gibi ağ çağrıları işlemden önce yapılır; işlem içinde ağ çağrısı yoktur.

Failed bir siparişe geç gelen olay siparişi geri açmaz. Geç `StockReservedEvent` stoğu geri bıraktırır, geç `PaymentProcessedEvent` (ör. zaman aşımından sonra çekilen para) iadeyi yeniden ister. Her olay tek işlemde uygulanır: sipariş satırı kilitlenir ve mesaj kimliği `processed_messages` tablosuna yazılır. Aynı olay iki kez gelse bile etkisi bir kez olur. Bir durumda fazla kalan sagaları zaman aşımı süpürücüsü (timeout sweeper) Failed yapar. Outbox dağıtıcısı satırları 50'lik partiler hâlinde basar ve tüm parti için tek bir aracı onayı bekler. Parti doluysa beklemeden sıradakine geçer.

Servis kopan bağlantıyı kendisi onarmaz. PostgreSQL havuzu veya RabbitMQ bağlantısı/kanalı beklenmedik şekilde kapanırsa süreç kapanır ve Docker onu yeniden başlatır (saga mesajları bu sırada RabbitMQ'da bekler). `docker stop` (SIGTERM/SIGINT) gelince zamanlayıcıları durdurur, saga tüketicisini iptal eder, sonra HTTP sunucusunu, RabbitMQ'yu ve veritabanı havuzunu sırayla kapatır. 8 sn içinde bitmezse zorla çıkar.

Bu servisin yapmadıkları: gerçek tahsilat, KREDI defteri ve holdings (wallet), stok ayırma (inventory), bildirim gönderme (notification), katalog fiyatı üretme (catalog). Sağlık ve bilgi uçları (`/health*`, `/info`, `/api/v1`) gateway üzerinden yayınlanmaz; gateway bu servise yalnızca `/api/v1/orders/**` yolunu yönlendirir.

## Uç noktalar

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/health/live` | Herkese açık | Sürecin ayakta olduğunu söyler; bağımlılıklara bakmaz, hep 200 döner. |
| GET | `/health/ready` | Herkese açık | PostgreSQL ve RabbitMQ'yu yoklar; hepsi sağlıklıysa 200, değilse 503 döner. |
| GET | `/health` | Herkese açık | `/health/ready` ile aynı yanıtı verir (Docker sağlık kontrolü bunu kullanır). |
| GET | `/info` | Herkese açık | Servis adı, sürümü, ortamı ve ana bağlantıları döner. |
| GET | `/api/v1` | Herkese açık | Siparişler, arama, istatistik ve sağlık bağlantılarını listeleyen küçük keşif belgesi. |
| POST | `/api/v1/orders` | API anahtarı (gateway) + İç servis anahtarı + `X-User-Id` | Alış emri verir: 202 kabul, 200 aynı `Idempotency-Key` tekrarı, 400 geçersiz istek/fiyat yok, 402 bakiye yetersiz (`INSUFFICIENT_ELX`), 409 stok yetersiz veya anahtar başka siparişe ait. |
| GET | `/api/v1/orders` | API anahtarı (gateway) + İç servis anahtarı + `X-User-Id` | Kullanıcının en yeni 100 siparişini yeniden eskiye listeler (daha eskiler `/search` ile sayfalanır). |
| GET | `/api/v1/orders/search` | API anahtarı (gateway) + İç servis anahtarı + `X-User-Id` | `status`, `elementSymbol`, `q` (sipariş no veya sembolde arar, en fazla 64 karakter), `page`, `pageSize` (en fazla 100) ile filtreli ve sayfalı arama; `q` çok uzunsa veya sayfa değeri geçersizse 400. |
| GET | `/api/v1/orders/stats` | API anahtarı (gateway) + İç servis anahtarı + `X-User-Id` | Duruma göre sipariş sayıları, toplam sipariş ve harcanan toplam KREDI. |
| GET | `/api/v1/orders/{id}` | API anahtarı (gateway) + İç servis anahtarı + `X-User-Id` | Tek siparişi döner; başka kullanıcının siparişi veya geçersiz id için 404. |
| Herhangi | Tanımsız her yol | Herkese açık | problem+json biçiminde 404 (`Not found.`) döner; Express'in HTML "Cannot GET" sayfası gösterilmez. |

## Mesajlar

| Yön | Olay | Ne zaman | Ne yapar |
|---|---|---|---|
| Yayınlar | OrderSubmittedEvent | Sipariş kaydedildiğinde (`POST /api/v1/orders`) | inventory-service stoğu ayırır; catalog-service de dinler. |
| Yayınlar | UpdateOrderStatusEvent | Her durum değişikliğinde (Submitted, StockReserved, Shipping, Completed, Failed) | notification-service müşteriye durum bildirimi yollar. |
| Yayınlar | PaymentRequestedEvent | Sipariş StockReserved olduğunda (toplam ≤ 50.000 KREDI ise) | wallet-service tutarı müşterinin bakiyesinden çeker. |
| Yayınlar | ShipmentRequestedEvent | Ödeme onaylanıp sipariş Shipping olduğunda | shipment-service gönderiyi hazırlar. |
| Yayınlar | AssetsCreditedEvent | Sipariş Completed olduğunda | wallet-service alınan gramı müşterinin varlıklarına (holdings) ekler. |
| Yayınlar | OrderCompletedEvent | Sipariş Completed olduğunda | inventory-service ayrılan stoğu kesinleştirir; catalog-service de dinler. |
| Yayınlar | OrderStockReleaseEvent | Sipariş Failed olduğunda ve Failed siparişe geç gelen StockReservedEvent'te | inventory-service ayrılan stoğu geri bırakır (telafi). |
| Yayınlar | PaymentRefundRequestedEvent | Sipariş Failed olduğunda ve Failed siparişe geç gelen PaymentProcessedEvent'te | wallet-service çekilmiş KREDI varsa iade eder (telafi; wallet tarafında sipariş başına idempotent). |
| Dinler | StockReservedEvent | inventory stoğu ayırdığında | Submitted ise StockReserved'a geçer ve ödeme ister (tavan aşılırsa Failed); sipariş zaten Failed ise stoğu geri bıraktırır. |
| Dinler | StockReservationFailedEvent | inventory stok ayıramadığında | Submitted ise Failed yapar ve telafi olaylarını yollar. |
| Dinler | PaymentProcessedEvent | wallet tutarı çektiğinde | StockReserved ise Shipping'e geçer ve kargo ister; sipariş zaten Failed ise (ör. zaman aşımından sonra gelen tahsilat) durumu değiştirmeden iadeyi yeniden ister. |
| Dinler | PaymentFailedEvent | wallet tutarı çekemediğinde | StockReserved ise Failed yapar (sebep yoksa "Payment failed") ve telafi yollar. |
| Dinler | ShipmentDispatchedEvent | shipment gönderiyi çıkardığında | Shipping ise takip numarasını kaydeder, Completed yapar, AssetsCredited + OrderCompleted yollar. |
| Dinler | ShipmentFailedEvent | shipment gönderemediğinde | Shipping ise Failed yapar ve telafi olaylarını yollar. |

Olaylar MassTransit JSON zarfıyla taşınır; exchange adı `Element.Shared.Events:<OlayAdı>` biçimindedir (fanout). Dinlenen olaylar `order-service-saga` kuyruğuna bağlanır; 4 denemeden sonra hâlâ işlenemeyen mesajlar `order-service-saga_failed` kuyruğuna park edilir.

## Kod haritası

### `src/index.ts`
Uygulamanın giriş noktası: veritabanını, RabbitMQ tüketicisini, arka plan işçilerini ve HTTP sunucusunu başlatır.

| Fonksiyon | Ne yapar |
|---|---|
| `runHealthCheck(name, probe, healthyText, unhealthyText)` | Tek bir bağımlılık yoklamasının süresini ölçer; hata fırlatırsa sağlıksız sayar. |
| `checkHealth()` | PostgreSQL (`SELECT 1`) ve RabbitMQ kanalını yoklayıp toplu sağlık raporu üretir. |
| `retryOrPark(channel, message, err)` | Başarısız saga mesajını 1 sn bekleyip deneme sayacını artırarak yeniden kuyruğa (4 denemeden sonra `_failed` kuyruğuna) koyar; aracı onaylayınca orijinali ack'ler, olmazsa nack ile geri koyar. |
| `consumeSagaEvents(channel)` | Saga kuyruğundaki her mesajı orkestratöre verir; başarıda ack'ler, hatada `retryOrPark` çağırır; kapanışta iptal için tüketici etiketini (consumer tag) döner. |
| `main()` | Açılış sırası: PostgreSQL hazır olana kadar bekleme (`waitForDatabase`), tablo kurulumu, RabbitMQ bağlantısı, tüketici, outbox dağıtıcısı, zaman aşımı süpürücüsü, Express (helmet, 32 KB JSON sınırı, loglama, rotalar, JSON 404, hata yakalayıcı); SIGTERM/SIGINT için kapanış işleyicisini kaydeder. |
| `shutdown(signal)` (`main` içinde) | Zamanlayıcıları durdurur, saga tüketicisini iptal eder, HTTP sunucusunu, RabbitMQ'yu (`closeMessaging`) ve PostgreSQL havuzunu kapatıp 0 ile çıkar; hata olursa veya `SHUTDOWN_TIMEOUT_MS` (8 sn) dolarsa 1 ile çıkar. Yarıda kalan saga mesajları yeniden teslim edilir ve `processed_messages` sayesinde tekrar işlenmez. |

### `src/config.ts`
Ortam değişkenlerini bir kez okuyup `config` nesnesine koyar; üretimde zayıf iç anahtarla açılışı engeller.

| Fonksiyon | Ne yapar |
|---|---|
| `intFromEnv(name, fallback)` | Bir ortam değişkenini tam sayı olarak okur, yoksa varsayılanı kullanır. |
| (modül sonu kontrolü) | `NODE_ENV=production` iken `INTERNAL_API_KEY` 32 karakterden kısaysa veya geliştirme değeriyse hata fırlatıp servisi durdurur. |

### `src/meta.ts`
`package.json` dosyasından servis adı ve sürümünü okuyan `packageJson` sabitini dışa verir (fonksiyon yok).

### `src/observability.ts`
pino ile JSON loglama ve her HTTP isteği için korelasyon kimliği üretimi.

| Fonksiyon | Ne yapar |
|---|---|
| `requestLogger` (pino-http ara katmanı) | Her isteği yöntem, yol ve durum koduyla loglar; `/health` isteklerini atlar. |
| `genReqId(req)` | İstek kimliğini `x-request-id`, yoksa `x-correlation-id` başlığından alır, o da yoksa yenisini üretir. |
| `trimmedHeader(req, name)` | Bir başlık değerini boşlukları kırpılmış olarak döner. |
| `randomRequestId()` | Yalnızca log eşleştirme için kısa, rastgele bir kimlik üretir (kriptografik değildir). |

### `src/ops.ts`
Sağlık ve servis bilgisi uçlarını Express uygulamasına kaydeder.

| Fonksiyon | Ne yapar |
|---|---|
| `registerOpsEndpoints(app, checkHealth)` | `/health/live`, `/health/ready`, `/health` ve `/info` uçlarını ekler. |
| `respondWithDependencyHealth(req, res)` | Bağımlılık raporunu alır; hepsi sağlıklıysa 200, değilse 503 ile yanıtlar (`/health` ve `/health/ready` ortak kullanır). |
| `GET /health/live` işleyicisi | Bağımlılıklara bakmadan "Healthy" döner. |
| `GET /info` işleyicisi | Ad, sürüm, ortam ve bağlantı listesini döner. |

### `src/healthUi.ts`
Sağlık yanıtının biçimini (`status` + `checks`) tek yerde tanımlar.

| Fonksiyon | Ne yapar |
|---|---|
| `buildHealthResponse(checks)` | Yoklama sonuçlarını `{ status: "Healthy" \| "Unhealthy", checks: [{ name, ok, ms }] }` gövdesine çevirir. |

### `src/http.ts`
HTTP yardımcıları: async rota desteği, girdi doğrulayıcılar, problem+json hata yanıtı, son çare hata yakalayıcı ve diğer servislere JSON isteği.

| Fonksiyon | Ne yapar |
|---|---|
| `forwardErrors(handler)` | Bir rota işleyicisini sarar; fırlatılan hata veya reddedilen promise hata ara katmanına gider. |
| `asyncRouter()` | İşleyicileri async olabilen bir Express Router üretir (Express 4 bunu kendisi yapmaz). |
| `isUuid(value)` | Değerin UUID metni olup olmadığını söyler. |
| `isSymbol(value)` | Değerin 1–3 harfli element sembolü olup olmadığını söyler. |
| `isSlug(value)` | Değerin küçük harf/rakam/tireden oluşan, en fazla 64 karakterlik bir bileşik slug'ı olup olmadığını söyler. |
| `isQuantity(value)` | Gram miktarının 0,0001–1.000.000 aralığında ve en fazla 4 ondalıklı olduğunu kontrol eder. |
| `problem(res, status, detail, extra)` | `application/problem+json` hata yanıtı yollar; eski istemciler için aynı mesajı `error` alanına da koyar. |
| `httpErrorHandler(err, req, res, next)` | Bozuk JSON'u 400, çok büyük gövdeyi 413, diğer tüm hataları ayrıntı sızdırmadan 503 olarak yanıtlar; 503'te hatayı `res.err` üzerinden pino-http'ye verir, böylece yığın izi (stack) yalnızca sunucu logunda görünür. |
| `fetchJson(url, headers)` | Kardeş servise 5 sn zaman aşımlı GET atar; ağ hatası, zaman aşımı, 2xx olmayan yanıt veya bozuk JSON'da `null` döner. |

### `src/httpAuth.ts`
Müşteri uçlarının yetki kontrolü: iç servis anahtarı ve kullanıcı kimliği.

| Fonksiyon | Ne yapar |
|---|---|
| `readUserId(req)` | `X-User-Id` başlığını okur ve küçük harfe çevirir (PostgreSQL'in UUID metin biçimi; sahiplik karşılaştırmaları birebir tutar); geçerli UUID değilse `undefined` döner. |
| `requireUser(req, res)` | Önce iç anahtarı, sonra `X-User-Id`'yi ister; eksikse 401 yollayıp `null` döner. |
| `keysMatch(provided, expected)` | İki anahtarı sabit sürede (timing-safe) karşılaştırır; boş veya farklı uzunluktaki anahtarlar reddedilir. |
| `requireInternal(req, res)` | `INTERNAL_API_KEY` başlığı yapılandırılan anahtarla eşleşmezse 401 yollar. |

### `src/schemas.ts`
Sipariş isteği için zod şemaları.

| Fonksiyon | Ne yapar |
|---|---|
| `createOrderBodySchema` | `POST /api/v1/orders` gövdesini doğrular: `elementSymbol` (1–3 harf), `quantity` (0,0001–1.000.000 g, 4 ondalık), isteğe bağlı `compoundSlug`. |
| `idempotencyKeySchema` | `Idempotency-Key` başlığının UUID olmasını şart koşar (bu değer sipariş numarası olur). |

### `src/compoundPrice.ts`
Saf fiyat matematiği ve "saf element" slug sabiti (`ELEMENTAL_SLUG = "elemental"`).

| Fonksiyon | Ne yapar |
|---|---|
| `roundToFourDecimals(value)` | Tutarı veritabanının sakladığı 4 ondalığa yuvarlar. |
| `compoundLineElx(ask, priceMult, grams)` | Satır tutarını KREDI olarak hesaplar: ask × çarpan × gram; girdilerden biri pozitif değilse 0 döner (adındaki "Elx" eski isimdir). |

### `src/db/pool.ts`
PostgreSQL bağlantı havuzu ve açılışta tablo kurulumu.

| Fonksiyon | Ne yapar |
|---|---|
| `pool` `"error"` işleyicisi | Boştaki bir bağlantı koparsa (ör. PostgreSQL yeniden başladı) fatal loglayıp süreci sonlandırır; Docker yeniden başlatır, saga mesajları bu sırada denemelerini harcamadan RabbitMQ'da bekler. Yeniden başlayan süreç `waitForDatabase` ile veritabanını beklediği için bir kesinti tek bir yeniden başlatmaya mal olur, döngüye girmez. |
| `inTransaction(work)` | Verilen işi tek bağlantıda tek işlem olarak çalıştırır: iş biterse `COMMIT`, hata fırlatırsa `ROLLBACK`. Servisteki bütün yazma işlemleri bundan geçer. |
| `initDb()` | `orders`, `saga_state`, `outbox_messages`, `processed_messages` tablolarını, sonradan eklenen sütunları, iki kısmi indeksi (outbox, saga son tarihi) ve müşteri okumaları için `idx_orders_customer_created` (`customer_id, created_at DESC`) indeksini `IF NOT EXISTS` ile oluşturur; her açılışta güvenle çalışır. `orders` tablosuna `orders_valid` kısıtını (gram ve tutar sıfırdan büyük, durum beş geçerli durumdan biri) `NOT VALID` olarak ekler: yalnızca yeni yazmaları denetler, böylece eski bir satır açılışı durduramaz. |

### `src/db/startup.ts`
Açılışta PostgreSQL'i bekleyen yardımcılar. Sunucu yeniden başlarken Docker bütün konteynerleri aynı anda açar; Postgres hâlâ açılıyorsa servis çökmek yerine bekler.

| Fonksiyon | Ne yapar |
|---|---|
| `isTransientDbError(err)` | Hata "henüz ulaşılamaz ya da hazır değil" türündense doğru döner: Postgres açılıyor (57P03), bağlantı hataları (08 sınıfı), çok fazla bağlantı (53300), bağlantı reddi/kopması/zaman aşımı ve konteyner adının DNS'te henüz olmaması. Yanlış parola, eksik veritabanı ya da SQL hatası için yanlış döner; bunları beklemek düzeltmez. |
| `waitForDatabase(probe, options)` | Yoklamayı başarılı olana kadar çalıştırır; geçici hatalarda uyarı loglayıp bekler (varsayılan 30 × 2 sn). Kalıcı hatayı hemen, son denemeden sonra da geçici hatayı fırlatır; ardından Docker'ın yeniden başlatma kuralı devreye girer. |

### `src/db/orders.ts`
Sipariş deposu (repository): `Order` aggregate'ini satırdan kurar, kararlarını `orders`, `saga_state` ve outbox tablolarına yazar; müşteri okumalarını yapar. Karar vermez, yalnızca saklar ve yükler.

| Fonksiyon | Ne yapar |
|---|---|
| `deadlineForState(state)` | Saganın o durumda en geç ne zamana kadar kalabileceğini hesaplar; zaman aşımı olmayan durumlarda `null` döner. |
| `orderFromRow(row)` | Satırdan `Order` kurar. NUMERIC metinleri sayıya çevirir; sipariş en fazla 1.000.000 g ve 50.000 KREDI olduğundan değer en fazla 11 anlamlı basamaktır ve kayıpsız taşınır. |
| `createOrderWithSaga(order)` | Yeni yerleştirilen (`Order.place`) siparişi, saga satırını ve siparişin kaydettiği olayları (UpdateOrderStatus + OrderSubmitted) tek işlemde yazar; aynı id varsa hiçbir şey yazmadan `false` döner. |
| `lockOrder(client, orderId)` | Siparişi `FOR UPDATE` ile kilitleyerek `Order` olarak yükler; aynı siparişin kararları paralel çalışamaz. Yoksa `undefined`. |
| `saveOrder(client, order)` | Çağıranın işlemi içinde siparişin kararını yazar: durum değiştiyse sipariş durumunu, takip numarasını ve saga satırını (yeni son tarih ve hata sebebiyle), sonra kaydedilen her olayı outbox'a. |
| `findExpiredSagas()` | Son tarihi geçmiş ve bitmemiş sagaları (sipariş no + durum) listeler. |
| `isSagaStillExpired(client, orderId, state)` | İşlem içinde saga satırını kilitleyip saganın hâlâ aynı durumda ve süresi geçmiş olduğunu doğrular; arada bir olay siparişi ilerlettiyse `false`. |
| `getOrderById(id)` | Tek siparişi getirir, yoksa `null`. |
| `getOrdersByCustomer(customerId)` | Müşterinin en yeni 100 siparişini yeniden eskiye getirir (sınırlı yanıt; daha eskiler arama ile). |
| `getOrderStatsByCustomer(customerId)` | Duruma göre sipariş sayısını, toplam sayıyı ve harcanan toplamı hesaplar. |

### `src/db/orderSearch.ts`
Müşteri siparişlerinde filtreli ve sayfalı arama (`DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 100`).

| Fonksiyon | Ne yapar |
|---|---|
| `searchOrdersByCustomer(params)` | Durum, sembol ve serbest metinle filtreler, toplam eşleşme sayısını ve istenen sayfayı döner; tüm değerler SQL parametresi olarak bağlanır. |
| `addValue(value)` | Bir değeri parametre listesine ekleyip `$n` yer tutucusunu döner (fonksiyon içi yardımcı). |

### `src/db/outbox.ts`
Transactional outbox ve tekrar eden mesaj kaydı (`processed_messages`).

| Fonksiyon | Ne yapar |
|---|---|
| `enqueueOutboxEvent(client, messageType, payload)` | Olayı çağıranın işlemi içinde outbox tablosuna yazar; işlem commit olursa dağıtıcı onu daha sonra yayınlar. `created_at` için `clock_timestamp()` kullanır: `NOW()` işlemin başlangıç anı olduğundan aynı işlemdeki satırlar eşit kalır ve dağıtıcı onları karışık sırayla (ör. Failed'ı StockReserved'dan önce) basabilirdi. |
| `fetchPendingOutbox(limit)` | Henüz yayınlanmamış outbox satırlarını en eskiden başlayarak getirir. |
| `markOutboxPublished(ids)` | RabbitMQ onayından sonra bir partideki tüm satırları tek `UPDATE` ile yayınlandı olarak işaretler. |
| `tryMarkMessageProcessed(client, messageId, eventType, orderId)` | Mesaj kimliğini kaydeder; daha önce kaydedildiyse `false` döner (tekrar teslim, atlanmalı). |

### `src/messaging/massTransit.ts`
.NET servislerinin anladığı MassTransit zarf biçimi ve olay adları (`MessageType`).

| Fonksiyon | Ne yapar |
|---|---|
| `exchangeName(type)` | Olayın fanout exchange adını üretir: `Element.Shared.Events:<Olay>`. |
| `messageUrn(type)` | Zarfa ve başlığa yazılan `urn:message:...` kimliğini üretir. |
| `wrapEnvelope(type, message, messageId)` | Yükü MassTransit JSON zarfına sarar; `messageId` outbox satır kimliğidir. |
| `parseEnvelope(body)` | Gelen zarfı çözer: mesaj kimliği, kısa olay adı ve yük; zarfsız düz JSON'da tüm gövdeyi yük sayar. |
| `wrapHeaders(type)` | `MT-Message-Type` ve `Content-Type` AMQP başlıklarını üretir. |

### `src/messaging/bus.ts`
RabbitMQ bağlantısı, saga kuyruğu ve exchange bağlamaları; park kuyruğu adını `FAILED_SAGA_QUEUE` (`order-service-saga_failed`) olarak dışa verir.

| Fonksiyon | Ne yapar |
|---|---|
| `onBrokerError(message)` | Bağlantıyı kopuk işaretler ve hatayı loglar. |
| `onBrokerClose(err)` | Bağlantı/kanal beklenmedik şekilde kapanınca fatal loglayıp süreci sonlandırır; Docker servisi temiz bağlantıyla yeniden başlatır. `closeMessaging` ile bilerek kapatılırken hiçbir şey yapmaz. |
| `connectMessaging()` | Onaylı (confirm) kanal açar, saga ve `_failed` kuyruklarını kurar, saga kuyruğunu dinlenen olayların exchange'lerine bağlar. |
| `getChannel()` | Açık kanalı döner; bağlantı yoksa hata fırlatır (sağlık kontrolü bunu kullanır). |
| `closeMessaging()` | Kapanışta bağlantıyı bilerek kapatır; kapanma işleyicileri bunu hata saymaz. |

### `src/messaging/outboxDispatcher.ts`
Outbox tablosundaki olayları belirli aralıklarla RabbitMQ'ya basan arka plan işçisi.

| Fonksiyon | Ne yapar |
|---|---|
| `dispatchOutboxBatch()` | En fazla 50 (`OUTBOX_BATCH_SIZE`) bekleyen satırı sırayla yayınlar, tüm parti için tek seferde aracı onayını bekler ve satırları birlikte yayınlandı olarak işaretler; gönderilen satır sayısını döner. Bir ret (nack) olursa işaretlemeden hata fırlatır, parti yeniden gönderilir (tüketiciler `messageId` = outbox id ile tekrarı ayıklar). |
| `publishOutboxRow(channel, row)` | Tek satırı kuyruğa ya da fanout exchange'e kalıcı (persistent) mesaj olarak gönderir; her exchange'i süreç başına yalnızca bir kez tanımlar (assert). |
| `startOutboxDispatcher()` | `OUTBOX_POLL_MS` aralığıyla dağıtımı çalıştırır; parti dolu geldikçe beklemeden sıradakini basar, önceki tur bitmeden yenisini başlatmaz. Kapanışta durdurulabilmesi için zamanlayıcıyı döner. |

### `src/routes/apiInfo.ts`
`GET /api/v1` keşif belgesi.

| Fonksiyon | Ne yapar |
|---|---|
| `GET /` işleyicisi | Sipariş, arama, istatistik, sağlık ve bilgi bağlantılarını ve sürümü döner. |

### `src/routes/orders.ts`
Müşteri sipariş uçları (`/api/v1/orders`).

| Fonksiyon | Ne yapar |
|---|---|
| `fetchWalletBalance(customerId)` | wallet-service'ten KREDI bakiyesini (`balanceElx`) sorar; yanıt alınamazsa `null` döner ve sipariş devam eder. |
| `requestedCompoundSlug(compoundSlug, elementSymbol)` | İstenen bileşik slug'ını döner; "elemental", yalın sembol ("fe") ve "elemental-<sembol>" yazımlarını `null` (saf element) sayar. Takma adlar `resolveCompound` ile aynıdır, böylece saf element siparişinin tekrarı 409 değil 200 alır. |
| `isSameOrderRequest(existing, request)` | Kayıtlı siparişin aynı müşteri, sembol, gram ve bileşikle oluşturulup oluşturulmadığını kontrol eder. |
| `replayExistingOrder(res, existing, request)` | Tekrar kullanılan `Idempotency-Key` için aynı istekse 200 ile eski siparişi, farklıysa 409 döner. |
| `isOptionalIntInRange(value, max)` | Sorgu değeri yoksa veya 1 ile `max` arasında tam sayıysa `true` döner. |
| `stringOrUndefined(value)` | Sorgu değeri metinse onu, değilse `undefined` döner. |
| `mapOrder(row)` | Veritabanı satırını herkese açık sipariş JSON'una çevirir; eski satırlarda ürün etiketini formül/sembol + gramdan üretir. |
| `POST /` | Gövdeyi ve `Idempotency-Key`'i doğrular, kayıtlı siparişi kardeş servislere gitmeden yeniden oynatır (replay); değilse fiyatlar, stok/tavan (`isOrderTotalAllowed`)/bakiye kontrolü yapar, siparişi `Order.place` ile kurar, `createOrderWithSaga` ile kaydeder ve sagayı başlatır (202). |
| `GET /search` | `q` uzunluğunu (en fazla 64, `MAX_SEARCH_QUERY_LENGTH`) ve sayfa değerlerini doğrular, filtreli ve sayfalı arama sonucunu döner. |
| `GET /stats` | Kullanıcının sipariş istatistiklerini döner. |
| `GET /:id` | Kullanıcının tek siparişini döner; yoksa veya başkasınınsa 404. |
| `GET /` | Kullanıcının en yeni 100 siparişini döner. |

### `src/domain/order.ts`
`Order` aggregate'i: bir siparişin durumu ve onu değiştiren kurallar. Saf TypeScript; veritabanı, RabbitMQ veya HTTP içe aktarmaz. Durum yalnızca `place`, `apply` ve `expire` ile değişir ve bunlar `sagaTransitions.ts` matrisini kullanır, kurallar başka yerde tekrar yazılmaz. Koruduğu kurallar: yalnızca izinli geçişler; Completed ve Failed son durumdur (geri açılmaz); Failed'a tek yoldan girilir ve telafi (stok bırakma + iade) yalnızca o geçişle bir kez yollanır; Failed siparişe geç gelen rezervasyon veya tahsilat yalnızca kendi telafisini alır; yeni siparişte gram sıfırdan büyük, tutar sıfırdan büyük ve 50.000 KREDI tavanı içindedir. Her karar giden olaylarını `events` listesine ekler; uygulama katmanı bunları aynı işlemde outbox'a yazar.

| Fonksiyon | Ne yapar |
|---|---|
| `isOrderTotalAllowed(total)` | Tutar sıfırdan büyük ve tavan içindeyse (`paymentDecision`) `true` döner; HTTP rotası 400 yanıtı için, `Order.place` koruma için kullanır. |
| `Order.place(facts)` | Yeni siparişi Submitted durumunda kurar ve UpdateOrderStatus + OrderSubmitted olaylarını kaydeder; gram veya tutar geçersizse `InvalidOrderError` fırlatır. |
| `Order.restore(facts, status, trackingNumber)` | Depodan yüklenen siparişi kurar; yeniden doğrulamaz, böylece eski bir satır da sagasını bitirebilir. |
| `apply(eventType, details)` | Saga olayını uygular: StockReserved'da ödeme ister (tavan aşılırsa Failed), PaymentProcessed'da kargo ister, ShipmentDispatched'da takip numarasını alıp Completed yapar ve AssetsCredited + OrderCompleted kaydeder, hata olaylarında Failed yapar (PaymentFailed sebepsizse "Payment failed"). Duruma uymayan (geç, tekrar, sırasız) olayda hiçbir şey değişmez. |
| `expire()` | Son tarihi geçen sagayı "Saga timed out in state …" sebebiyle Failed yapar ve telafi kaydeder; bitmiş siparişte `false` döner. Bu durum olayında `trackingNumber` alanı yoktur (eskiden de yoktu). |
| `statusChanged` / `failureReason` | Durumun değişip değişmediğini (kaydedilmesi gerekip gerekmediğini) ve bu işlemde verilen hata sebebini söyler. |

### `src/domain/sagaTransitions.ts`
Saga geçiş matrisi, saf fonksiyonlar olarak. `Order` aggregate'i kararlarını bunlarla verir; kural yalnızca burada yazılıdır.

| Fonksiyon | Ne yapar |
|---|---|
| `sagaAccepts(status, eventType)` | Bu durum + olay çifti için bir şey yapılıp yapılmadığını söyler (Failed + StockReserved/PaymentProcessed telafi için kabul edilir). |
| `sagaNextStatus(status, eventType)` | Olaydan sonraki ana durumu döner; geçiş yoksa `null` (telafi olayları Failed siparişi canlandırmaz). |
| `sagaCanTimeOut(status)` | Başka bir servisi bekleyen (son tarihi olan) durumlarda `true`: Submitted, StockReserved, Shipping. |

### `src/domain/paymentDecision.ts`
Kredi tavanı kuralı (`CREDIT_LIMIT = 50.000` KREDI, dahil).

| Fonksiyon | Ne yapar |
|---|---|
| `paymentDecision(amount)` | Tutar sonlu ve tavan içindeyse `"ok"`, değilse `"limit"` döner. |

### `src/application/orderSaga.ts`
Saga kullanım durumları. Her biri tek bir veritabanı işlemidir (`inTransaction`) ve sırası hep aynıdır: siparişi kilitle, yükle, `Order` karar versin, durumu ve olayları birlikte yaz. Ya hepsi kaydedilir ya hiçbiri.

| Fonksiyon | Ne yapar |
|---|---|
| `applySagaEvent(event)` | Siparişi kilitler, mesaj kimliğini `processed_messages` tablosuna yazar (tekrar teslimse burada durur), olayı `Order.apply` ile uygular ve `saveOrder` ile kaydeder. Bilinmeyen siparişin olayını yok sayar. |
| `expireSaga(orderId, state)` | Siparişi kilitler, saganın hâlâ aynı durumda ve süresi geçmiş olduğunu tekrar kontrol eder (arada gelen bir olay kazanır), `Order.expire` ile Failed yapar ve kaydeder; başarısız yaptıysa `true` döner. |

### `src/saga/orchestrator.ts`
RabbitMQ'dan gelen saga mesajının adaptörü: mesajı çözer ve `applySagaEvent` kullanım durumuna verir. Karar vermez.

| Fonksiyon | Ne yapar |
|---|---|
| `orderIdOf(message)` | Yükten sipariş numarasını (`orderId` veya `OrderId`) okur; UUID değilse yok sayar. |
| `reasonOf(message)` | Yükten hata sebebini (`reason` veya `Reason`) okur. |
| `trackingNumberOf(message)` | Yükten takip numarasını (`trackingNumber` veya `TrackingNumber`) okur. |
| `parseSagaEvent(body)` | Mesajı olay türü, mesaj kimliği, sipariş numarası, sebep ve takip numarasıyla çözer; kullanılamazsa `null`; mesaj kimliği yoksa olay türü + sipariş numarasından sabit bir kimlik (UUID v5) türetir. |
| `handleSagaMessage(body)` | Mesajı çözer ve `applySagaEvent` ile uygular; kullanılamayan mesajı sessizce bırakır (çağıran ack'ler). |

### `src/saga/timeoutSweeper.ts`
Bir durumda süresinden fazla kalan sagaları Failed yapan arka plan işçisi.

| Fonksiyon | Ne yapar |
|---|---|
| `sweepExpiredSagas()` | Süresi geçmiş sagaları `findExpiredSagas` ile bulur, her birini ayrı işlemde başarısız yapar; bulunan (başarısız yapılan değil) saga sayısını döner. |
| `failExpiredSaga(orderId, state)` | Tek sagayı `expireSaga` kullanım durumuyla başarısız yapar; hatayı loglar, fırlatmaz, böylece bozuk bir sipariş süpürmeyi durdurmaz. |
| `startTimeoutSweeper()` | Süpürmeyi `SAGA_SWEEP_MS` aralığıyla çalıştırır. |

### `src/services/priceResolver.ts`
catalog, inventory ve compound servislerinden fiyat, stok ve bileşik bilgisini toplar.

| Fonksiyon | Ne yapar |
|---|---|
| `quotesFromLast(last)` | Son fiyattan varsayılan spread ile bid/ask üretir; stok 0 kabul edilir (satış yapılmaz). |
| `resolveTicker(symbol)` | catalog'dan fiyatı, inventory'den satılabilir gramı alır; pozitif son fiyat yoksa `null` döner. |
| `resolveAvailableStock(symbol)` | inventory'den satılabilir gramı alır; cevap yoksa `null` (o zaman catalog'un rakamı kullanılır). |
| `isPureElementSlug(slug, upperSymbol)` | Slug'ın saf elementi ("elemental", "fe", "elemental-fe") gösterip göstermediğini söyler. |
| `resolveCompound(symbol, slug)` | Bileşiği ve fiyat çarpanını bulur; saf element için çarpan 1; bilinmeyen, ana elementi belirtilmemiş veya başka elemente ait ya da geçersiz çarpanlı bileşikte `null` (çarpan ana elementin ask fiyatına göredir, bu yüzden ana elementi olmayan bileşik reddedilir). |

### `src/http.validation.test.ts`
`keysMatch`, `createOrderBodySchema`, `idempotencyKeySchema`, `problem` (problem+json) ve `isQuantity` için birim testleri.

### `src/domain/order.test.ts`
`Order` aggregate'inin kurallarını veritabanısız test eder (önce bu testler yazıldı, sonra kod): yeni siparişin Submitted başlaması ve olayları, tutar/gram sınırları, ödeme ve kargo isteği, tavan aşımında Failed, takip numarasıyla Completed, hata olaylarında tek telafi, Failed siparişe geç gelen rezervasyon/tahsilatın yalnızca kendi telafisini alması, bayat ve son durum sonrası olayların hiçbir şey değiştirmemesi, her durum × olay çiftinde geçiş matrisine uyulması ve zaman aşımı.

### `src/domain/paymentDecision.test.ts`
Kredi tavanının dahil olduğunu, tavan üstü ve sonsuz/NaN tutarların reddedildiğini test eder.

### `src/routes/orders.test.ts`
Sipariş rotalarını yerel bir Express sunucusunda, kardeş servis çağrılarını (global `fetch`) sahteleyip sayarak test eder: iç anahtar olmadan 401, geçersiz `Idempotency-Key`'in hiçbir fiyat çağrısından önce 400 alması, 64 karakteri aşan `q` için 400; ayrıca `resolveCompound`'un bileşiği yalnızca kendi ana elementiyle fiyatladığını ve ana element yoksa `null` döndüğünü doğrular.

### `src/domain/sagaTransitions.test.ts`
Mutlu yolu (Submitted → StockReserved → Shipping → Completed), hata geçişlerini, bayat olayların reddini, Failed siparişe geç gelen rezervasyon/tahsilatın siparişi canlandırmadan telafi edildiğini ve yalnızca bekleyen durumların zaman aşımına uğradığını test eder.

### `src/domain/paymentDecision.check.ts`
`paymentDecision` için assert tabanlı hızlı kontrol betiği (`npm run check`).

### `src/compoundPrice.check.ts`
Hızlı kontrol betiği (`npm run check`).

| Fonksiyon | Ne yapar |
|---|---|
| `main()` | `compoundLineElx` için saf element, bileşik ve hatalı girdi örneklerini doğrular. |

### `src/http.check.ts`
`asyncRouter` + `httpErrorHandler` ikilisinin async hatada 503 dönüp ayrıntı sızdırmadığını ve `isQuantity`'nin hatalı değerleri reddettiğini gerçek bir yerel sunucuyla doğrulayan betik (`npm run check`).

### `src/saga.integration.check.ts`
Gerçek yerel PostgreSQL üzerinde, geçici bir şemada saga senaryolarını çalıştıran entegrasyon kontrolü: ödeme isteği, tek iade, geç tamamlanma, zaman aşımı, tek AssetsCredited, zaman aşımından sonra gelen tahsilatın iadeyi yeniden istemesi, aynı sipariş numarasının iki kez kaydedilmemesi, tavan aşımında Failed ve outbox'ta durum olaylarının karar sırasıyla durması, outbox yazımı başarısız olunca durumun ve `processed_messages` kaydının da geri alınması (ve tekrar teslimin başarması), veritabanının bilinmeyen bir durumu reddetmesi. Şema sonunda silinir; çalışan sisteme veri bırakmaz.

| Fonksiyon | Ne yapar |
|---|---|
| `check(name, test)` | Bir doğrulamayı çalıştırır, sayacı artırır ve `PASS` yazar. |
| `event(type, orderId, messageId)` | Test için MassTransit zarflı saga olayı üretir. |
| `place(facts)` | Test siparişini `Order.place` + `createOrderWithSaga` ile kaydeder. |
| `outboxCount(type, orderId)` | Bir siparişin outbox'ta belirli türdeki olay sayısını döner. |

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `PORT` | `8080` | HTTP sunucusunun dinlediği port. |
| `NODE_ENV` | (boş → `development`) | `production` iken zayıf `INTERNAL_API_KEY` ile açılış engellenir; `/info` yanıtında ortam olarak görünür. |
| `LOG_LEVEL` | `info` | pino log seviyesi. |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/element_order_db` | PostgreSQL bağlantı adresi. |
| `RABBITMQ_HOST` | `localhost` | RabbitMQ sunucusu. |
| `RABBITMQ_PORT` | `5672` | RabbitMQ portu. |
| `RABBITMQ_USERNAME` | `guest` | RabbitMQ kullanıcı adı. |
| `RABBITMQ_PASSWORD` | `<yerel-varsayılan>`| RabbitMQ parolası. |
| `CATALOG_SERVICE_URL` | `http://localhost:5002` | Fiyat (ticker) için catalog-service adresi. |
| `COMPOUND_SERVICE_URL` | `http://localhost:5007` | Bileşik çarpanı için compound-service adresi. |
| `WALLET_SERVICE_URL` | `http://localhost:5005` | Bakiye ön kontrolü için wallet-service adresi. |
| `INVENTORY_SERVICE_URL` | `http://localhost:5008` | Satılabilir gram için inventory-service adresi. |
| `INTERNAL_API_KEY` | `<yerel-varsayılan>` | Servisler arası paylaşılan anahtar; gelen isteklerde zorunlu, wallet çağrısında gönderilir; üretimde en az 32 karakter ve benzersiz olmalı. |
| `MARKET_SPREAD_PCT` | `0.008` | catalog spread vermediğinde kullanılan varsayılan alış/satış makası. |
| `OUTBOX_POLL_MS` | `500` | Outbox dağıtıcısının tarama aralığı (ms). |
| `SAGA_SWEEP_MS` | `5000` | Zaman aşımı süpürücüsünün çalışma aralığı (ms). |
| `SAGA_TIMEOUT_SUBMITTED_SEC` | `120` | Submitted durumunda en fazla bekleme (sn). |
| `SAGA_TIMEOUT_STOCK_RESERVED_SEC` | `120` | StockReserved durumunda en fazla bekleme (sn). |
| `SAGA_TIMEOUT_SHIPPING_SEC` | `180` | Shipping durumunda en fazla bekleme (sn). |

Kuyruk adı `order-service-saga` sabittir (ortam değişkeni değildir). docker-compose bu servise `REDIS_URL` de verir, ancak kod bu değişkeni okumaz. Docker imajı (`order-service/Dockerfile`) yalnızca üretim bağımlılıklarını kurar (npm önbelleği silinir) ve root olmayan `node` kullanıcısıyla çalışır; sağlık kontrolü taban imajdaki busybox `wget`'i kullanır.

## Testler

- Birim testleri: `src/domain/order.test.ts`, `src/domain/sagaTransitions.test.ts`, `src/domain/paymentDecision.test.ts`, `src/http.validation.test.ts`, `src/routes/orders.test.ts` (Node yerleşik test koşucusu, 33 test). `Order` aggregate'inin kurallarını, saga geçiş matrisini (geç telafiler ve zaman aşımı dahil), kredi tavanını, anahtar karşılaştırmayı, istek şemalarını, problem+json biçimini, gram hassasiyetini, rota korumalarını (iç anahtar, `Idempotency-Key`, `q` uzunluğu) ve bileşik fiyatlama korumasını doğrular. Alan (domain) kuralları önce test yazılarak geliştirilir.
- Hızlı kontroller: `src/domain/paymentDecision.check.ts`, `src/compoundPrice.check.ts`, `src/http.check.ts`. Kredi tavanını, satır fiyat hesabını ve async hata yakalamayı doğrular.
- Entegrasyon kontrolü: `src/saga.integration.check.ts` (11 kontrol, `deploy/scripts/test-saga.ps1` çalıştırır). Yalnızca yerel bir PostgreSQL ile çalışır (`localhost`/`127.0.0.1` dışını reddeder), geçici bir şema açıp sonunda siler; RabbitMQ gerekmez. İşlem garantilerini (durum, gelen kutusu ve outbox'ın birlikte yazılması veya birlikte geri alınması) gerçek veritabanında kanıtlar.

Çalıştırma:

```bash
cd order-service
npm ci
npm test            # birim testleri
npm run check       # hızlı kontroller
npx tsc --noEmit    # tip kontrolü (npm run build de derler)

# Entegrasyon (yerel PostgreSQL gerekir):
DATABASE_URL=postgres://postgres:postgres@localhost:5432/element_order_db npx tsx src/saga.integration.check.ts
```
