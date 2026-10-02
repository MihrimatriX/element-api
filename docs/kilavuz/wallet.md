# Cüzdan servisi (wallet-service)

> Kullanıcının KREDI bakiyesini, hareket defterini (ledger) ve sahip olduğu gramları (holdings) tutar; sipariş ödemelerini düşer, iadeleri yapar ve masadan geri satışı yönetir.

| Özellik | Değer |
|---|---|
| Teknoloji | Java 21, Spring Boot 3.4 (Web, JDBC, AMQP, Actuator) |
| Port | `5005` (konteyner içinde `8080`) |
| Klasör | `wallet-service` |
| Veri | PostgreSQL `element_wallet_db` (tablolar: `wallets`, `ledger`, `holdings`, `processed_messages`) |
| Mesajlaşma | yayınlar: PaymentProcessedEvent, PaymentFailedEvent, ElementSoldEvent · dinler: PaymentRequestedEvent, PaymentRefundRequestedEvent, AssetsCreditedEvent |

## Ne işe yarar?

Üründeki tüm "para" işleri bu serviste döner. Para birimi kâğıt üzerindeki **KREDI**'dir; gerçek bir banka ya da kart tahsilatı yoktur. Kullanıcı cüzdanına ilk kez baktığında (`GET /api/v1/me/wallet`) hesabı otomatik açılır ve hesaba bir **hoş geldin bakiyesi** yazılır (yerelde 10.000, herkese açık kurulumda 1.000 KREDI).

Bir alış şöyle akar: sipariş servisi stok ayrıldıktan sonra RabbitMQ üzerinden `PaymentRequestedEvent` yollar. Cüzdan önce tek seferlik tavanı (varsayılan 50.000 KREDI) kontrol eder, sonra cüzdan satırını kilitler, bu sipariş için daha önce para düşülüp düşülmediğine ve siparişin daha önce iade edilip edilmediğine bakar, bakiye yetiyorsa düşer ve `PaymentProcessedEvent` yayınlar. Bakiye yetmezse, tavan aşılırsa ya da sipariş zaten iade edilmişse (`ORDER_CANCELLED`) `PaymentFailedEvent` yayınlar. Sipariş sonradan başarısız olur ya da zaman aşımına uğrarsa gelen `PaymentRefundRequestedEvent` ile düşülen tutar bir kez geri yazılır. Henüz para düşülmemişse yine de **0 KREDI'lik bir `refund` kaydı (mezar taşı)** yazılır; böylece geç gelen ya da `wallet-service_failed` kuyruğundan yeniden oynatılan ödeme isteği siparişi ücretlendiremez. Sevkiyat tamamlanınca gelen `AssetsCreditedEvent` ile alınan gramlar kullanıcının holdings'ine eklenir ve ağırlıklı ortalama maliyet yeniden hesaplanır; bu yalnızca kullanıcının gerçekten ödediği ve iade edilmemiş bir sipariş için yapılır, aksi halde mesaj hata verip yeniden denenir ve sonunda bekletme kuyruğuna düşer.

Masadan satışta (`POST /api/v1/desk/sell`) kullanıcı elindeki gramları geri satar. Servis fiyatı katalogdan (ticker'daki `bid`, yoksa `last` eksi spread) ve gerekirse bileşik servisinden (`priceMult`) öğrenir, holdings'ten düşer, KREDI ekler ve `ElementSoldEvent` yayınlar; böylece stok servisi stoğu geri koyar, katalog da fiyatı aşağı iter. Satış tutarı (`bid × gram`) 4 haneye **aşağı kesilir**; yuvarlama hiçbir zaman işlemin değerinden fazla ödeme yapmaz ve 0'a kesilen satışlar reddedilir. Satış veritabanına yazıldıktan sonra olay yayını başarısız olursa yalnızca uyarı loglanır ve istek yine 200 döner (500 dönmek istemcinin tekrar deneyip iki kez satmasına yol açardı). Katalog ve bileşik servislerine yapılan HTTP çağrılarında bağlantı (2 sn) ve okuma (5 sn) zaman aşımı vardır.

Her gelen mesaj tek bir veritabanı işleminde (transaction) işlenir ve `processed_messages` tablosuna bir kez yazılır; aynı mesaj ikinci kez gelirse sessizce atlanır. Böylece RabbitMQ'nun yeniden teslimleri çift ödeme ya da çift iade yaratmaz; işlem yarıda kalırsa işaret de geri alınır ve yeniden teslim gerçekten uygulanır. Hata veren mesaj artan beklemeyle (1 sn'den başlayıp ikiye katlanarak) 5 kez denenir, yine olmazsa `wallet-service_failed` kuyruğuna park edilir. RabbitMQ yeniden başlarken dinleyici kalıcı olarak durmaz, bağlanmayı denemeye devam eder.

