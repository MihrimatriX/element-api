# Kargo servisi (shipment-service)

> Ödemesi alınan siparişe sahte bir kargo kaydı açar, takip numarası üretir ve sonucu sipariş akışına geri bildirir.

| Özellik | Değer |
|---|---|
| Teknoloji | .NET 10, ASP.NET Core, EF Core (Npgsql), MassTransit + RabbitMQ |
| Port | `127.0.0.1:5004` (Docker Compose, yalnız bu makineden; konteyner içi `8080`) · yerel `dotnet run`: `5155` |
| Klasör | `shipment-service/` |
| Veri | PostgreSQL `element_shipment_db`: `Shipments` (`OrderId` üzerinde unique index, `TrackingNumber` üzerinde index, durum CHECK kısıtları) ve MassTransit `InboxState` / `OutboxMessage` / `OutboxState` tabloları |
| Mesajlaşma | yayınlar: ShipmentDispatchedEvent, ShipmentFailedEvent · dinler: ShipmentRequestedEvent |

## Ne işe yarar?

Sipariş akışının (order-service saga) son adımıdır. Stok ayrılıp KREDI çekildikten sonra order-service `ShipmentRequestedEvent` yayınlar. Bu servis olayı `shipment-requested-queue` kuyruğundan alır, `Shipments` tablosuna bir kayıt yazar ve `TRK-0123456789ABCDEF` biçiminde (`TRK-` + 16 büyük harf hex, 64 bit rastgele; tahmin edilemez) bir takip numarası üretir. Ardından `ShipmentDispatchedEvent` yayınlar; saga bu yanıtla siparişi Completed durumuna taşır.

İsteğe bağlı bir "taşıyıcı limiti" vardır. `Shipment:FailQuantityGte` sıfırdan büyükse ve sipariş miktarı (gram) bu değere eşit ya da büyükse kayıt `Failed` olarak yazılır ve `ShipmentFailedEvent` yayınlanır. Varsayılan değer `0` olduğu için limit kapalıdır. Bu ayar hata senaryolarını denemek içindir.

Kargo kaydı servisin kök nesnesidir (aggregate). `ShipmentRecord.Open` siparişin kargosunu bir kez açar ve sonucu orada karar verir: taşıyıcı limiti aşılıyorsa `Failed` (takip numarası yok), aşılmıyorsa `Shipped` (takip numarası ve gönderim zamanıyla). Kayıt bundan sonra hiç değişmez; alanların dışarıdan yazılabilen hali yoktur. Bu kurallar veritabanı olmadan birim testleriyle denetlenir.

