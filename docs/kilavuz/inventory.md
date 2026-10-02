# Stok servisi (inventory-service)

> Her element sembolü için rafta kaç gram olduğunu tutar; sipariş için stok ayırır, sipariş başarısız olunca geri bırakır, tamamlanınca kalıcı olarak düşer ve masadan satılan gramları stoğa geri koyar.

| Özellik | Değer |
|---|---|
| Teknoloji | Java 21, Spring Boot 3.4 (Web, JDBC, AMQP, Actuator) |
| Port | `5008` (konteyner içinde `8080`) |
| Klasör | `inventory-service` |
| Veri | PostgreSQL `element_inventory_db` (tablolar: `stock_items`, `stock_reservations`, `processed_messages`) |
| Mesajlaşma | yayınlar: StockReservedEvent, StockReservationFailedEvent · dinler: OrderSubmittedEvent, OrderStockReleaseEvent, OrderCompletedEvent, ElementSoldEvent |

## Ne işe yarar?

"Bu elementten şu an kaç gram satılabilir?" sorusunun tek doğru cevabı bu servistir. Her sembol için toplam stok (`stock_grams`) ve siparişler için ayrılmış miktar (`reserved_grams`) tutulur; satılabilir miktar ikisinin farkıdır. Bir sembol ilk kez yazıldığında (ilk rezervasyon ya da masadan geri stoklama) simülasyon için varsayılan **100.000 g** stok otomatik olarak yazılır. Herkese açık `GET` ucu yalnızca okur: satır yazmaz, kilit almaz; hiç görülmemiş bir sembol için varsayılan başlangıç stoğunu (rezerv 0) raporlar.

Sipariş akışı şöyledir: sipariş servisi `OrderSubmittedEvent` yayınlar; stok servisi yeterli stok varsa miktarı ayırır ve `StockReservedEvent`, yoksa `StockReservationFailedEvent` yayınlar. Sipariş başarısız olur ya da zaman aşımına uğrarsa gelen `OrderStockReleaseEvent` ile ayrılan miktar geri bırakılır. Sipariş tamamlandığında gelen `OrderCompletedEvent` ile **rezervasyon satırında kayıtlı** sembol ve miktar (olayın taşıdığı değer değil) hem rezervden hem toplam stoktan kalıcı olarak düşülür. Kullanıcı cüzdan servisinden masaya geri satış yaptığında gelen `ElementSoldEvent` ile gramlar stoğa geri eklenir.