Bu servis **bilerek** şunları yapmaz: sipariş kaydı tutmaz (order-service), stok ayırmaz (inventory-service), fiyat belirlemez (catalog-service) ve gerçek para çekmez. Kablodaki `balanceElx`, `avgCostElx`, `proceedsElx`, `INSUFFICIENT_ELX` gibi adlar eski sözleşmeden kalmadır ve bilinçli olarak korunur; değer her zaman KREDI'dir.

## Uç noktalar

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/api/v1/me/wallet` | API anahtarı (kapıda) + İç servis anahtarı + `X-User-Id` | Kullanıcının bakiyesini, para birimini (`KREDI`) ve son güncelleme zamanını döner; cüzdan yoksa hoş geldin bakiyesiyle açar. |
| GET | `/api/v1/me/holdings` | API anahtarı (kapıda) + İç servis anahtarı + `X-User-Id` | Kullanıcının sahip olduğu gramları sembol/bileşik bazında ortalama maliyet ve ürün adıyla listeler. |
| POST | `/api/v1/desk/sell` | API anahtarı (kapıda) + İç servis anahtarı + `X-User-Id` | Gövde `{symbol, grams, compoundSlug?}`; sembol 1-3 harf, gram 0,0001–1.000.000 arası, `compoundSlug` verilirse `[a-z0-9-]{1,64}` olmalıdır (boş slug saf element sayılır). Gramları güncel alış fiyatından satar, KREDI ekler, `ElementSoldEvent` yayınlar ve `{symbol, grams, bid, proceedsElx, balanceElx, currency}` döner. Hatalı girişte 400 (`symbol and grams are required.`, `Could not determine bid for '<SEMBOL>'.`, `Unknown product.`, `Sale amount is too small.`, `No holdings for this symbol.`, `Insufficient holdings.`), yetkisizde 401 döner. |
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
| Yayınlar | `ElementSoldEvent` | `POST /api/v1/desk/sell` başarılı olduğunda. | Stok servisinin gramları stoğa geri koymasını, kataloğun fiyatı aşağı itmesini tetikler (`{elementSymbol, grams, customerId}`; `grams` gerçekten satılan, 4 haneye yuvarlanmış miktardır). Yayın en iyi çabayla yapılır; başarısız olursa satış geri alınmaz, yalnızca loglanır. |

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

### `wallet-service/src/main/java/com/elementmarket/wallet/ledger/LedgerRules.java`
Veritabanına dokunmayan saf kurallar ve ortak sabitler (`AMOUNT_SCALE = 4`, `DEFAULT_COMPOUND_SLUG = "elemental"`).

| Fonksiyon | Ne yapar |
|---|---|
| `evaluateDebit(amount, creditLimit)` | Tutar boşsa, sıfır/negatifse ya da tavanı aşıyorsa `LIMIT`, aksi halde `PROCEED` döner (tavan dahil). |
| `canAfford(balance, amount)` | Bakiye tutarı karşılıyorsa doğru döner; değerlerden biri boşsa yanlış döner. |
| `proceeds(bid, grams)` | Masadan satış tutarını `bid × gram` olarak hesaplar ve 4 haneye aşağı keser; yuvarlama hiçbir zaman fazla ödeme yapmaz. |

### `wallet-service/src/main/java/com/elementmarket/wallet/ledger/LedgerRepository.java`
Cüzdan, defter ve holdings tablolarına JDBC ile erişen, para hareketlerini kilitli ve tekrar güvenli yapan depo sınıfı.

| Fonksiyon | Ne yapar |
|---|---|
| `tryMarkProcessed(messageId, eventType, orderId)` | Mesaj kimliğini bir kez kaydeder; daha önce işlenmişse yanlış döner. Dinleyicinin işlemine katılır, böylece işaret defter işiyle birlikte geri alınabilir. |
| `ensureWallet(userId)` | Cüzdan yoksa hoş geldin bakiyesiyle açar ve defterine `grant` kaydı yazar; güncel bakiyeyi döner. |
| `getWallet(userId)` | Cüzdanı gerekirse açıp `balance_elx` ve `updated_at` satırını döner. |
| `getHoldings(userId)` | Kullanıcının sıfırdan büyük holdings satırlarını sembol ve bileşik sırasıyla döner. |
| `debit(userId, orderId, amount, symbol, grams)` | Tavanı, aynı sipariş için önceki `buy` kaydını, önceki `refund` kaydını (iptal edilmiş sipariş) ve bakiyeyi kontrol edip tutarı düşer; `OK`, `DUPLICATE`, `INSUFFICIENT`, `LIMIT` ya da `CANCELLED` döner. |
| `refundIfDebited(userId, orderId, symbol, grams)` | Sipariş için `refund` kaydı yoksa, bu kullanıcının `buy` tutarını bakiyeye geri yazar; `buy` yoksa bakiyeye dokunmadan 0 tutarlı `refund` mezar taşı yazar. |
| `addHolding(userId, orderId, symbol, grams, unitCost, compoundSlug, productLabel)` | Siparişin bu kullanıcı tarafından ödendiğini ve iade edilmediğini doğrular (değilse `IllegalStateException` fırlatır), sonra holdings'e gram ekler; satır varsa ağırlıklı ortalama maliyeti 4 haneye yuvarlayarak günceller. |
| `sellAtBid(userId, symbol, grams, bid, compoundSlug)` | Holdings'ten gram düşer (sıfırlanırsa satırı siler), `LedgerRules.proceeds` ile aşağı kesilmiş `bid × gram` tutarını bakiyeye ekler, `sell` kaydı yazar ve sonucu döner. |
| `lockWalletAndReadBalance(userId)` | Cüzdan satırını işlem sonuna kadar kilitler (`FOR UPDATE`) ve bakiyeyi döner. |
| `readBalance(userId)` | Güncel bakiyeyi kilitlemeden okur. |
| `hasOrderLedgerEntry(orderId, kind)` | Sipariş için verilen türde (`buy`/`refund`) defter kaydı olup olmadığını söyler. |
| `addToBalance(userId, signedAmount)` | Bakiyeye işaretli tutar ekler (düşmek için negatif) ve `updated_at` alanını yeniler. |
| `insertOrderLedgerEntry(kind, userId, amount, symbol, grams, orderId)` | Siparişe bağlı bir `buy` ya da `refund` defter kaydı ekler. |
| `SellResult.fail(reason)` | Başarısız satış sonucunu (`no_holding` / `over_holding`) üretir. |
| `SellResult.ok(symbol, grams, bid, proceeds, balanceElx)` | Başarılı satış sonucunu rakamlarıyla üretir. |

### `wallet-service/src/main/java/com/elementmarket/wallet/messaging/MassTransitMessage.java`
.NET ve Node servisleriyle aynı MassTransit zarf biçimini okuyup yazan yardımcı sınıf; alan adlarını hem camelCase hem PascalCase kabul eder.

| Fonksiyon | Ne yapar |
|---|---|
| `typeOf(body, mapper)` | Zarftaki `messageType` URN'inden kısa olay adını çıkarır; yoksa boş (null) döner. |
| `messageOf(body, mapper)` | Zarftaki `message` gövdesini, zarf yoksa tüm belgeyi döner. |
| `messageIdOf(body, mapper)` | Zarftaki `messageId` değerini döner; yoksa null döner. |
| `text(message, camelName, pascalName)` | Metin alanını iki yazımdan biriyle okur; bulunamazsa null döner. |
| `number(message, camelName, pascalName)` | Sayı alanını iki yazımdan biriyle okur; bulunamazsa 0 döner. |
| `publishBody(mapper, typeName, payload)` | Yükü yeni `messageId` ve `conversationId` ile MassTransit zarfına sarıp bayt dizisine çevirir. |
| `headers(typeName)` | MassTransit tüketicilerinin beklediği `MT-Message-Type` ve `Content-Type` başlıklarını üretir. |
| `exchange(typeName)` | Olay adına karşılık gelen exchange adını (`Element.Shared.Events:<Ad>`) döner. |
| `findField(message, camelName, pascalName)` | İki yazımdan ilk dolu (null olmayan) alanı bulur. |

### `wallet-service/src/main/java/com/elementmarket/wallet/messaging/EventPublisher.java`
Olayları MassTransit zarfıyla RabbitMQ'ya yayınlayan bileşen. Outbox yoktur: dinleyici olayları kendi veritabanı işleminin içinde yayınlar (işlem başarısız olursa yeniden teslimde tekrar yayınlanır), masadan satış ise kayıttan sonra yayınlar.

| Fonksiyon | Ne yapar |
|---|---|
| `publish(typeName, payload)` | Yükü olay adıyla aynı isimli fanout exchange'e doğru başlıklarla gönderir. |

### `wallet-service/src/main/java/com/elementmarket/wallet/messaging/WalletListener.java`
`wallet-service` kuyruğunu dinleyip ödeme, iade ve varlık olaylarını işleyen tüketici.

| Fonksiyon | Ne yapar |
|---|---|
| `onMessage(message)` | Her teslimi tek bir veritabanı işleminde işler: olay türünü ve sipariş kimliğini okur, mesajı bir kez işlendi olarak işaretler ve türüne göre ilgili işleyiciye yollar. |
| `resolveMessageId(body, eventType, orderId)` | Zarftaki `messageId`'yi kullanır; yoksa olay türü ve siparişten sabit bir kimlik türetir. |
| `handlePayment(orderId, customerId, payload)` | Ödemeyi düşer ve sonucu `PaymentProcessedEvent` ya da `PaymentFailedEvent` (`INSUFFICIENT_ELX`, tavan mesajı ya da `ORDER_CANCELLED`) olarak yayınlar. |
| `handleRefund(orderId, customerId, payload)` | Müşteri belliyse siparişin iadesini yapar (düşülmemişse 0 tutarlı mezar taşı yazılır). |
| `handleAssets(orderId, customerId, payload)` | Geçerli sembol, miktar ve fiyat varsa gramları birim maliyetle holdings'e ekler; ödenmemiş/iade edilmiş siparişte defterin fırlattığı hata mesajı yeniden denemeye gönderir. |

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
Kullanıcıya dönük cüzdan API'si: bakiye, holdings ve masadan satış.

| Fonksiyon | Ne yapar |
|---|---|
| `wallet(key, userId)` | Yetkiyi kontrol eder, bakiyeyi `{balanceElx, currency, updatedAt}` olarak döner. |
| `holdings(key, userId)` | Yetkiyi kontrol eder, holdings satırlarını kablo biçimine çevirip liste olarak döner. |
| `sell(key, userId, body)` | Girdiyi (sembol, gram aralığı, `compoundSlug` biçimi) doğrular, fiyatı ve ürünü bulur, aşağı kesilmiş tutar 0 ise reddeder, satışı yapar, `ElementSoldEvent` yayınlar ve satış özetini döner. |
| `publishElementSold(upperSymbol, soldGrams, userId)` | Gerçekten satılan gramlarla masadan satış olayını oluşturup yayınlar; yayın başarısız olursa satış zaten kaydedildiği için yalnızca uyarı loglar. |
| `toHoldingJson(holdingRow)` | Veritabanı satırını `{symbol, grams, avgCostElx, compoundSlug, productLabel}` biçimine çevirir; etiket yoksa sembolü kullanır. |
| `isAuthorized(key, userId)` | İç servis anahtarı doğruysa ve `X-User-Id` geçerli bir UUID ise doğru döner. |
| `secretsEqual(expected, provided)` | İki anahtarı sabit sürede karşılaştırır, böylece yanıt süresi anahtarı sızdırmaz. |
| `badRequest(error)` | `{error}` gövdeli 400 yanıtı üretir. |
| `unauthorized()` | `{error: "Unauthorized"}` gövdeli 401 yanıtı üretir. |

### `wallet-service/src/main/resources/application.yml`
Port, veritabanı, RabbitMQ, cüzdan ayarları ve Actuator ayarlarını ortam değişkenlerine bağlayan yapılandırma dosyası. Ayrıca: şema hatasında açılış durur (`continue-on-error: false`), kapanış adımı başına 5 sn sınır (`timeout-per-shutdown-phase`), katalog/bileşik HTTP çağrıları için 2 sn bağlantı ve 5 sn okuma zaman aşımı, dinleyici için 5 denemeli yeniden deneme (1 sn başlangıç, ×2 artış).

### `wallet-service/src/main/resources/schema.sql`
Açılışta çalışan şema: `wallets`, `holdings`, `ledger`, `processed_messages` tabloları ve sipariş başına tek `buy` / tek `refund` kaydını garanti eden benzersiz indeksler.

### `wallet-service/Dockerfile` ve `wallet-service/pom.xml`
Maven ile derleyip JRE 21 Alpine imajında `app.jar` olarak çalıştıran Docker tarifi ve bağımlılık listesi. İmaj `nobody` kullanıcısıyla çalışır, sağlık kontrolü taban imajdaki busybox `wget`'i kullanır ve JVM bellek bitince (`-XX:+ExitOnOutOfMemoryError`) kapanır ki Docker yeniden başlatsın. Derlemeden önce kaynak dosyaların zamanları yenilenir: Testcontainers gibi bağlamı 1970 tarihli gönderen derleyicilerde Maven aksi halde `schema.sql`'i jar'a koymaz.

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5434/element_wallet_db` | Cüzdan veritabanının adresi. |
| `SPRING_DATASOURCE_USERNAME` | `postgres` | Veritabanı kullanıcı adı. |
| `SPRING_DATASOURCE_PASSWORD` | `mysecretpassword` | Veritabanı parolası (yalnızca yerel geliştirme varsayılanı). |
| `RABBITMQ_HOST` | `localhost` | RabbitMQ sunucusu. |
| `RABBITMQ_PORT` | `5672` | RabbitMQ portu. |
| `RABBITMQ_USERNAME` | `guest` | RabbitMQ kullanıcı adı. |
| `RABBITMQ_PASSWORD` | `guest` | RabbitMQ parolası. |
| `CREDIT_LIMIT` | `50000` | Tek bir siparişte düşülebilecek en yüksek KREDI tutarı (`wallet.credit-limit`). |
| `WALLET_WELCOME_GRANT` | `10000` | Yeni cüzdana yazılan hoş geldin bakiyesi; herkese açık kurulum 1000 kullanır. |
| `CATALOG_SERVICE_URL` | `http://localhost:5002` | Ticker (`bid`/`last`) için katalog servisinin adresi. |
| `COMPOUND_SERVICE_URL` | `http://localhost:5007` | Bileşik ürün bilgisi için bileşik servisinin adresi. |
| `MARKET_SPREAD_PCT` | `0.008` | Ticker'da `bid` yoksa `last` fiyatından düşülen oran. |
| `INTERNAL_API_KEY` | `element-internal-dev-key` | Kapıdan gelen isteklerin taşıması gereken iç servis anahtarı. |
| `ELEMENT_ENV` | (boş) | `prod` ise üretim benzeri sayılır ve zayıf `INTERNAL_API_KEY` ile açılış engellenir. |
| `SPRING_PROFILES_ACTIVE` | (boş) | `production` ya da `prod` profili de üretim benzeri sayılır. |

