# Stok servisi (inventory-service)

> Her element sembolü için rafta kaç gram olduğunu tutar. Siparişe stok ayırır, sipariş başarısız olunca bırakır, tamamlanınca kalıcı olarak düşer. Masadan satılan gramları stoğa geri koyar.

| Özellik | Değer |
|---|---|
| Teknoloji | Java 21, Spring Boot 3.4 (Web, JDBC, AMQP, Actuator) |
| Port | `5008` (konteyner içinde `8080`) |
| Klasör | `inventory-service` |
| Veri | PostgreSQL `element_inventory_db` (tablolar: `stock_items`, `stock_reservations`, `processed_messages`, `outbox`) |
| Mesajlaşma | yayınlar: StockReservedEvent, StockReservationFailedEvent · dinler: OrderSubmittedEvent, OrderStockReleaseEvent, OrderCompletedEvent, ElementSoldEvent |

## Ne işe yarar?

"Bu elementten şu an kaç gram satılabilir?" sorusunun cevabı bu servistedir. Her sembol için toplam stok (`stock_grams`) ve siparişlere ayrılmış miktar (`reserved_grams`) tutulur. Satılabilir miktar ikisinin farkıdır. Bir sembol ilk kez yazıldığında (ilk rezervasyon ya da masadan geri stoklama) simülasyon için varsayılan 100.000 g stok kendiliğinden yazılır. Herkese açık `GET` ucu yalnız okur: satır yazmaz, kilit almaz. Hiç görülmemiş bir sembol için varsayılan başlangıç stoğunu (rezerv 0) raporlar.

Sipariş akışı şöyledir. Sipariş servisi `OrderSubmittedEvent` yayınlar. Stok yeterliyse bu servis miktarı ayırır ve `StockReservedEvent` yayınlar; yetmiyorsa `StockReservationFailedEvent` yayınlar. Sipariş başarısız olur ya da zaman aşımına uğrarsa `OrderStockReleaseEvent` gelir ve ayrılan miktar geri bırakılır. Sipariş tamamlanınca `OrderCompletedEvent` gelir. Bu durumda olayın taşıdığı değer değil, rezervasyon satırında kayıtlı sembol ve miktar hem rezervden hem toplam stoktan kalıcı olarak düşülür. Kullanıcı cüzdan servisinden masaya geri satış yaptığında `ElementSoldEvent` gelir ve gramlar stoğa geri eklenir.

`stock_reservations` tablosunda her sipariş için tek satır vardır. Durumu `Reserved` iken `Released` ya da `Fulfilled` olur, bir daha geri dönmez. Yani bir sipariş en fazla bir kez ayrılır, en fazla bir kez bırakılır ya da düşülür. Serbest bırakma isteği ayırmadan önce gelse bile 0 gramlık bir `Released` satırı yazılır; böylece geç gelen sipariş olayı stoğu sonsuza kadar kilitleyemez. Masadan satışlar da aynı tabloya `Sold` satırı olarak yazılır, bu yüzden aynı satış stoğa iki kez eklenmez.

Temel kural şudur: stok hiç eksiye düşmez ve ayrılan miktar stoktan fazla olamaz (satılabilir miktar hiç negatif olmaz, fazla satış olmaz). Bu kural kodda tek yerde, `StockItem` sınıfındadır. Veritabanı da aynı kuralı CHECK kısıtıyla ayrıca uygular; kod yanlış olsa bile bozuk satır yazılamaz. Gram miktarları JSON'dan `BigDecimal` olarak okunur, hiçbir yerde `double`'a çevrilmez (yalnız `GET` yanıtındaki sayılar eski biçimi korumak için).