Sipariş başına tek kayıt vardır; bunu `OrderId` üzerindeki unique index sağlar. Aynı sipariş için istek ikinci kez gelirse (RabbitMQ yeniden teslimi ya da saga'nın yeni mesaj kimliğiyle tekrarı) yeni kayıt açılmaz, kayıtlı sonuç (aynı takip numarası ya da "Shipment previously failed") yeniden yayınlanır. Aynı mesaj kimliği ikinci kez gelirse MassTransit inbox'ı (`InboxState`) onu hiç çalıştırmadan atlar. İki kopya aynı anda işlenirse ikinci eklemeyi veritabanı reddeder (unique violation); kaybedenin işlemi, içindeki yanıtla birlikte geri alınır ve 5 sn sonraki yeniden denemede kayıtlı sonucu yayınlar. Böylece saga her durumda tek ve tutarlı bir yanıt alır.

Kayıt, inbox satırı ve saga'ya giden yanıt tek bir veritabanı işleminde onaylanır (MassTransit EF Core outbox): yanıt önce `OutboxMessage` tablosuna yazılır, işlem onaylanınca gönderilir. Kayıt yazılamazsa yanıt da gitmez. Veritabanı ayrıca `Status` yalnız `Shipped`/`Failed` olsun ve `Shipped` satırında takip numarası boş olmasın diye CHECK kısıtı tutar (`NOT VALID`, eski satırlar açılışı bozmasın diye).

REST tarafı yalnız okur: kayıtları arar, tek kaydı getirir ve takip numarasıyla sorgular. Her uç `INTERNAL_API_KEY` başlığı ister ve onu sabit zamanlı karşılaştırır. Anahtar yoksa, yanlışsa ya da serviste hiç tanımlanmamışsa 401 döner. Gateway bunlardan yalnız takip sorgusunu dışarı açar. Müşterinin `X-API-Key` anahtarını doğrular, `X-User-Id` ve `INTERNAL_API_KEY` başlıklarını kendisi yazar.

Bu servis gerçek bir kargo firmasıyla konuşmaz ve adrese bir şey göndermez. Ödeme almaz (wallet-service), stok düşmez (inventory-service), bildirim göndermez (notification-service).

## Uç noktalar

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/api/v1/shipments` | `INTERNAL_API_KEY` başlığı (gateway yayınlamaz) | `orderId`, `tracking`, `status`, `q`, `page`, `pageSize` ile kayıtları arar; en yeniden eskiye, sayfalı `{ count, page, pageSize, results }` döner. Anahtar yoksa/yanlışsa 401. |
| GET | `/api/v1/shipments/{id}` | `INTERNAL_API_KEY` başlığı (gateway yayınlamaz) | GUID ile tek kaydı döner; yoksa 404, anahtar yoksa/yanlışsa 401. |
| GET | `/api/v1/shipments/track/{trackingNumber}` | API anahtarı (gateway `X-API-Key` doğrular, `X-User-Id` ve `INTERNAL_API_KEY` ekler) | Kaydı takip numarası ve sahibi birlikte arayarak bulur; yalnız sahibine döner. `X-User-Id` GUID değilse, numara bilinmiyorsa veya başkasınınsa aynı 404. Anahtar yoksa/yanlışsa 401. |
| GET | `/` | Herkese açık | `/info` adresine yönlendirir. |
| GET | `/info` | Herkese açık | Servis adı, sürümü, ortamı ve `shipments` bağlantısını döner. |
| GET | `/health/live` | Herkese açık | Süreç ayakta mı (bağımlılık kontrolü yok). |
| GET | `/health/ready` | Herkese açık | PostgreSQL erişilebilir mi ve MassTransit'in `masstransit-bus` kontrolü (alıcı uçlar RabbitMQ'ya bağlı mı; bağlanana kadar 503). |
| GET | `/health` | Herkese açık | `/health/ready` ile aynı. |

## Mesajlar

| Yön | Olay | Ne zaman | Ne yapar |
|---|---|---|---|
| Dinler | `ShipmentRequestedEvent` | Order saga ödemeyi aldıktan sonra (`shipment-requested-queue`, hata olursa 5 sn arayla 3 deneme) | Kargo kaydını açar veya mevcut sonucu tekrar yayınlar. |
| Yayınlar | `ShipmentDispatchedEvent` | Kayıt `Shipped` olarak yazıldığında, tekrar gelen istekte zaten gönderilmişse veya eşzamanlı kopya istek kaydı önce yazmışsa (outbox'tan, işlem onaylandıktan sonra; zarf `messageId` / `messageType[0]` aynı kalır) | Saga'ya takip numarasını iletir; sipariş Completed olur. |
| Yayınlar | `ShipmentFailedEvent` | Miktar taşıyıcı limitini aştığında veya tekrar gelen istekte kayıt zaten `Failed` ise | Saga'ya hata nedenini iletir; sipariş Failed olur. |

## Kod haritası

`Data/Migrations/` klasörü burada fonksiyon fonksiyon listelenmez. İçinde `InitialCreate`, `AddShipmentIndexes`, `AddMassTransitOutbox` ve model anlık görüntüsü vardır. `AddShipmentIndexes` önce aynı siparişe ait yinelenen satırlardan en eskisini bırakıp diğerlerini siler, sonra `OrderId` için unique ve `TrackingNumber` için normal index ekler. `AddMassTransitOutbox` elle yazılmış SQL'dir: inbox/outbox tablolarını ve indekslerini `IF NOT EXISTS` ile, iki CHECK kısıtını yalnız yoksa ve `NOT VALID` olarak ekler; var olan bir veritabanında tekrar çalışsa da açılışı bozmaz. Model anlık görüntüsü elle düzeltilmez; modelle uyumunu `Migrations_MatchTheModel` testi denetler.

### `shipment-service/Element.Services.Shipment.API/Program.cs`
Servisi ayağa kaldıran başlangıç kodu: loglama, veritabanı, RabbitMQ tüketicisi, sağlık kontrolleri ve uç noktalar burada bağlanır.

| Fonksiyon | Ne yapar |
|---|---|
| Üst düzey başlangıç kodu | Serilog konsol logunu açar, `ShipmentDbContext`'i Npgsql ile kaydeder, MassTransit EF Core outbox'ını Postgres kilitleriyle, `ReadCommitted` yalıtımla ve 1 sn sorgu aralığıyla açar, `ShipmentRequestedConsumer`'ı inbox/outbox süzgeciyle `shipment-requested-queue` kuyruğuna bağlar (3 deneme, 5 sn arayla; her deneme yeni bir işlem), PostgreSQL sağlık kontrolünü ekler (RabbitMQ kontrolünü MassTransit kendisi kaydeder), controller'ları ve `/info` + `/health` uçlarını haritalar. Migration'ları `try` içinde uygular: veritabanı hiç açılmazsa `Fatal` loglar ve çıkış kodu 1 ile kapanır (restart politikası devralır). |

### `shipment-service/Element.Services.Shipment.API/Controllers/ShipmentsController.cs`
Kargo kayıtlarını okumak için yalnız iç ağa açık REST API; her istek `INTERNAL_API_KEY` ister.

| Fonksiyon | Ne yapar |
|---|---|
| `ShipmentsController(db, configuration)` | Veritabanı bağlamını ve beklenen `INTERNAL_API_KEY` için yapılandırmayı alır. |
| `Search(orderId, tracking, status, q, page, pageSize, ct)` | Anahtarı doğrular (değilse 401); filtrelere göre kayıtları arar; `page < 1` ise 1, `pageSize` 1 ile 100 arasında değilse 20 kullanır ve sayfalı sonuç döner. |
| `GetById(id, ct)` | Anahtarı doğrular (değilse 401); verilen GUID'e ait kaydı döner, bulunamazsa 404. |
| `Track(trackingNumber, ct)` | Anahtarı doğrular (değilse 401); `X-User-Id` GUID değilse 404; kaydı takip numarası ile sahibini birlikte (büyük/küçük harf duyarsız) arar, böylece başkasının numarası bilinmeyen numarayla aynı 404'ü alır. |
| `HasValidInternalKey()` | Gelen `INTERNAL_API_KEY` başlığını yapılandırmadakiyle sabit zamanlı karşılaştırır; yapılandırmada anahtar yoksa her zaman false (kapalı kalır). |

### `shipment-service/Element.Services.Shipment.API/ShipmentApiMarker.cs`
Entegrasyon testlerinin `WebApplicationFactory<ShipmentApiMarker>` ile bu API'yi başlatabilmesi için boş işaret sınıfı.

### `shipment-service/Element.Services.Shipment.Infrastructure/Consumers/ShipmentRequestedConsumer.cs`
Sahte taşıyıcı: `ShipmentRequestedEvent` mesajını işler, kaydı yazar ve sonucu yayınlar.

| Fonksiyon | Ne yapar |
|---|---|
| `ShipmentRequestedConsumer(context, logger, configuration)` | Bağımlılıkları alır ve `Shipment:FailQuantityGte` limitini okur (varsayılan 0 = kapalı). |
| `Consume(context)` | Siparişin kaydını okur; yoksa `ShipmentRecord.Open` ile açıp kaydeder. Sonra kayıt `Shipped` ise takip numarasıyla `ShipmentDispatchedEvent`, değilse `ShipmentFailedEvent` yayınlar (yeni kayıtta limit nedeni, tekrar gelende "Shipment previously failed"). Eşzamanlı kopya eklemeyi kaybederse hata fırlatır; işlem geri alınır ve yeniden deneme kayıtlı sonucu yayınlar. |
| `GenerateTrackingNumber()` | 8 kriptografik rastgele bayttan `TRK-` + 16 büyük harf hex biçiminde takip numarası üretir. |

### `shipment-service/Element.Services.Shipment.Infrastructure/Data/ShipmentDbContext.cs`
EF Core veritabanı bağlamı; `ShipmentRecord` varlığını `Shipments` tablosuna eşler.

| Fonksiyon | Ne yapar |
|---|---|
| `ShipmentDbContext(options)` | Host'un verdiği ayarlarla (üretimde Npgsql, testte bellek içi) bağlamı oluşturur. |
| `Shipments` | `Shipments` tablosundaki tüm kayıtlara erişim sağlar. |
| `OnModelCreating(modelBuilder)` | `Id` alanını birincil anahtar yapar, `OrderId` için unique ve `TrackingNumber` için normal index tanımlar, tablo adını `Shipments` olarak belirler; MassTransit inbox/outbox tablolarını modele ekler. |

### `shipment-service/Element.Services.Shipment.Infrastructure/Entities/ShipmentRecord.cs`
Tek bir kargo kaydı (Id, OrderId, CustomerId, ElementSymbol, Quantity, Status, TrackingNumber, CreatedAt, DispatchedAt); servisin kök nesnesi. Alanlar yalnız okunur (EF ve `Open` yazar); API bu nesneyi olduğu gibi JSON olarak döner, alan adları değişmedi.

| Fonksiyon | Ne yapar |
|---|---|
| `ShippedStatus` / `FailedStatus` | Saklanan iki durum metni: `Shipped` ve `Failed`. |
| `IsShipped` | Kayıt `Shipped` ise true (takip numarası vardır). |
| `ExceedsCarrierLimit(quantity, limitGrams)` | Limit sıfırdan büyükse ve miktar limite eşit ya da büyükse true döner. |
| `Open(orderId, customerId, elementSymbol, quantity, carrierLimitGrams, trackingNumber, now)` | Limit aşılıyorsa takip numarasız `Failed`, aşılmıyorsa takip numarası ve gönderim zamanıyla `Shipped` kayıt oluşturur; gönderilecek kayıtta takip numarası boşsa hata fırlatır. |

### `shipment-service/Element.Services.Shipment.API/appsettings.json`
Yalnızca log seviyelerini ve `AllowedHosts` değerini tutar; `appsettings.Development.json` aynı log ayarlarına ek olarak geliştirme `INTERNAL_API_KEY` değerini (`<yerel-varsayılan>`) içerir.

### `shipment-service/Element.Services.Shipment.API/Properties/launchSettings.json`
Yerel çalıştırma profilleri: `http://localhost:5155` ve `https://localhost:7090`, ortam `Development`.

### `shipment-service/Dockerfile`
Önce yalnız proje dosyalarıyla `restore`, sonra kaynakla tek adımda `publish` yapar; `aspnet:10.0` imajında root olmayan `$APP_UID` kullanıcısıyla 8080 portundan çalıştırır; sağlık kontrolü için `curl` kurar.

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `ConnectionStrings:DefaultConnection` (`ConnectionStrings__DefaultConnection`) | `Host=localhost;Port=5432;Database=element_shipment_db;Username=postgres;Password=<yerel-varsayılan>` | PostgreSQL bağlantısı; sağlık kontrolü de bunu kullanır. |
| `RabbitMQ:Host` (`RabbitMQ__Host`) | `localhost` | RabbitMQ sunucusu. |
| `RabbitMQ:Port` | `5672` | RabbitMQ portu. |
| `RabbitMQ:Username` | `guest` | RabbitMQ kullanıcı adı. |
| `RabbitMQ:Password` | `<yerel-varsayılan>`| RabbitMQ parolası. |
| `Shipment:FailQuantityGte` (`Shipment__FailQuantityGte`) | `0` (kapalı) | Bu gram değerine eşit veya büyük siparişleri reddeder; hata senaryosu denemek için. |
| `INTERNAL_API_KEY` | kodda yok (tanımsızsa her REST isteği 401), `appsettings.Development.json`'da ve Compose'ta `<yerel-varsayılan>` | REST uçlarının istediği servisler arası anahtar; gateway'deki değerle aynı olmalı. |
| `ASPNETCORE_ENVIRONMENT` | `Production` (Compose'ta `${ASPNETCORE_ENVIRONMENT:-Development}`) | `Production` ise ortak koruma, tanımlıysa `INTERNAL_API_KEY` / `JwtSettings:Secret` için geliştirme değerlerini reddeder. |
| `ASPNETCORE_URLS` | ASP.NET varsayılanı (Compose'ta `http://+:8080`) | Dinlenecek adres. |

## Testler

- `deploy/tests/Element.Services.UnitTests/Shipment/ShipmentRequestedConsumerTests.cs`:
  - `Consume_PersistsShipment_AndPublishesDispatchedEvent`: bellek içi veritabanı ve MassTransit test harness ile limit 100 g iken 25 g'lık siparişin `Shipped` olarak kaydedildiğini, takip numarasının `^TRK-[0-9A-F]{16}$` biçiminde olduğunu ve `ShipmentDispatchedEvent` yayınlandığını doğrular.
  - `Consume_RepeatedRequest_RepublishesTheStoredTrackingNumber_WithoutASecondShipment`: kaydı zaten olan siparişe tekrar gelen isteğin ikinci satır açmadan kayıtlı takip numarasını yayınladığını doğrular.
  - `Consume_OverTheCarrierLimit_StoresAFailedShipment_AndPublishesFailed`: limit üstü siparişin `Failed` olarak saklandığını ve "carrier limit" nedeniyle `ShipmentFailedEvent` yayınlandığını doğrular.
  - `Migrations_MatchTheModel`: elle yazılan migration'ların model anlık görüntüsüyle uyumlu olduğunu (`HasPendingModelChanges` false) doğrular.
- `deploy/tests/Element.Services.UnitTests/Shipment/ShipmentsControllerTests.cs`:
  - `Track_AnotherCustomersNumber_LooksExactlyLikeAnUnknownOne`: başkasının takip numarasının da bilinmeyen numaranın da aynı 404'ü döndüğünü doğrular.
  - `Track_Owner_GetsTheShipment_RegardlessOfGuidCase`: sahibinin, `X-User-Id` büyük harfle gelse bile kaydını aldığını doğrular.
  - `EveryEndpoint_RequiresTheInternalKey`: anahtar gelmediğinde, yanlış geldiğinde ve serviste tanımlı olmadığında üç ucun da 401 döndüğünü doğrular.
- `deploy/tests/Element.Services.UnitTests/Shipment/ShipmentRecordTests.cs` (önce test yazıldı): limit altında `Shipped` + takip numarası + gönderim zamanı, limitte ve üstünde takip numarasız `Failed`, limit 0 iken sınırsız, gönderilecek kayıtta boş takip numarasının reddi ve limit kuralının sınır değerleri.
- `deploy/tests/Element.Services.IntegrationTests/SagaFlowIntegrationTests.cs` (`Category=Integration`, Docker gerekir): gerçek order, catalog ve shipment servisleriyle saga'nın Completed olduğunu uçtan uca doğrular.
- `deploy/tests/Element.Services.IntegrationTests/ShipmentOutboxIntegrationTests.cs` (`Category=Integration`, Docker gerekir):
  - `ConcurrentAndRedeliveredRequests_OpenOneShipment_AndEveryReplyHasItsTrackingNumber`: aynı sipariş için 5 farklı mesaj kimliğiyle eşzamanlı istek ve birinin aynı kimlikle yeniden teslimi gönderilir; tabloda tek satır kalır, tam 5 yanıt gelir (yinelenen kimlik inbox'ta atlanır) ve hepsi aynı takip numarasını, `messageId` ve `messageType[0]` URN'ini taşır.
  - `Database_RejectsAShippedRowWithoutTrackingNumber`: takip numarasız `Shipped` satırı CHECK hatası (23514) ile reddedilir.

Birim testlerini çalıştırmak için:

```bash
dotnet test deploy/tests/Element.Services.UnitTests/Element.Services.UnitTests.csproj --filter "Category!=Integration"
```

Yalnızca bu servisin birim testleri:

```bash
dotnet test deploy/tests/Element.Services.UnitTests/Element.Services.UnitTests.csproj --filter "FullyQualifiedName~Element.Services.UnitTests.Shipment"
```
