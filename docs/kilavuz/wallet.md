# Cüzdan servisi (wallet-service)

> Kullanıcının KREDI bakiyesini, hareket defterini (ledger) ve sahip olduğu gramları (holdings) tutar. Sipariş ödemesini düşer, iadeyi yapar ve masadan geri satışı yürütür.

| Özellik | Değer |
|---|---|
| Teknoloji | Java 21, Spring Boot 3.4 (Web, JDBC, AMQP, Actuator) |
| Port | `5005` (konteyner içinde `8080`) |
| Klasör | `wallet-service` |
| Veri | PostgreSQL `element_wallet_db` (tablolar: `wallets`, `ledger`, `holdings`, `processed_messages`, `outbox`) |
| Mesajlaşma | yayınlar: PaymentProcessedEvent, PaymentFailedEvent, ElementSoldEvent · dinler: PaymentRequestedEvent, PaymentRefundRequestedEvent, AssetsCreditedEvent |

## Ne işe yarar?

Üründeki bütün para işleri bu serviste yapılır. Para birimi KREDI'dir; gerçek banka ya da kart tahsilatı yoktur. Kullanıcı cüzdanına ilk kez baktığında (`GET /api/v1/me/wallet`) cüzdan kendiliğinden açılır ve içine hoş geldin bakiyesi yazılır (yerelde 10.000, herkese açık kurulumda 1.000 KREDI).

Alışta sıra şöyledir. Sipariş servisi stok ayrıldıktan sonra RabbitMQ üzerinden `PaymentRequestedEvent` yollar. Cüzdan önce tek siparişlik tavanı (varsayılan 50.000 KREDI) kontrol eder. Sonra cüzdan satırını kilitler ve bu sipariş için daha önce para düşülüp düşülmediğine, siparişin daha önce iade edilip edilmediğine bakar. Bakiye yetiyorsa tutarı düşer ve `PaymentProcessedEvent` yayınlar. Bakiye yetmezse, tavan aşılırsa ya da sipariş zaten iade edilmişse (`ORDER_CANCELLED`) `PaymentFailedEvent` yayınlar.

Sipariş sonradan başarısız olur ya da zaman aşımına uğrarsa `PaymentRefundRequestedEvent` gelir ve düşülen tutar bir kez geri yazılır. Henüz para düşülmemişse yine de 0 KREDI'lik bir `refund` kaydı (mezar taşı) yazılır. Bu kayıt sayesinde geç gelen ya da `wallet-service_failed` kuyruğundan yeniden oynatılan ödeme isteği siparişi ücretlendiremez.

Sevkiyat tamamlanınca `AssetsCreditedEvent` gelir: alınan gramlar kullanıcının holdings'ine eklenir ve ağırlıklı ortalama maliyet yeniden hesaplanır. Bu yalnız kullanıcının gerçekten ödediği ve iade edilmemiş bir sipariş için yapılır. Aksi halde mesaj hata verir, yeniden denenir ve sonunda bekletme kuyruğuna düşer.