Gelen her mesaj tek bir veritabanı işleminde (transaction) işlenir ve `processed_messages` tablosuna bir kez yazılır. Önce rezervasyon satırı, sonra stok satırı kilitlenir (`FOR UPDATE`); aynı sembole aynı anda gelen siparişler sırayla karar verir, bu yüzden aynı gramlar iki siparişe ayrılamaz. Stok değişikliği, rezervasyon satırı ve giden yanıt olayı (outbox satırı) bu işlemde birlikte commit edilir ya da birlikte geri alınır. `OutboxRelay` commit edilmiş olayları en eskiden başlayarak RabbitMQ'ya yollar, broker onayını (publisher confirm) bekler ve ancak ondan sonra satırı yayınlandı diye işaretler. Onaydan sonra çökme olursa satır aynı `messageId` ile yeniden yollanır; alıcılar bunu tekrar olarak atar. Teslim en az bir kezdir, kayıp yoktur. Aynı mesaj ikinci kez gelirse sessizce atlanır. İşlem yarıda kalırsa işaret de geri alınır ve yeniden teslim gerçekten uygulanır. Bozuk JSON, geçersiz UUID, negatif gram ya da sembolsüz masa satışı taşıyan mesaj yeniden kuyruğa alınmadan düşürülür. Diğer hatalarda mesaj 5 kez denenir; bekleme 1 sn'den başlar ve her seferinde ikiye katlanır. Yine olmazsa mesaj `inventory-service_failed` kuyruğuna park edilir. RabbitMQ yeniden başlarken dinleyici durmaz, bağlanmayı denemeye devam eder.

Bu servis KREDI düşmez (wallet-service), sipariş durumunu yazmaz (order-service), fiyatı değiştirmez ve bilimsel element bilgisini tutmaz (catalog-service). Katalog ticker'ındaki `availableStock` yalnız gösterim içindir. Sipariş ön kontrolü ve saga rezervasyonu bu servise bakar.