## Testler

- `wallet-service/src/test/java/com/elementmarket/wallet/ledger/LedgerRulesTest.java`: `evaluateDebit` için boş, sıfır, negatif ve tavan üstü tutarların reddedildiğini, tavanın dahil olduğunu; `canAfford` için bakiye karşılaştırmasını; `proceeds` için tutarın 4 haneye aşağı kesildiğini (0,5 × 0,0001 → 0) doğrular.
- `wallet-service/src/test/java/com/elementmarket/wallet/MassTransitMessageTest.java`: MassTransit zarfından olay adı, camelCase/PascalCase alanlar, null alanlarda geri düşme ve varsayılanlar ile `publishBody` çıktısının tekrar okunabildiğini doğrular.

Veritabanı ve RabbitMQ gerektiren akışlar birim testlerle değil, platformun duman/uçtan uca betikleriyle (`deploy/scripts/test-smoke.ps1`, `deploy/scripts/test-e2e.mjs`) sınanır.

Çalıştırma (Maven kuruluysa, `wallet-service` klasöründe):

```powershell
mvn -q -B test
```

Maven kurulu değilse Docker ile (PowerShell, `wallet-service` klasöründe):

```powershell
docker run --rm -v "${PWD}:/build" -v element-m2:/root/.m2 -w /build maven:3.9-eclipse-temurin-21 mvn -q -B test
```