Masadan satışta (`POST /api/v1/desk/sell`) kullanıcı elindeki gramları geri satar. Servis fiyatı katalogdan (ticker'daki `bid`, yoksa `last` eksi spread), gerekirse bileşik servisinden (`priceMult`) öğrenir. Gramları holdings'ten düşer, KREDI ekler ve `ElementSoldEvent` yayınlar. Bu olayla stok servisi stoğu geri koyar, katalog da fiyatı aşağı iter. Satış tutarı (`bid × gram`) 4 haneye aşağı kesilir, yani yuvarlama yüzünden işlemin değerinden fazla ödeme yapılmaz. 0'a kesilen satış reddedilir. `ElementSoldEvent` satışla aynı veritabanı işleminde outbox'a yazılır, yani satış kaydedildiyse olay da kaydedilmiştir ve RabbitMQ o an kapalı olsa bile kaybolmaz. Fiyat HTTP ile işlem açılmadan önce alınır, böylece hiçbir kilit ağ çağrısını beklemez. Katalog ve bileşik servislerine yapılan HTTP çağrılarında 2 sn bağlantı ve 5 sn okuma zaman aşımı vardır.

Gelen her mesaj tek bir veritabanı işleminde (transaction) işlenir ve `processed_messages` tablosuna bir kez yazılır. Bakiye değişikliği, defter satırı ve giden olay (outbox satırı) bu işlemde birlikte commit edilir ya da birlikte geri alınır. `OutboxRelay` commit edilmiş olayları en eskiden başlayarak RabbitMQ'ya yollar, broker onayını (publisher confirm) bekler ve ancak ondan sonra satırı yayınlandı diye işaretler. Onaydan sonra çökme olursa satır aynı `messageId` ile yeniden yollanır; alıcılar bunu tekrar olarak atar. Teslim en az bir kezdir, kayıp yoktur. Aynı mesaj ikinci kez gelirse sessizce atlanır, bu yüzden RabbitMQ'nun yeniden teslimleri çift ödeme ya da çift iade yaratmaz. İşlem yarıda kalırsa işaret de geri alınır ve yeniden teslim gerçekten uygulanır. Hata veren mesaj 5 kez denenir; bekleme 1 sn'den başlar ve her seferinde ikiye katlanır. Yine olmazsa mesaj `wallet-service_failed` kuyruğuna park edilir. RabbitMQ yeniden başlarken dinleyici durmaz, bağlanmayı denemeye devam eder.

Bu servis sipariş kaydı tutmaz (order-service), stok ayırmaz (inventory-service), fiyat belirlemez (catalog-service) ve gerçek para çekmez. Kablodaki `balanceElx`, `avgCostElx`, `proceedsElx`, `INSUFFICIENT_ELX` gibi adlar eski sözleşmeden kalmıştır ve bilerek değiştirilmemiştir. Değer her zaman KREDI'dir.

## Uç noktalar

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/api/v1/me/wallet` | API anahtarı (kapıda) + İç servis anahtarı + `X-User-Id` | Kullanıcının bakiyesini, para birimini (`KREDI`) ve son güncelleme zamanını döner; cüzdan yoksa hoş geldin bakiyesiyle açar. |
| GET | `/api/v1/me/holdings` | API anahtarı (kapıda) + İç servis anahtarı + `X-User-Id` | Kullanıcının sahip olduğu gramları sembol/bileşik bazında ortalama maliyet ve ürün adıyla listeler. |
| POST | `/api/v1/desk/sell` | API anahtarı (kapıda) + İç servis anahtarı + `X-User-Id` | Gövde `{symbol, grams, compoundSlug?}`; sembol 1-3 harf, gram 0,0001 ile 1.000.000 arası olmalı; `compoundSlug` verilirse `[a-z0-9-]{1,64}` biçimine uymalıdır (boş slug saf element sayılır). Gramları güncel alış fiyatından satar, KREDI ekler, `ElementSoldEvent` yayınlar ve `{symbol, grams, bid, proceedsElx, balanceElx, currency}` döner. Hatalı girişte 400 (`symbol and grams are required.`, `Could not determine bid for '<SEMBOL>'.`, `Unknown product.`, `Sale amount is too small.`, `No holdings for this symbol.`, `Insufficient holdings.`), yetkisizde 401 döner. |
| GET | `/health` | Herkese açık | PostgreSQL ve RabbitMQ'yu yoklar; ikisi de ayaktaysa 200, değilse 503 döner. |
| GET | `/health/ready` | Herkese açık | `/health` ile aynıdır (hazır olma kontrolü). |
| GET | `/health/live` | Herkese açık | Sürecin ayakta olduğunu bağımlılık kontrolü yapmadan bildirir. |
| GET | `/info` | Herkese açık | Servis adı, sürümü ve sık kullanılan bağlantıları döner. |
| GET | `/actuator/health`, `/actuator/info` | Herkese açık | Spring Boot Actuator'ın standart sağlık ve bilgi uçları. |

Not: Kapı (gateway) `/api/v1/me/**` ve `/api/v1/desk/**` isteklerinde kullanıcının API anahtarını doğrular, ardından isteğe `X-User-Id` ve `INTERNAL_API_KEY` başlıklarını ekleyip buraya iletir. Servise doğrudan gidilirse bu iki başlık elle verilmelidir.

## Mesajlar

| Yön | Olay | Ne zaman | Ne yapar |
|---|---|---|---|
| Dinler | `PaymentRequestedEvent` | Sipariş servisi stok ayrıldıktan sonra ödeme ister. | Tavanı, mükerrerliği, önceki iadeyi ve bakiyeyi kontrol edip tutarı düşer; sonucu aşağıdaki iki olaydan biriyle bildirir. |
| Yayınlar | `PaymentProcessedEvent` | Ödeme düşüldüğünde ya da bu sipariş zaten ödenmişse. | Siparişin sevkiyat adımına geçmesini sağlar (`{orderId}`). |
| Yayınlar | `PaymentFailedEvent` | Bakiye yetmediğinde (`INSUFFICIENT_ELX`), tutar geçersiz/tavanı aşıyorsa (`Credit limit exceeded (50000 KREDI limit).`) ya da sipariş zaten iade edilmişse (`ORDER_CANCELLED`). | Siparişin başarısız sayılıp stoğun serbest bırakılmasını sağlar (`{orderId, reason}`). |
| Dinler | `PaymentRefundRequestedEvent` | Sipariş başarısız olduğunda ya da zaman aşımına uğradığında. | Bu kullanıcıdan bu sipariş için düşülmüş tutar varsa bakiyeye bir kez geri yazar; hiç düşülmemişse 0 KREDI'lik `refund` mezar taşı yazar, böylece geç gelen ödeme isteği `ORDER_CANCELLED` ile reddedilir. |
| Dinler | `AssetsCreditedEvent` | Sevkiyat tamamlanıp sipariş `Completed` olduğunda. | Alınan gramları holdings'e ekler, birim maliyeti `toplam fiyat / miktar` olarak hesaplar. Sipariş bu kullanıcı tarafından ödenmemiş ya da iade edilmişse hata fırlatır; mesaj yeniden denenir ve sonunda `wallet-service_failed` kuyruğuna düşer. |
| Yayınlar | `ElementSoldEvent` | `POST /api/v1/desk/sell` başarılı olduğunda. | Stok servisinin gramları stoğa geri koymasını, kataloğun fiyatı aşağı itmesini tetikler (`{elementSymbol, grams, customerId}`; `grams` gerçekten satılan, 4 haneye yuvarlanmış miktardır). Satışla aynı işlemde outbox'a yazılır, relay tarafından yayınlanır. |

Tüm olaylar MassTransit zarfıyla, `Element.Shared.Events:<OlayAdı>` adlı fanout exchange'ler üzerinden taşınır. Servis kendi `wallet-service` kuyruğunu dinlediği üç exchange'e bağlar. 5 denemede (≈15 sn backoff) işlenemeyen mesajlar `wallet-service_failed` kuyruğuna taşınır; RabbitMQ arayüzünden incelenip geri taşınabilir.

## Kod haritası

### `wallet-service/src/main/java/com/elementmarket/wallet/WalletApplication.java`
Spring Boot uygulamasını başlatan giriş noktası.

| Fonksiyon | Ne yapar |
|---|---|
| `main(args)` | Cüzdan servisini ayağa kaldırır. |

### `wallet-service/src/main/java/com/elementmarket/wallet/config/ProductionSecretsGuard.java`
Üretim benzeri ortamda zayıf ya da varsayılan `INTERNAL_API_KEY` ile açılmayı engelleyen başlangıç bekçisi.

| Fonksiyon | Ne yapar |
|---|---|
| `ProductionSecretsGuard(environment, internalApiKey)` | Ortamı ve iç anahtarı alır; anahtar yoksa boş metin olarak saklar. |
| `run(args)` | Üretim benzeri ortamda anahtar 32 karakterden kısaysa, geliştirme varsayılanıysa ya da "changeme" içeriyorsa başlatmayı hata ile durdurur. |
| `isProductionLike()` | `ELEMENT_ENV=prod` ya da etkin Spring profili `production`/`prod` ise doğru döner. |

### `wallet-service/src/main/java/com/elementmarket/wallet/config/RabbitConfig.java`
RabbitMQ kuyruklarını (`wallet-service`, `wallet-service_failed`), dinlenen exchange'leri, bağlamaları, yeniden deneme sonrası park etmeyi ve cüzdan ayarlarını tanımlar.

| Fonksiyon | Ne yapar |
|---|---|
| `walletQueue()` | Kalıcı `wallet-service` kuyruğunu oluşturur. |
| `walletFailedQueue()` | Denemeleri tükenen mesajların bekletildiği kalıcı `wallet-service_failed` kuyruğunu oluşturur. |
| `walletFailedRecoverer(rabbitTemplate)` | Dinleyici yeniden denemeleri (`spring.rabbitmq.listener.simple.retry`) tükenince mesajı `wallet-service_failed` kuyruğuna yeniden yayınlar (order-service ile aynı `*_failed` düzeni). |
| `walletListenerCustomizer()` | Broker el sıkışma sırasında bağlantıyı kapatınca (ör. RabbitMQ hâlâ açılıyorken) dinleyicinin kalıcı olarak durmasını engeller; bağlanmayı denemeye devam eder. |
| `paymentRequestedExchange()` | `PaymentRequestedEvent` için kalıcı fanout exchange tanımlar. |
| `paymentRefundExchange()` | `PaymentRefundRequestedEvent` için kalıcı fanout exchange tanımlar. |
| `assetsCreditedExchange()` | `AssetsCreditedEvent` için kalıcı fanout exchange tanımlar. |
| `bindPaymentRequested(walletQueue, paymentRequestedExchange)` | Cüzdan kuyruğunu ödeme isteği exchange'ine bağlar. |
| `bindPaymentRefund(walletQueue, paymentRefundExchange)` | Cüzdan kuyruğunu iade isteği exchange'ine bağlar. |
| `bindAssetsCredited(walletQueue, assetsCreditedExchange)` | Cüzdan kuyruğunu varlık yazma exchange'ine bağlar. |
| `walletSettings(creditLimit, welcomeGrant, catalogUrl, compoundUrl, spreadPct, internalApiKey)` | `wallet.*` ve `internal.api-key` ayarlarını tek bir `WalletSettings` nesnesinde toplar. |
| `durableFanout(eventTypeName)` | Olay adından MassTransit uyumlu, kalıcı ve otomatik silinmeyen bir fanout exchange üretir. |
| `WalletSettings` (record) | Tavan, hoş geldin bakiyesi, katalog/bileşik adresleri, spread oranı ve iç anahtarı taşıyan değişmez ayar kaydı. |

Kod üç katmana ayrılır ve bağımlılıklar yalnız içe doğru gider (ayrıntı: [ADR 0003](../adr/0003-service-layering-outbox-tdd.md)):

- `domain/`: iş kuralları. Spring, SQL ve RabbitMQ bilmez; saf Java birim testleriyle sınanır.
- `application/`: kullanım senaryoları ve portlar (`WalletRepository`, `Outbox`). Her kullanım senaryosu tek bir veritabanı işlemidir.
- `infrastructure/`, `messaging/`, `web/`: portların JDBC ve RabbitMQ uygulamaları ile HTTP ve kuyruk girişleri.

### `wallet-service/src/main/java/com/elementmarket/wallet/domain/Money.java`
Negatif olamayan, 4 haneli KREDI tutarı (value object). İki tutar değerleri aynıysa eşittir; negatif bakiye bu tiple ifade edilemez.

| Fonksiyon | Ne yapar |
|---|---|
| `Money(amount)` | Tutarı 4 haneye yuvarlar; boş ya da negatif tutarı reddeder. |
| `plus(other)` / `minus(other)` | Toplar ya da çıkarır; sonuç negatif olacaksa hata fırlatır. |
| `times(grams)` | Gram fiyatı × gram; 4 haneye aşağı keser, yani ödeme işlemin değerini hiç aşmaz (0,5 × 0,0001 → 0). |
| `per(grams)` | Toplam tutarın gram başına fiyatını yarım-yukarı yuvarlayarak verir. |

### `wallet-service/src/main/java/com/elementmarket/wallet/domain/Grams.java`
Negatif olamayan, 4 haneli gram miktarı. `Money` ile ayrı tip olduğu için tutar ile miktar karıştırılamaz.

### `wallet-service/src/main/java/com/elementmarket/wallet/domain/Wallet.java`
Cüzdan bağlamının aggregate root'u: bir kullanıcının bakiyesi ve onu değiştiren kurallar. Bakiye yalnız bu metotlarla değişir; "sıfırın altına inmez, sipariş en fazla bir kez ücretlenir ve iade edilir, varlık yalnız ödenmiş siparişe yazılır" kuralları tek yerdedir.

| Fonksiyon | Ne yapar |
|---|---|
| `charge(order, amount, creditLimit)` | Sırayla tavanı, mükerrerliği, önceki iadeyi ve bakiyeyi kontrol eder; `CHARGED`, `ALREADY_CHARGED`, `INSUFFICIENT_FUNDS`, `OVER_LIMIT` ya da `ORDER_CANCELLED` döner. |
| `refund(order)` | Ücretlenen tutarı geri yazar ve döner; ücretlenmemiş siparişte 0 döner (mezar taşı). İkinci iadeyi reddeder. |
| `receiveAssets(order, holding, grams, unitCost)` | Sipariş ödenmiş ve iade edilmemişse gramları holding'e ekler; değilse hata fırlatır. |
| `sell(holding, grams, bid)` | Holding gramları karşılıyorsa düşer, `bid × gram` tutarını bakiyeye ekler ve döner; karşılamıyorsa boş döner. |

### `wallet-service/src/main/java/com/elementmarket/wallet/domain/Holding.java`
Bir kullanıcının bir element ya da bileşik ürününden sahip olduğu gramlar ve ağırlıklı ortalama maliyeti. `ELEMENTAL` sabiti saf elementin slug'ıdır.

| Fonksiyon | Ne yapar |
|---|---|
| `add(grams, unitCost)` | Gram ekler, ortalama maliyeti `(eski gram × eski maliyet + yeni gram × birim maliyet) / toplam` olarak 4 haneye yuvarlar. |
| `remove(grams)` | Satılan gramları düşer; kalanın ortalama maliyeti değişmez. Elde olandan fazlasını reddeder. |

### `wallet-service/src/main/java/com/elementmarket/wallet/domain/OrderPayments.java`
Defterin bir sipariş için bildikleri: bu cüzdandan ücretlenen tutar (yoksa boş) ve iade ya da mezar taşı olup olmadığı. Cüzdan kilidi altında okunur, karar sırasında değişemez.

### `wallet-service/src/main/java/com/elementmarket/wallet/domain/LedgerEntry.java`
Değiştirilemeyen defterin bir satırı (`grant`, `buy`, `refund`, `sell`). Her bakiye değişikliği aynı işlemde bir satır olarak yazılır, böylece bakiye her zaman geçmişinden açıklanabilir.

### `wallet-service/src/main/java/com/elementmarket/wallet/application/WalletService.java`
Cüzdan kullanım senaryoları. Her metot tek bir ACID işlemidir: teslimi kaydeder, cüzdan satırını kilitler, kararı `Wallet`'a bırakır, sonra yeni durumu, defter satırını ve giden olayı yazar. Hepsi birlikte commit edilir ya da hiçbiri edilmez.

| Fonksiyon | Ne yapar |
|---|---|
| `chargeOrder(delivery, customerId, requested, symbol, grams)` | Ödemeyi düşer ve saga yanıtını (`PaymentProcessedEvent` ya da `PaymentFailedEvent`) outbox'a yazar; teslim daha önce işlendiyse boş döner. |
| `refundOrder(delivery, customerId, symbol, grams)` | İptal edilen siparişi bir kez iade eder; ücretlenmemişse 0 tutarlı mezar taşı yazar. |
| `creditAssets(delivery, customerId, symbol, grams, totalPrice, compoundSlug, productLabel)` | Teslim edilen gramları ödenen birim fiyattan ekler; ödenmemiş ya da iade edilmiş siparişte hata fırlatır (mesaj yeniden denenir, sonra park edilir). |
| `sell(userId, symbol, grams, bid, compoundSlug)` | Masadan satışı yapar ve `ElementSoldEvent`'i aynı işlemde outbox'a yazar; `no_holding` ya da `over_holding` ile başarısız olabilir. |
| `walletOf(userId)` | Cüzdanı gerekirse hoş geldin bakiyesiyle açar; bakiye ve son güncelleme zamanını döner. |
| `holdingsOf(userId)` | Sıfırdan büyük holding'leri döner. |

### `wallet-service/src/main/java/com/elementmarket/wallet/application/WalletRepository.java`
Cüzdan aggregate'inin kalıcılık portu. Arayüz uygulama katmanına aittir, JDBC sınıfı onu uygular; böylece iş kuralları SQL'e bağımlı olmaz (bağımlılığın tersine çevrilmesi). Her metot çağıranın işlemine katılır.

### `wallet-service/src/main/java/com/elementmarket/wallet/application/Outbox.java`
Giden olaylar için port. Uygulaması çağıranın işlemine yazar: olay, ona yol açan değişiklik commit edildiyse vardır.

### `wallet-service/src/main/java/com/elementmarket/wallet/infrastructure/JdbcWalletRepository.java`
`WalletRepository`'nin JDBC uygulaması: kilitli okuma (`FOR UPDATE`), hoş geldin bakiyesi, `processed_messages` ile tekrar koruması, defter ve holding yazımı. İş kuralı içermez.

### `wallet-service/src/main/java/com/elementmarket/wallet/infrastructure/JdbcOutbox.java`
Olayı JSON olarak `outbox` tablosuna, çağıranın işlemi içinde yazar.

### `wallet-service/src/main/java/com/elementmarket/wallet/infrastructure/OutboxRelay.java`
Commit edilmiş outbox satırlarını en eskiden başlayarak yayınlar; her satır kendi işleminde, `FOR UPDATE SKIP LOCKED` ile kilitlenir (ikinci bir kopya sıradakini alır).

| Fonksiyon | Ne yapar |
|---|---|
| `poll()` | `wallet.outbox.poll-ms` aralığıyla çalışır; hata olursa uyarı loglar ve bir sonraki turda tekrar dener. |
| `publishPending()` | Bekleyen satırları tek tek yayınlar (tur başına en fazla 100) ve ilk hatada durur; yayınlanamayan satır beklemede kalır. |

### `wallet-service/src/main/java/com/elementmarket/wallet/infrastructure/RabbitOutboxPublisher.java`
Bir outbox satırını olay adıyla aynı isimli fanout exchange'e, satır kimliğini `messageId` yaparak yollar ve broker onayını (`waitForConfirmsOrDie`, 5 sn) bekler.

### `wallet-service/src/main/java/com/elementmarket/wallet/config/WalletWiring.java`
Framework'ten bağımsız `WalletService`'i portlarından kurar ve relay zamanlayıcısını açar (`@EnableScheduling`).

### `wallet-service/src/main/java/com/elementmarket/wallet/messaging/MassTransitMessage.java`
.NET ve Node servisleriyle aynı MassTransit zarf biçimini okuyup yazan yardımcı sınıf; alan adlarını hem camelCase hem PascalCase kabul eder.

| Fonksiyon | Ne yapar |
|---|---|
| `typeOf(body, mapper)` | Zarftaki `messageType` URN'inden kısa olay adını çıkarır; yoksa boş (null) döner. |
| `messageOf(body, mapper)` | Zarftaki `message` gövdesini, zarf yoksa tüm belgeyi döner. |
| `messageIdOf(body, mapper)` | Zarftaki `messageId` değerini döner; yoksa null döner. |
| `text(message, camelName, pascalName)` | Metin alanını iki yazımdan biriyle okur; bulunamazsa null döner. |
| `decimal(message, camelName, pascalName)` | Sayı alanını `double`'a hiç çevirmeden `BigDecimal` olarak okur; bulunamazsa 0 döner. |
| `publishBody(mapper, typeName, payload, messageId)` | Yükü verilen `messageId` ve yeni bir `conversationId` ile MassTransit zarfına sarar; outbox satır kimliğini verir, böylece yeniden yollanan satır aynı kimliği taşır. |
| `headers(typeName)` | MassTransit tüketicilerinin beklediği `MT-Message-Type` ve `Content-Type` başlıklarını üretir. |
| `exchange(typeName)` | Olay adına karşılık gelen exchange adını (`Element.Shared.Events:<Ad>`) döner. |
| `findField(message, camelName, pascalName)` | İki yazımdan ilk dolu (null olmayan) alanı bulur. |

### `wallet-service/src/main/java/com/elementmarket/wallet/messaging/WalletListener.java`
`wallet-service` kuyruğunun giriş adaptörü: zarfı okur ve ilgili `WalletService` kullanım senaryosunu çağırır. İşlem ve tekrar koruması kullanım senaryosundadır; burada fırlayan hata mesajı yeniden denemeye, sonunda `wallet-service_failed` kuyruğuna gönderir.

| Fonksiyon | Ne yapar |
|---|---|
| `onMessage(message)` | Olay türünü, sipariş ve müşteri kimliğini okur (biri eksikse mesajı atlar) ve türüne göre `chargeOrder`, `refundOrder` ya da `creditAssets`'i çağırır. |
| `creditAssets(delivery, customerId, symbol, quantity, payload)` | Sembol, miktar ya da toplam fiyat geçersizse mesajı atlar; değilse varlıkları yazdırır. |
| `resolveMessageId(body, eventType, orderId)` | Zarftaki `messageId`'yi kullanır; yoksa olay türü ve siparişten sabit bir kimlik türetir. |

### `wallet-service/src/main/java/com/elementmarket/wallet/web/HealthController.java`
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

### `wallet-service/src/main/java/com/elementmarket/wallet/web/MarketClient.java`
Masadan satış fiyatını bulmak için katalog (ticker) ve bileşik servislerine HTTP ile soran istemci.

| Fonksiyon | Ne yapar |
|---|---|
| `MarketClient(settings, http)` | İstemciyi Spring Boot'un `RestClient.Builder`'ından kurar; böylece `spring.http.client` bağlantı/okuma zaman aşımları uygulanır. |
| `resolveBid(symbol)` | Ticker'daki `bid` değerini, yoksa `last × (1 − spread)` değerini döner; servis yoksa ya da fiyat yoksa boş döner. |
| `resolveCompound(symbol, compoundSlug)` | Saf element için çarpanı 1 olan `elemental` teklifini döner; diğer slug'ları bileşik servisinden doğrulayıp çarpan, formül ve etiketle döner. |
| `isPlainElementSlug(compoundSlug, upperSymbol)` | Slug boşsa, `elemental` ise, sembolün kendisiyse ya da `elemental-<sembol>` ise doğru döner. |
| `chooseLabel(compound, formula)` | Etiket olarak önce Türkçe adı, sonra İngilizce adı, en son formülü seçer. |
| `number(node, camelName, pascalName)` | Sayıyı iki yazımdan biriyle okur; yoksa 0 döner. |
| `textOrEmpty(node, camelName, pascalName)` | Metni iki yazımdan biriyle okur; yoksa boş metin döner. |
| `CompoundQuote` (record) | Satılan ürünün slug, formül, etiket ve fiyat çarpanını taşır. |

### `wallet-service/src/main/java/com/elementmarket/wallet/web/WalletController.java`
Kullanıcıya dönük cüzdan API'sinin HTTP adaptörü: yetki, girdi doğrulama ve JSON biçimi burada; iş `WalletService`'te.

| Fonksiyon | Ne yapar |
|---|---|
| `wallet(key, userId)` | Yetkiyi kontrol eder, bakiyeyi `{balanceElx, currency, updatedAt}` olarak döner. |
| `holdings(key, userId)` | Yetkiyi kontrol eder, holding'leri kablo biçimine çevirip liste olarak döner. |
| `sell(key, userId, body)` | Girdiyi (sembol, gram aralığı, `compoundSlug` biçimi) doğrular, fiyatı ve ürünü işlem açılmadan önce bulur, aşağı kesilmiş tutar 0 ise reddeder, satışı `WalletService.sell` ile yapar ve satış özetini döner. |
| `toHoldingJson(holding)` | Holding'i `{symbol, grams, avgCostElx, compoundSlug, productLabel}` biçimine çevirir; etiket yoksa sembolü kullanır. |
| `isAuthorized(key, userId)` | İç servis anahtarı doğruysa ve `X-User-Id` geçerli bir UUID ise doğru döner. |
| `secretsEqual(expected, provided)` | İki anahtarı sabit sürede karşılaştırır, böylece yanıt süresi anahtarı sızdırmaz. |
| `badRequest(error)` | `{error}` gövdeli 400 yanıtı üretir. |
| `unauthorized()` | `{error: "Unauthorized"}` gövdeli 401 yanıtı üretir. |

### `wallet-service/src/main/resources/application.yml`
Port, veritabanı, RabbitMQ, cüzdan ayarları ve Actuator ayarlarını ortam değişkenlerine bağlayan yapılandırma dosyası. Ayrıca: şema hatasında açılış durur (`continue-on-error: false`), kapanış adımı başına 5 sn sınır (`timeout-per-shutdown-phase`), katalog/bileşik HTTP çağrıları için 2 sn bağlantı ve 5 sn okuma zaman aşımı, dinleyici için 5 denemeli yeniden deneme (1 sn başlangıç, ×2 artış).

### `wallet-service/src/main/resources/schema.sql`
Açılışta çalışan şema: `wallets`, `holdings`, `ledger`, `processed_messages` ve `outbox` tabloları, sipariş başına tek `buy` / tek `refund` kaydını garanti eden benzersiz indeksler ve kod yanlış olsa bile veritabanının uyguladığı CHECK kısıtları (bakiye, gram ve defter tutarı negatif olamaz; defter türü dört değerden biridir). Kısıtlar `NOT VALID` eklenir: her yeni yazımı denetler ama eski satırları taramaz, böylece eski bir satır açılışı yeniden başlatma döngüsüne sokamaz. Yayınlanmış outbox satırları 7 gün sonra silinir.

### `wallet-service/Dockerfile` ve `wallet-service/pom.xml`
Maven ile derleyip JRE 21 Alpine imajında `app.jar` olarak çalıştıran Docker tarifi ve bağımlılık listesi. İmaj `nobody` kullanıcısıyla çalışır, sağlık kontrolü taban imajdaki busybox `wget`'i kullanır ve JVM bellek bitince (`-XX:+ExitOnOutOfMemoryError`) kapanır ki Docker yeniden başlatsın. Derlemeden önce kaynak dosyaların zamanları yenilenir: Testcontainers gibi bağlamı 1970 tarihli gönderen derleyicilerde Maven aksi halde `schema.sql`'i jar'a koymaz.

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5434/element_wallet_db` | Cüzdan veritabanının adresi. |
| `SPRING_DATASOURCE_USERNAME` | `postgres` | Veritabanı kullanıcı adı. |
| `SPRING_DATASOURCE_PASSWORD` | `<yerel-varsayılan>` | Veritabanı parolası (yalnızca yerel geliştirme varsayılanı). |
| `RABBITMQ_HOST` | `localhost` | RabbitMQ sunucusu. |
| `RABBITMQ_PORT` | `5672` | RabbitMQ portu. |
| `RABBITMQ_USERNAME` | `guest` | RabbitMQ kullanıcı adı. |
| `RABBITMQ_PASSWORD` | `<yerel-varsayılan>`| RabbitMQ parolası. |
| `CREDIT_LIMIT` | `50000` | Tek bir siparişte düşülebilecek en yüksek KREDI tutarı (`wallet.credit-limit`). |
| `WALLET_WELCOME_GRANT` | `10000` | Yeni cüzdana yazılan hoş geldin bakiyesi; herkese açık kurulum 1000 kullanır. |
| `CATALOG_SERVICE_URL` | `http://localhost:5002` | Ticker (`bid`/`last`) için katalog servisinin adresi. |
| `COMPOUND_SERVICE_URL` | `http://localhost:5007` | Bileşik ürün bilgisi için bileşik servisinin adresi. |
| `MARKET_SPREAD_PCT` | `0.008` | Ticker'da `bid` yoksa `last` fiyatından düşülen oran. |
| `INTERNAL_API_KEY` | `<yerel-varsayılan>` | Kapıdan gelen isteklerin taşıması gereken iç servis anahtarı. |
| `OUTBOX_POLL_MS` | `500` | `OutboxRelay`'in bekleyen olaylara bakma aralığı (milisaniye). |
| `ELEMENT_ENV` | (boş) | `prod` ise üretim benzeri sayılır ve zayıf `INTERNAL_API_KEY` ile açılış engellenir. |
| `SPRING_PROFILES_ACTIVE` | (boş) | `production` ya da `prod` profili de üretim benzeri sayılır. |

## Testler

Domain testleri önce yazıldı (TDD): kural testi kırmızıyken kod yazıldı, sonra yeşile döndü.

- `domain/MoneyTest.java`: 4 hane, negatif tutarın reddi, satış tutarının aşağı kesilmesi (0,5 × 0,0001 → 0), birim fiyat.
- `domain/WalletTest.java`: kontrol sırası (tavan, mükerrer, iptal, bakiye), tavanın dahil olması, bakiyenin sıfırın altına inmemesi, iade ve mezar taşı, ikinci iadenin reddi, varlığın yalnız ödenmiş siparişe yazılması, satışın eldekiyle sınırlı olması.
- `domain/HoldingTest.java`: ağırlıklı ortalama maliyet, satışta ortalamanın korunması, fazla satışın reddi.
- `application/WalletServiceIntegrationTest.java`: Testcontainers ile gerçek PostgreSQL'e karşı ACID garantileri. Aynı cüzdana eşzamanlı 20 ödemeden tam 10'u geçer ve bakiye 0'da kalır (izolasyon). Outbox yazımı başarısız olursa bakiye, defter ve tekrar işareti birlikte geri alınır (atomiklik). Veritabanı negatif bakiyeyi reddeder (tutarlılık). Aynı teslim ikinci kez uygulanmaz. Relay her satırı satır kimliğiyle bir kez yollar, yayınlanamayan satırı beklemede bırakır. Docker yoksa bu testler atlanır.
- `MassTransitMessageTest.java`: zarftan olay adı, camelCase/PascalCase alanlar, `decimal` okuma ve verilen `messageId`'nin `publishBody` çıktısında korunması.

Uçtan uca akış (kayıt, cüzdan, alış, saga, holdings, masadan satış) `deploy/scripts/test-smoke.ps1` ile sınanır.

Çalıştırma (Maven kuruluysa, `wallet-service` klasöründe):

```powershell
mvn -q -B test
```

Maven kurulu değilse Docker ile (PowerShell, `wallet-service` klasöründe):

```powershell
docker run --rm -v "${PWD}:/build" -v element-m2:/root/.m2 -v /var/run/docker.sock:/var/run/docker.sock `
  -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal -e TESTCONTAINERS_RYUK_DISABLED=true `
  -w /build maven:3.9-eclipse-temurin-21 mvn -q -B test
```

Docker soketi bağlanmazsa entegrasyon testleri hata vermeden atlanır; sonuçta `Skipped` sayısına bakın. `pom.xml` Testcontainers'ı 1.21.4'e sabitler, çünkü Spring Boot 3.4.1'in getirdiği 1.20.4 Docker Engine 29'un kabul etmediği eski API sürümünü kullanır.