## Uç noktalar

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/api/v1/stock/{symbol}` | Herkese açık | 1-3 harfli sembol için `{symbol, stockGrams, reservedGrams, availableGrams}` döner; salt okumadır, satır yazmaz ve kilit almaz. Sembol hiç yoksa varsayılan başlangıç stoğunu (rezerv 0) raporlar. Geçersiz sembolde 400 döner. |
| GET | `/health` | Herkese açık | PostgreSQL ve RabbitMQ'yu yoklar; ikisi de ayaktaysa 200, değilse 503 döner. |
| GET | `/health/ready` | Herkese açık | `/health` ile aynıdır (hazır olma kontrolü). |
| GET | `/health/live` | Herkese açık | Sürecin ayakta olduğunu bağımlılık kontrolü yapmadan bildirir. |
| GET | `/info` | Herkese açık | Servis adı, sürümü ve bağlantıları döner. |
| GET | `/actuator/health`, `/actuator/info` | Herkese açık | Spring Boot Actuator'ın standart sağlık ve bilgi uçları. |

Not: Kapı (gateway) `/api/v1/stock/**` isteklerini API anahtarı istemeden buraya iletir. Sipariş servisi de sipariş öncesi ön kontrol için aynı ucu doğrudan çağırır.

## Mesajlar

| Yön | Olay | Ne zaman | Ne yapar |
|---|---|---|---|
| Dinler | `OrderSubmittedEvent` | Yeni bir sipariş oluşturulduğunda. | Sembol ve pozitif miktar varsa stoğu ayırır; sonucu aşağıdaki iki olaydan biriyle bildirir. |
| Yayınlar | `StockReservedEvent` | Stok ayrıldığında (ya da bu sipariş için zaten ayrılmışsa). | Sipariş servisinin ödeme adımına geçmesini sağlar (`{orderId}`). |
| Yayınlar | `StockReservationFailedEvent` | Miktar geçersizse ya da satılabilir stok yetmiyorsa. | Siparişin başarısız sayılmasını sağlar (`{orderId, reason}`; örnek: `Insufficient stock. Available: 12.5000g.`). |
| Dinler | `OrderStockReleaseEvent` | Sipariş başarısız olduğunda ya da zaman aşımına uğradığında. | Ayrılmış miktarı rezervden geri alır; ayırma henüz yoksa `Released` satırı yazar. |
| Dinler | `OrderCompletedEvent` | Sevkiyat tamamlanıp sipariş `Completed` olduğunda. | Rezervasyon satırındaki sembol ve miktarı (olaydaki değerleri değil) toplam stoktan ve rezervden kalıcı olarak düşer, durumu `Fulfilled` yapar. |
| Dinler | `ElementSoldEvent` | Kullanıcı cüzdan servisinde masaya geri satış yaptığında. | Satılan gramları stoğa geri ekler; aynı satışı ikinci kez eklemez. |

Tüm olaylar MassTransit zarfıyla, `Element.Shared.Events:<OlayAdı>` adlı fanout exchange'ler üzerinden taşınır. Servis kendi `inventory-service` kuyruğunu dinlediği dört exchange'e bağlar. Yanıt olayları stok değişikliğiyle aynı işlemde outbox'a yazılır ve relay tarafından yayınlanır; `messageId` outbox satırının kimliğidir. 5 denemede (≈15 sn backoff) işlenemeyen mesajlar `inventory-service_failed` kuyruğuna taşınır; RabbitMQ arayüzünden incelenip geri taşınabilir.

## Kod haritası

### `inventory-service/src/main/java/com/elementmarket/inventory/InventoryApplication.java`
Spring Boot uygulamasını başlatan giriş noktası.

| Fonksiyon | Ne yapar |
|---|---|
| `main(args)` | Stok servisini ayağa kaldırır. |

### `inventory-service/src/main/java/com/elementmarket/inventory/config/RabbitConfig.java`
RabbitMQ kuyruklarını (`inventory-service`, `inventory-service_failed`), dinlenen exchange'leri, bağlamaları ve yeniden deneme sonrası park etmeyi tanımlar.

| Fonksiyon | Ne yapar |
|---|---|
| `inventoryQueue()` | Kalıcı `inventory-service` kuyruğunu oluşturur. |
| `inventoryFailedQueue()` | Denemeleri tükenen mesajların bekletildiği kalıcı `inventory-service_failed` kuyruğunu oluşturur. |
| `inventoryFailedRecoverer(rabbitTemplate)` | Dinleyici yeniden denemeleri (`spring.rabbitmq.listener.simple.retry`) tükenince mesajı `inventory-service_failed` kuyruğuna yeniden yayınlar (wallet/order ile aynı `*_failed` düzeni). |
| `orderSubmittedEx()` | `OrderSubmittedEvent` için kalıcı fanout exchange tanımlar. |
| `stockReleaseEx()` | `OrderStockReleaseEvent` için kalıcı fanout exchange tanımlar. |
| `orderCompletedEx()` | `OrderCompletedEvent` için kalıcı fanout exchange tanımlar. |
| `elementSoldEx()` | `ElementSoldEvent` için kalıcı fanout exchange tanımlar. |
| `bindSubmitted(inventoryQueue, orderSubmittedEx)` | Stok kuyruğunu sipariş oluşturma exchange'ine bağlar. |
| `bindRelease(inventoryQueue, stockReleaseEx)` | Stok kuyruğunu stok serbest bırakma exchange'ine bağlar. |
| `bindCompleted(inventoryQueue, orderCompletedEx)` | Stok kuyruğunu sipariş tamamlama exchange'ine bağlar. |
| `bindSold(inventoryQueue, elementSoldEx)` | Stok kuyruğunu masadan satış exchange'ine bağlar. |
| `keepListenerRetrying()` | Broker yeniden başlarken yeniden bağlanma kimlik doğrulama hatası gibi görünse de dinleyicinin kalıcı olarak durmasını engeller; bağlanmayı denemeye devam eder. |
| `durableFanout(eventTypeName)` | Olay adından MassTransit uyumlu, kalıcı ve otomatik silinmeyen bir fanout exchange üretir. |

Kod üç katmana ayrılır ve bağımlılıklar yalnız içe doğru gider (ayrıntı: [ADR 0003](../adr/0003-service-layering-outbox-tdd.md)):

- `domain/`: iş kuralları. Spring, SQL ve RabbitMQ bilmez; saf Java birim testleriyle sınanır.
- `application/`: kullanım senaryoları ve portlar (`StockRepository`, `Outbox`). Stoğu değiştiren her kullanım senaryosu tek bir veritabanı işlemidir.
- `infrastructure/`, `messaging/`, `web/`: portların JDBC ve RabbitMQ uygulamaları ile HTTP ve kuyruk girişleri.

### `inventory-service/src/main/java/com/elementmarket/inventory/domain/Grams.java`
Negatif olamayan, 4 haneli gram miktarı (value object). İki miktar değerleri aynıysa eşittir; eksi stok bu tiple ifade edilemez.

| Fonksiyon | Ne yapar |
|---|---|
| `Grams(value)` | Miktarı 4 haneye yuvarlar; boş ya da negatif miktarı reddeder. |
| `plus(other)` / `minus(other)` | Toplar ya da çıkarır; sonuç negatif olacaksa hata fırlatır. |

### `inventory-service/src/main/java/com/elementmarket/inventory/domain/StockItem.java`
Stok bağlamının aggregate root'u: bir sembolün raftaki gramları ve bunun siparişlere ayrılmış kısmı. Stok ve rezerv yalnız bu metotlarla değişir; "fazla satış olmaz, rezerv stoktan büyük olmaz, bir rezervasyon en fazla bir kez bırakılır ya da düşülür" kuralları tek yerdedir.

| Fonksiyon | Ne yapar |
|---|---|
| `StockItem(symbol, stock, reserved)` | Rezervi stoktan büyük bir satırı reddeder. |
| `available()` | Satılabilir miktarı (stok − rezerv) döner. |
| `reserve(quantity)` | Miktar satılabilir miktara sığıyorsa (sınır dahil) rezerve ekler ve `RESERVED` döner; sığmıyorsa hiçbir şeyi değiştirmeden `INSUFFICIENT_STOCK` döner. 0 gram programlama hatasıdır. |
| `release(reservation)` | Rezervasyonun tuttuğu miktarı (olaydakini değil) rezervden geri alır, rezervasyonu `Released` yapar. Kapalı ya da başka sembole ait rezervasyonu reddeder. |
| `fulfill(reservation)` | Rezervasyonun miktarını hem stoktan hem rezervden kalıcı olarak düşer, rezervasyonu `Fulfilled` yapar. Kapalı rezervasyonu reddeder. |
| `restock(grams)` | Masadan geri satılan gramları stoğa ekler. |

### `inventory-service/src/main/java/com/elementmarket/inventory/domain/Reservation.java`
Bir siparişin tek `stock_reservations` satırı: `Reserved`, sonra `Released` ya da `Fulfilled`, geri dönüş yok. Kapalı satırlar silinmez, böylece geç ya da tekrar gelen olay onları bulur. Masadan satışlar satış kimliğiyle `Sold` satırı olarak saklanır. Durumu yalnız `StockItem` değiştirir, gramlarla birlikte.

| Fonksiyon | Ne yapar |
|---|---|
| `reserved(orderId, symbol, quantity)` | Yeni, açık (`Reserved`) rezervasyon üretir. |
| `releasedBeforeReserve(orderId, symbol)` | Ayırmadan önce gelen bırakma için 0 gramlık kapalı `Released` satırı (mezar taşı) üretir. |
| `sale(saleId, symbol, grams)` | Masadan satış için kapalı `Sold` satırı üretir. |
| `resubmitted()` | Aynı sipariş için ikinci `OrderSubmittedEvent`'in anlamını döner: açık rezervasyonda `ALREADY_RESERVED` (yeniden onaylanır), kapalıda `ALREADY_HANDLED` (sessiz kalınır). |
| `isActive()` | Durum `Reserved` ise doğru döner. |
| `Status.column()` | Durumun tablodaki yazımını (`Reserved`, `Released`, `Fulfilled`, `Sold`) döner. |

### `inventory-service/src/main/java/com/elementmarket/inventory/domain/ReserveOutcome.java`
Rezervasyon denemesinin sonucu: `RESERVED`, `ALREADY_RESERVED`, `ALREADY_HANDLED`, `INSUFFICIENT_STOCK`, `INVALID_QUANTITY`. Uygulama katmanı bunu `StockReservedEvent`, `StockReservationFailedEvent` ya da sessizliğe çevirir.

### `inventory-service/src/main/java/com/elementmarket/inventory/application/InventoryService.java`
Stok kullanım senaryoları. Stoğu değiştiren her metot tek bir ACID işlemidir: teslimi kaydeder, önce rezervasyon satırını sonra stok satırını kilitler, kararı `StockItem`'a bırakır, sonra yeni durumu ve giden olayı yazar. Hepsi birlikte commit edilir ya da hiçbiri edilmez.

| Fonksiyon | Ne yapar |
|---|---|
| `reserveForOrder(delivery, symbol, quantity)` | Sipariş için bir kez stok ayırır ve saga yanıtını (`StockReservedEvent` ya da `StockReservationFailedEvent`) outbox'a yazar; sembol yoksa ya da miktar 0,0001 g'dan küçükse `Quantity must be positive.` ile reddeder. Teslim daha önce işlendiyse boş döner. |
| `releaseOrder(delivery, symbol)` | Açık rezervasyonu bir kez bırakır; rezervasyon yoksa `Released` mezar taşı yazar (sembol yoksa `?`). |
| `fulfillOrder(delivery)` | Açık rezervasyonun gramlarını stoktan kalıcı olarak düşer; olaydaki sembol ve miktar kullanılmaz. |
| `restock(delivery, saleId, symbol, grams)` | Masadan satılan gramları satış kimliği başına bir kez stoğa ekler. |
| `stockOf(symbol)` | Satır yazmadan ve kilit almadan stoğu döner; görülmemiş sembolde varsayılan stoğu ve 0 rezervi döner. |

### `inventory-service/src/main/java/com/elementmarket/inventory/application/StockRepository.java`
Stok aggregate'inin ve rezervasyonların kalıcılık portu. Arayüz uygulama katmanına aittir, JDBC sınıfı onu uygular; böylece iş kuralları SQL'e bağımlı olmaz (bağımlılığın tersine çevrilmesi). Her metot çağıranın işlemine katılır.

### `inventory-service/src/main/java/com/elementmarket/inventory/application/Outbox.java`
Giden olaylar için port. Uygulaması çağıranın işlemine yazar: olay, ona yol açan değişiklik commit edildiyse vardır.

### `inventory-service/src/main/java/com/elementmarket/inventory/application/Delivery.java`
Bir broker tesliminin kimliği (`messageId`, olay türü, sipariş). `processed_messages`'a etkileriyle aynı işlemde bir kez yazılır.

### `inventory-service/src/main/java/com/elementmarket/inventory/infrastructure/JdbcStockRepository.java`
`StockRepository`'nin JDBC uygulaması: kilitli okuma (`FOR UPDATE`), varsayılan stokla ilk kayıt, `processed_messages` ile tekrar koruması, stok ve rezervasyon yazımı. Yeni rezervasyon düz `INSERT` ile yazılır; aynı sipariş için eşzamanlı ikinci yazım üzerine yazmaz, hata verir ve yeniden denenir. İş kuralı içermez.

### `inventory-service/src/main/java/com/elementmarket/inventory/infrastructure/JdbcOutbox.java`
Olayı JSON olarak `outbox` tablosuna, çağıranın işlemi içinde yazar.

### `inventory-service/src/main/java/com/elementmarket/inventory/infrastructure/OutboxRelay.java`
Commit edilmiş outbox satırlarını en eskiden başlayarak yayınlar; her satır kendi işleminde, `FOR UPDATE SKIP LOCKED` ile kilitlenir (ikinci bir kopya sıradakini alır).

| Fonksiyon | Ne yapar |
|---|---|
| `poll()` | `inventory.outbox.poll-ms` aralığıyla çalışır; hata olursa uyarı loglar ve bir sonraki turda tekrar dener. |
| `publishPending()` | Bekleyen satırları tek tek yayınlar (tur başına en fazla 100) ve ilk hatada durur; yayınlanamayan satır beklemede kalır. |

### `inventory-service/src/main/java/com/elementmarket/inventory/infrastructure/RabbitOutboxPublisher.java`
Bir outbox satırını olay adıyla aynı isimli fanout exchange'e, satır kimliğini `messageId` yaparak yollar ve broker onayını (`waitForConfirmsOrDie`, 5 sn) bekler.

### `inventory-service/src/main/java/com/elementmarket/inventory/config/InventoryWiring.java`
Framework'ten bağımsız `InventoryService`'i portlarından ve `inventory.default-stock-grams` ayarından (`BigDecimal` olarak) kurar, relay zamanlayıcısını açar (`@EnableScheduling`).

### `inventory-service/src/main/java/com/elementmarket/inventory/messaging/MassTransitMessage.java`
.NET ve Node servisleriyle aynı MassTransit zarf biçimini okuyup yazan yardımcı sınıf; alan adlarını hem camelCase hem PascalCase kabul eder (cüzdan servisindekiyle aynıdır).

| Fonksiyon | Ne yapar |
|---|---|
| `typeOf(body, mapper)` | Zarftaki `messageType` URN'inden kısa olay adını çıkarır; yoksa null döner. |
| `messageOf(body, mapper)` | Zarftaki `message` gövdesini, zarf yoksa tüm belgeyi döner. |
| `messageIdOf(body, mapper)` | Zarftaki `messageId` değerini döner; yoksa null döner. |
| `text(message, camelName, pascalName)` | Metin alanını iki yazımdan biriyle okur; bulunamazsa null döner. |
| `decimal(message, camelName, pascalName)` | Sayı alanını `double`'a hiç çevirmeden `BigDecimal` olarak okur; bulunamazsa 0 döner. |
| `publishBody(mapper, typeName, payload, messageId)` | Yükü verilen `messageId` ve yeni bir `conversationId` ile MassTransit zarfına sarar; outbox satır kimliğini verir, böylece yeniden yollanan satır aynı kimliği taşır. |
| `headers(typeName)` | MassTransit tüketicilerinin beklediği `MT-Message-Type` ve `Content-Type` başlıklarını üretir. |
| `exchange(typeName)` | Olay adına karşılık gelen exchange adını (`Element.Shared.Events:<Ad>`) döner. |
| `findField(message, camelName, pascalName)` | İki yazımdan ilk dolu (null olmayan) alanı bulur. |

### `inventory-service/src/main/java/com/elementmarket/inventory/messaging/InventoryListener.java`
`inventory-service` kuyruğunun giriş adaptörü: zarfı okur ve ilgili `InventoryService` kullanım senaryosunu çağırır. İşlem ve tekrar koruması kullanım senaryosundadır.

| Fonksiyon | Ne yapar |
|---|---|
| `onMessage(message)` | Teslimi `handle`'a verir; bozuk JSON, geçersiz UUID, negatif gram ya da sembolsüz masa satışında mesajı yeniden kuyruğa almadan reddeder (`AmqpRejectAndDontRequeueException`). Diğer hatalar yeniden denemeye, sonunda `inventory-service_failed` kuyruğuna gider. |
| `handle(message)` | Olay türünü ve sipariş (ya da satış) anahtarını belirler, miktarı `decimal` ile okur ve türüne göre `reserveForOrder`, `releaseOrder`, `fulfillOrder` ya da `restock`'u çağırır. |
| `resolveMessageId(messageIdText, eventType, saleKey)` | Zarftaki `messageId`'yi kullanır; yoksa olay türü ve anahtardan sabit bir kimlik türetir. |

### `inventory-service/src/main/java/com/elementmarket/inventory/web/HealthController.java`
Diğer servislerle aynı biçimde sağlık ve bilgi uçlarını sunar.

| Fonksiyon | Ne yapar |
|---|---|
| `health()` | PostgreSQL ve RabbitMQ'yu yoklar, süreleriyle birlikte `Healthy`/`Unhealthy` döner (200/503). |
| `live()` | Bağımlılık kontrolü yapmadan `Healthy` döner. |
| `info()` | Servis adını, sürümünü ve bağlantılarını döner. |
| `pingPostgres()` | `SELECT 1` çalıştırıp veritabanının cevap verip vermediğini söyler. |
| `pingRabbit()` | RabbitMQ bağlantısı açıp açık olup olmadığını söyler. |
| `elapsedMillis(startNanos)` | Başlangıçtan bu yana geçen süreyi milisaniye olarak hesaplar. |
| `check(name, ok, elapsedMs)` | Tek bir kontrolün `{name, ok, ms}` sonucunu sıralı bir harita olarak üretir. |

### `inventory-service/src/main/java/com/elementmarket/inventory/web/StockController.java`
Herkese açık stok sorgulama ucunun HTTP adaptörü: girdi doğrulama ve JSON biçimi burada; okuma `InventoryService`'te.

| Fonksiyon | Ne yapar |
|---|---|
| `stock(symbol)` | Sembolü 1-3 harf olarak doğrular ve stok bilgisini (salt okuma) `{symbol, stockGrams, reservedGrams, availableGrams}` olarak döner; geçersizse 400 döner. |

### `inventory-service/src/main/resources/application.yml`
Port, veritabanı, RabbitMQ, varsayılan stok, outbox ve Actuator ayarlarını ortam değişkenlerine bağlayan yapılandırma dosyası. Ayrıca: JSON sayıları `BigDecimal` olarak okunur (`use-big-decimal-for-floats`), relay için broker onayı açıktır (`publisher-confirm-type: simple`), şema hatasında açılış durur (`continue-on-error: false`), kapanış adımı başına 4 sn sınır (`timeout-per-shutdown-phase`), dinleyici için 5 denemeli yeniden deneme (1 sn başlangıç, ×2 artış).

### `inventory-service/src/main/resources/schema.sql`
Açılışta çalışan şema: `stock_items`, `stock_reservations`, `processed_messages` ve `outbox` tabloları ve kod yanlış olsa bile veritabanının uyguladığı CHECK kısıtları (rezerv 0 ile stok arasında olmalı, yani stok eksiye düşmez ve fazla satış olmaz; rezervasyon miktarı negatif olamaz, durum dört değerden biridir). Kısıtlar `NOT VALID` eklenir: her yeni yazımı denetler ama eski satırları taramaz, böylece eski bir satır açılışı yeniden başlatma döngüsüne sokamaz. Yayınlanmış outbox satırları 7 gün, tekrar işaretleri 30 gün sonra silinir.

### `inventory-service/Dockerfile` ve `inventory-service/pom.xml`
Maven ile derleyip JRE 21 Alpine imajında `app.jar` olarak çalıştıran Docker tarifi ve bağımlılık listesi. İmaj `nobody` kullanıcısıyla çalışır ve JVM bellek bitince (`-XX:+ExitOnOutOfMemoryError`) kapanır ki Docker yeniden başlatsın. `pom.xml` Testcontainers'ı 1.21.4'e sabitler (aşağıdaki Testler bölümüne bakın).

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5434/element_inventory_db` | Stok veritabanının adresi. |
| `SPRING_DATASOURCE_USERNAME` | `postgres` | Veritabanı kullanıcı adı. |
| `SPRING_DATASOURCE_PASSWORD` | `<yerel-varsayılan>` | Veritabanı parolası (yalnızca yerel geliştirme varsayılanı). |
| `RABBITMQ_HOST` | `localhost` | RabbitMQ sunucusu. |
| `RABBITMQ_PORT` | `5672` | RabbitMQ portu. |
| `RABBITMQ_USERNAME` | `guest` | RabbitMQ kullanıcı adı. |
| `RABBITMQ_PASSWORD` | `<yerel-varsayılan>`| RabbitMQ parolası. |
| `DEFAULT_STOCK_GRAMS` | `100000` | Bir sembol ilk kez yazıldığında (ör. ilk rezervasyonda) kaydedilen ve görülmemiş sembol için `GET` ucunda raporlanan başlangıç stoğu (`inventory.default-stock-grams`). |
| `OUTBOX_POLL_MS` | `500` | `OutboxRelay`'in bekleyen olaylara bakma aralığı (milisaniye). |

## Testler

Domain testleri önce yazıldı (TDD): kural testi kırmızıyken kod yazıldı, sonra yeşile döndü.

- `domain/GramsTest.java`: 4 hane, negatif ve boş miktarın reddi, eldekinden fazlasını çıkarmanın hata olması.
- `domain/StockItemTest.java`: satılabilir miktarın stok eksi rezerv olması, sınırın dahil olması, fazla satışın reddedilip hiçbir şeyi değiştirmemesi, 0 gramın reddi, rezervi stoktan büyük satırın yüklenememesi, bırakma ve düşmenin rezervasyon miktarını kullanması ve yalnız bir kez yapılabilmesi, başka sembolün rezervasyonunun reddi, geri stoklama.
- `domain/ReservationTest.java`: tekrar gelen siparişin açık rezervasyonda yeniden onaylanması, kapalıda sessiz kalınması; mezar taşının 0 gramlık kapalı satır olması; durumların tablodaki yazımı.
- `application/InventoryServiceIntegrationTest.java`: Testcontainers ile gerçek PostgreSQL'e karşı ACID garantileri. 100 g stoğa eşzamanlı 20 adet 10 g'lık siparişten tam 10'u ayrılır, rezerv 100'de kalır (izolasyon; satır kilidi kaldırılınca bu test kırılır). Outbox yazımı başarısız olursa stok, rezervasyon ve tekrar işareti birlikte geri alınır (atomiklik). Veritabanı negatif stoğu, stoktan büyük rezervi ve bilinmeyen durumu reddeder (tutarlılık). Aynı teslim ikinci kez uygulanmaz. Bırakma ve düşme rezervasyon satırına göre bir kez yapılır; bırakmadan sonra gelen sipariş sessizce yok sayılır. Masadan satış bir kez stoğa eklenir. Ret nedenleri kablodaki metinle aynıdır. Herkese açık okuma satır yazmaz. Relay her satırı satır kimliğiyle bir kez yollar, yayınlanamayan satırı beklemede bırakır. Docker yoksa bu testler atlanır.
- `MassTransitMessageTest.java`: PascalCase alanlı `OrderSubmittedEvent` zarfının okunması, `decimal` ile `0.1`'in tam okunması ve verilen `messageId`'nin `publishBody` çıktısında korunması.

Uçtan uca akış (sipariş, stok ayırma, saga, masadan satış) `deploy/scripts/test-smoke.ps1` ile sınanır.

Çalıştırma (Maven kuruluysa, `inventory-service` klasöründe):

```powershell
mvn -q -B test
```

Maven kurulu değilse Docker ile (PowerShell, `inventory-service` klasöründe):

```powershell
docker run --rm -v "${PWD}:/build" -v element-m2:/root/.m2 -v /var/run/docker.sock:/var/run/docker.sock `
  -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal -e TESTCONTAINERS_RYUK_DISABLED=true `
  -w /build maven:3.9-eclipse-temurin-21 mvn -q -B test
```

Docker soketi bağlanmazsa entegrasyon testleri hata vermeden atlanır; sonuçta `Skipped` sayısına bakın. `pom.xml` Testcontainers'ı 1.21.4'e sabitler, çünkü Spring Boot 3.4.1'in getirdiği 1.20.4 Docker Engine 29'un kabul etmediği eski API sürümünü kullanır.