Her sipariş için `stock_reservations` tablosunda tek bir satır vardır ve durumu `Reserved` → `Released` ya da `Fulfilled` olarak ilerler. Serbest bırakma isteği ayırmadan önce gelirse bile bir `Released` satırı yazılır; böylece geç gelen sipariş olayı stoğu sonsuza kadar kilitlemez. Masadan satışlar da aynı tabloya `Sold` satırı olarak yazılır, bu sayede aynı satış iki kez stoğa eklenmez. Ayrıca her gelen mesaj tek bir veritabanı işleminde (transaction) işlenir ve `processed_messages` tablosuna bir kez yazılır; tekrarlar atlanır, işlem yarıda kalırsa işaret de geri alınır ve yeniden teslim gerçekten uygulanır. Bozuk JSON ya da geçersiz UUID taşıyan mesajlar yeniden kuyruğa alınmadan düşürülür. Diğer hatalarda mesaj artan beklemeyle (1 sn'den başlayıp ikiye katlanarak) 5 kez denenir, yine olmazsa `inventory-service_failed` kuyruğuna park edilir. RabbitMQ yeniden başlarken dinleyici kalıcı olarak durmaz, bağlanmayı denemeye devam eder.

Bu servis **bilerek** şunları yapmaz: KREDI düşmez (wallet-service), sipariş durumunu yazmaz (order-service), fiyatı değiştirmez ve bilimsel element bilgisini tutmaz (catalog-service). Katalog ticker'ındaki `availableStock` yalnızca gösterim içindir; sipariş ön kontrolü ve saga rezervasyonu bu servise bakar.

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
| Yayınlar | `StockReservationFailedEvent` | Miktar geçersizse ya da satılabilir stok yetmiyorsa. | Siparişin başarısız sayılmasını sağlar (`{orderId, reason}`; örnek: `Insufficient stock. Available: 12.5g.`). |
| Dinler | `OrderStockReleaseEvent` | Sipariş başarısız olduğunda ya da zaman aşımına uğradığında. | Ayrılmış miktarı rezervden geri alır; ayırma henüz yoksa `Released` satırı yazar. |
| Dinler | `OrderCompletedEvent` | Sevkiyat tamamlanıp sipariş `Completed` olduğunda. | Rezervasyon satırındaki sembol ve miktarı (olaydaki değerleri değil) toplam stoktan ve rezervden kalıcı olarak düşer, durumu `Fulfilled` yapar. |
| Dinler | `ElementSoldEvent` | Kullanıcı cüzdan servisinde masaya geri satış yaptığında. | Satılan gramları stoğa geri ekler; aynı satışı ikinci kez eklemez. |

Tüm olaylar MassTransit zarfıyla, `Element.Shared.Events:<OlayAdı>` adlı fanout exchange'ler üzerinden taşınır. Servis kendi `inventory-service` kuyruğunu dinlediği dört exchange'e bağlar. Yanıt olayları dinleyicinin veritabanı işlemi içinde yayınlanır (outbox yok); işlem başarısız olursa yeniden denemede tekrar yayınlanır, saga bunları durumuna göre tekilleştirir. 5 denemede (≈15 sn backoff) işlenemeyen mesajlar `inventory-service_failed` kuyruğuna taşınır; RabbitMQ arayüzünden incelenip geri taşınabilir.

## Kod haritası

### `inventory-service/src/main/java/com/elementmarket/inventory/InventoryApplication.java`
Spring Boot uygulamasını başlatan giriş noktası.

| Fonksiyon | Ne yapar |
|---|---|
| `main(args)` | Stok servisini ayağa kaldırır. |

### `inventory-service/src/main/java/com/elementmarket/inventory/config/RabbitConfig.java`
RabbitMQ kuyruklarını (`inventory-service`, `inventory-service_failed`), dinlenen exchange'leri, bağlamaları, yeniden deneme sonrası park etmeyi ve stok ayarlarını tanımlar.

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
| `inventorySettings(defaultStockGrams)` | `inventory.default-stock-grams` ayarını `InventorySettings` nesnesine koyar. |
| `durableFanout(eventTypeName)` | Olay adından MassTransit uyumlu, kalıcı ve otomatik silinmeyen bir fanout exchange üretir. |
| `InventorySettings` (record) | Yeni sembol için yazılacak (ve görülmemiş sembol için raporlanan) varsayılan gram miktarını taşır. |

### `inventory-service/src/main/java/com/elementmarket/inventory/stock/StockRules.java`
Veritabanına dokunmayan saf stok hesapları.

| Fonksiyon | Ne yapar |
|---|---|
| `available(stockGrams, reservedGrams)` | Satılabilir miktarı (stok − rezerv) döner; değerlerden biri boşsa 0 döner. |
| `canReserve(stockGrams, reservedGrams, quantity)` | Pozitif miktar satılabilir miktara sığıyorsa doğru döner. |

### `inventory-service/src/main/java/com/elementmarket/inventory/stock/StockRepository.java`
Stok ve rezervasyon tablolarına JDBC ile erişen, satırları kilitleyerek çalışan depo sınıfı.

| Fonksiyon | Ne yapar |
|---|---|
| `tryMarkProcessed(messageId, eventType, orderId)` | Mesaj kimliğini bir kez kaydeder; daha önce işlenmişse yanlış döner. Dinleyicinin işlemine katılır, böylece işaret stok işiyle birlikte geri alınabilir. |
| `ensureItem(symbol)` | Sembol yoksa varsayılan stokla oluşturur, satırı kilitleyip (`FOR UPDATE`) stok ve rezerv değerlerini döner. |
| `getStock(symbol)` | Sembolün stok, rezerv ve satılabilir gramlarını API yanıtı biçiminde döner; satır yazmaz, kilit almaz, görülmemiş sembolde varsayılan stoğu ve 0 rezervi raporlar. |
| `reservationStatus(orderId)` | Siparişin rezervasyon durumunu (`Reserved`, `Released`, `Fulfilled`, `Sold`) döner; yoksa null döner. |
| `reserve(orderId, symbol, quantity)` | Sipariş için bir kez stok ayırır; zaten işlenmişse mevcut sonucu, stok yetmiyorsa satılabilir miktarı döner. |
| `release(orderId, symbol, quantity)` | `Reserved` durumdaki ayırmayı rezervden geri alır; ayırma yoksa `Released` satırı yazar. |
| `fulfill(orderId)` | Rezervasyon satırını kilitler; durum `Reserved` ise satırdaki sembol ve miktarı stoktan ve rezervden düşer, durumu `Fulfilled` yapar. |
| `restock(saleId, symbol, grams)` | Masadan satılan gramları stoğa ekler ve satışı `Sold` satırıyla işaretler; aynı satış ikinci kez eklenmez. |
| `hasReservationRow(orderOrSaleId)` | Verilen sipariş ya da satış kimliği için rezervasyon satırı olup olmadığını söyler. |
| `ReserveResult.insufficient(available)` | Stok yetersiz sonucunu satılabilir miktarla birlikte üretir. |

### `inventory-service/src/main/java/com/elementmarket/inventory/messaging/MassTransitMessage.java`
.NET ve Node servisleriyle aynı MassTransit zarf biçimini okuyup yazan yardımcı sınıf; alan adlarını hem camelCase hem PascalCase kabul eder (cüzdan servisindekiyle aynıdır).

| Fonksiyon | Ne yapar |
|---|---|
| `typeOf(body, mapper)` | Zarftaki `messageType` URN'inden kısa olay adını çıkarır; yoksa null döner. |
| `messageOf(body, mapper)` | Zarftaki `message` gövdesini, zarf yoksa tüm belgeyi döner. |
| `messageIdOf(body, mapper)` | Zarftaki `messageId` değerini döner; yoksa null döner. |
| `text(message, camelName, pascalName)` | Metin alanını iki yazımdan biriyle okur; bulunamazsa null döner. |
| `number(message, camelName, pascalName)` | Sayı alanını iki yazımdan biriyle okur; bulunamazsa 0 döner. |
| `publishBody(mapper, typeName, payload)` | Yükü yeni `messageId` ve `conversationId` ile MassTransit zarfına sarıp bayt dizisine çevirir. |
| `headers(typeName)` | MassTransit tüketicilerinin beklediği `MT-Message-Type` ve `Content-Type` başlıklarını üretir. |
| `exchange(typeName)` | Olay adına karşılık gelen exchange adını (`Element.Shared.Events:<Ad>`) döner. |
| `findField(message, camelName, pascalName)` | İki yazımdan ilk dolu (null olmayan) alanı bulur. |

### `inventory-service/src/main/java/com/elementmarket/inventory/messaging/EventPublisher.java`
Olayları MassTransit zarfıyla RabbitMQ'ya yayınlayan bileşen.

| Fonksiyon | Ne yapar |
|---|---|
| `publish(typeName, payload)` | Yükü olay adıyla aynı isimli fanout exchange'e doğru başlıklarla gönderir. |

### `inventory-service/src/main/java/com/elementmarket/inventory/messaging/InventoryListener.java`
`inventory-service` kuyruğunu dinleyip sipariş ve masadan satış olaylarını işleyen tüketici.

| Fonksiyon | Ne yapar |
|---|---|
| `onMessage(message)` | Her teslimi tek bir veritabanı işleminde `handle`'a verir; bozuk JSON ya da geçersiz UUID'de mesajı yeniden kuyruğa almadan reddeder (`AmqpRejectAndDontRequeueException`). |
| `handle(message)` | Olay türünü ve sipariş (ya da satış) anahtarını belirler, mesajı bir kez işlendi olarak işaretler ve türüne göre stok işlemini çağırır (`OrderCompletedEvent` için yalnızca sipariş kimliğiyle `fulfill`). |
| `resolveMessageId(messageIdText, eventType, saleKey)` | Zarftaki `messageId`'yi kullanır; yoksa olay türü ve anahtardan sabit bir kimlik türetir. |
| `handleSubmit(orderId, payload)` | Stok ayırmayı dener ve sonucu `StockReservedEvent` ya da `StockReservationFailedEvent` olarak yayınlar. |
| `symbolOf(payload)` | Olaydaki element sembolünü okur. |
| `quantityOf(payload)` | Olaydaki sipariş miktarını (gram) okur. |
| `gramsOf(payload)` | Masadan satış olayındaki gram miktarını okur. |

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
Herkese açık stok sorgulama ucu.

| Fonksiyon | Ne yapar |
|---|---|
| `stock(symbol)` | Sembolü 1-3 harf olarak doğrular ve stok bilgisini (salt okuma) döner; geçersizse 400 döner. |

### `inventory-service/src/main/resources/application.yml`
Port, veritabanı, RabbitMQ, varsayılan stok ve Actuator ayarlarını ortam değişkenlerine bağlayan yapılandırma dosyası. Ayrıca: şema hatasında açılış durur (`continue-on-error: false`), kapanış adımı başına 4 sn sınır (`timeout-per-shutdown-phase`), dinleyici için 5 denemeli yeniden deneme (1 sn başlangıç, ×2 artış).

### `inventory-service/src/main/resources/schema.sql`
Açılışta çalışan şema: `stock_items`, `stock_reservations` ve `processed_messages` tabloları.

### `inventory-service/Dockerfile` ve `inventory-service/pom.xml`
Maven ile derleyip JRE 21 Alpine imajında `app.jar` olarak çalıştıran Docker tarifi ve bağımlılık listesi. İmaj `nobody` kullanıcısıyla çalışır ve JVM bellek bitince (`-XX:+ExitOnOutOfMemoryError`) kapanır ki Docker yeniden başlatsın.

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

## Testler

- `inventory-service/src/test/java/com/elementmarket/inventory/stock/StockRulesTest.java`: satılabilir miktarın stok eksi rezerv olduğunu, yeterli stokta ayırmaya izin verildiğini, yetersiz stokta ve sıfır miktarda reddedildiğini doğrular.
- `inventory-service/src/test/java/com/elementmarket/inventory/MassTransitMessageTest.java`: PascalCase alanlı bir `OrderSubmittedEvent` zarfının okunabildiğini ve `publishBody` çıktısının tekrar okunabildiğini doğrular.

Veritabanı ve RabbitMQ gerektiren akışlar birim testlerle değil, platformun duman/uçtan uca betikleriyle (`deploy/scripts/test-smoke.ps1`, `deploy/scripts/test-e2e.mjs`) sınanır.

Çalıştırma (Maven kuruluysa, `inventory-service` klasöründe):

```powershell
mvn -q -B test
```

Maven kurulu değilse Docker ile (PowerShell, `inventory-service` klasöründe):

```powershell
docker run --rm -v "${PWD}:/build" -v element-m2:/root/.m2 -w /build maven:3.9-eclipse-temurin-21 mvn -q -B test
```
