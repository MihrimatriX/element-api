# Ortak kütüphane (shared-lib)

> Bütün .NET servislerinin paylaştığı kod: mesaj sözleşmeleri, loglama, sağlık uçları, hata yakalama, RabbitMQ ayarı ve bilimsel katalog motoru.

| Özellik | Değer |
|---|---|
| Teknoloji | .NET 10 sınıf kütüphanesi (`Element.Shared`), MassTransit 8.3, EF Core 9, Serilog, RabbitMQ.Client |
| Port | Yok (kendi başına çalışan bir süreç değildir) |
| Klasör | `shared-lib/` |
| Veri | yok |
| Mesajlaşma | Kendisi yayınlamaz ve dinlemez; servislerin kullandığı 16 olay sözleşmesini tanımlar |

## Ne işe yarar?

shared-lib bir servis değil, bir kütüphanedir. gateway, identity, catalog, compound, shipment ve notification servisleri onu `ProjectReference` ile projelerine ekler. Amaç, her servisin aynı şekilde log yazması, aynı sağlık uçlarını sunması, hataları aynı JSON biçiminde döndürmesi ve RabbitMQ'ya aynı ayarlarla bağlanmasıdır.

En kritik parça `Events/` klasörüdür. Sipariş akışındaki (saga) bütün mesajların tip adı ve alanları burada tanımlıdır. MassTransit mesaj adresini (URN) tip adından ve `Element.Shared.Events` ad alanından üretir. order-service (Node) ve wallet/inventory (Java) bu DLL'i yüklemez ama aynı adları taklit eder; bu yüzden buradaki bir tipin ya da alanın adını değiştirmek üç dilde birden değişiklik ister, aksi halde mesajlar sessizce kaybolur.

`Science/ScientificCatalog.cs` bilimsel v2 API'nin motorudur: catalog servisi elementler, compound servisi bileşikler için, bağımsız bilim atlası (science-service) ise her ikisi için onu kullanır. Bilim atlası bu dosyayı doğrudan derlediği için dosya shared-lib içindeki başka hiçbir koda bağımlı olmamalıdır.

Kütüphane bilinçli olarak şunları içermez: iş kuralı (fiyat, stok, ödeme mantığı servislerde kalır), veritabanı şeması, `/metrics` ya da `/health-ui` uçları.

## Uç noktalar

shared-lib kendi başına uç açmaz. Aşağıdaki uçlar, `MapStandardOpsEndpoints` çağıran her .NET servisinde (gateway, identity, catalog, compound, shipment, notification) aynı şekilde bulunur.

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/info` | Herkese açık | Servisin adını, sürümünü, ortamını ve servisin verdiği bağlantıları döndürür. |
| GET | `/health/live` | Herkese açık | Hiçbir bağımlılığı denetlemeden sürecin cevap verdiğini gösterir. |
| GET | `/health/ready` | Herkese açık | Servisin kaydettiği bütün sağlık kontrollerini (PostgreSQL, gateway'de Redis) çalıştırır; RabbitMQ için ayrı bir kontrol yoktur. |
| GET | `/health` | Herkese açık | `/health/ready` ile aynı yanıt. |

## Mesajlar

shared-lib mesaj yayınlamaz ve dinlemez; aşağıdaki olayların sözleşmesini tanımlar. "Yön" sütunundaki "Tanımlar" bunu ifade eder; kimin yayınlayıp kimin dinlediği "Ne zaman" ve "Ne yapar" sütunlarında yazılıdır.

| Yön | Olay | Ne zaman | Ne yapar |
|---|---|---|---|
| Tanımlar | `OrderSubmittedEvent` | order-service yeni bir sipariş aldığında yayınlar. | inventory-service dinler ve siparişin stoğunu ayırmaya çalışır. |
| Tanımlar | `StockReservedEvent` | inventory-service stoğu ayırdığında yayınlar. | order-service saga'sı dinler ve ödeme talebine geçer. |
| Tanımlar | `StockReservationFailedEvent` | inventory-service stoğu ayıramadığında yayınlar. | order-service saga'sı dinler ve siparişi başarısız sayar. |
| Tanımlar | `PaymentRequestedEvent` | Stok ayrıldıktan sonra order-service yayınlar. | wallet-service dinler ve müşterinin KREDI bakiyesinden düşer. |
| Tanımlar | `PaymentProcessedEvent` | wallet-service ödemeyi aldığında yayınlar. | order-service saga'sı dinler ve kargo talebine geçer. |
| Tanımlar | `PaymentFailedEvent` | wallet-service ödemeyi alamadığında (ör. yetersiz bakiye) yayınlar. | order-service saga'sı dinler, siparişi başarısız sayar ve stoğu bıraktırır. |
| Tanımlar | `PaymentRefundRequestedEvent` | Sipariş iptal olduğunda ya da zaman aşımına uğradığında order-service yayınlar. | wallet-service dinler ve düşülmüş KREDI'yi iade eder. |
| Tanımlar | `AssetsCreditedEvent` | Kargo yola çıktıktan sonra order-service yayınlar. | wallet-service dinler ve satın alınan gramları müşterinin varlıklarına yazar. |
| Tanımlar | `OrderStockReleaseEvent` | Sipariş başarısız olduğunda order-service yayınlar. | inventory-service dinler ve ayrılan stoğu geri bırakır. |
| Tanımlar | `ElementPriceChangedIntegrationEvent` | catalog-service bir elementin piyasa fiyatı değiştiğinde (fiyat simülatörü, tamamlanan sipariş, desk satışı) yayınlar. | Fiyat değişimini duyurur; şu an depoda bu olayı dinleyen bir servis yoktur. |
| Tanımlar | `OrderCompletedEvent` | Sipariş başarıyla tamamlandığında order-service yayınlar. | inventory-service dinler ve ayrılan stoğu kalıcı olarak düşer; catalog-service dinler ve son fiyatı yukarı iter. |
| Tanımlar | `UpdateOrderStatusEvent` | order-service siparişin durumu değiştiğinde yayınlar. | notification-service dinler ve durumu kullanıcının kayıtlı webhook adreslerine iletir. |
| Tanımlar | `ElementSoldEvent` | wallet-service masada (desk) bir satış yapıldığında yayınlar. | catalog-service ve inventory-service dinler; stok geri eklenir ve son fiyat aşağı itilir. |
| Tanımlar | `ShipmentRequestedEvent` | Ödeme alındıktan sonra order-service yayınlar. | shipment-service dinler ve kargoyu oluşturur. |
| Tanımlar | `ShipmentDispatchedEvent` | shipment-service kargoyu yola çıkardığında yayınlar. | order-service saga'sı dinler, takip numarasını kaydeder ve siparişi tamamlar. |
| Tanımlar | `ShipmentFailedEvent` | shipment-service kargoyu oluşturamadığında yayınlar. | order-service saga'sı dinler, siparişi başarısız sayar, stoğu bıraktırır ve iade ister. |

## Kod haritası

### `shared-lib/Events/IntegrationEvents.cs`
Sipariş, stok, ödeme, fiyat ve desk satışı olaylarının (`OrderSubmittedEvent` … `ElementSoldEvent`) yalnızca veri taşıyan record tanımlarıdır; mantık içermez.

### `shared-lib/Events/ShipmentEvents.cs`
Kargo olaylarının (`ShipmentRequestedEvent`, `ShipmentDispatchedEvent`, `ShipmentFailedEvent`) yalnızca veri taşıyan record tanımlarıdır.

### `shared-lib/Extensions/DatabaseExtensions.cs`
Servis açılırken veritabanını hazırlayan yardımcı. Yeniden başlatmada Docker bütün konteynerleri aynı anda açtığı için Postgres henüz hazır olmayabilir; bu yüzden geçici hatalarda 2 saniye arayla en fazla 30 deneme (yaklaşık 60 sn) yapılır, sonra hata fırlatılır ve `restart: unless-stopped` devreye girer.

| Fonksiyon | Ne yapar |
|---|---|
| `ApplyDatabaseAsync<TContext>(app, databaseLabel)` | Verilen EF Core bağlamı için bekleyen migration'ları uygular ve sonucu loglar; geçici hatada uyarı loglayıp bekler ve yeniden dener, kalıcı hatada ya da deneme hakkı bitince hatayı loglayıp servisin açılmasını durdurur. |
| `IsTransientStartupError(ex)` | Hatanın "Postgres henüz ulaşılamaz/hazır değil" (beklemeye değer) türünden olup olmadığını söyler. Şu an her hata için false döner (hangi hataların yeniden deneneceği henüz kararlaştırılmadı, kodda `TODO(human)` notu var); yani pratikte yeniden deneme yapılmaz. |

### `shared-lib/Extensions/LoggingExtensions.cs`
Bütün servislerde aynı biçimde JSON konsol logu üretir.

| Fonksiyon | Ne yapar |
|---|---|
| `AddConsoleLogging(builder, applicationName)` | Önce production sırlarını denetler, sonra Serilog'u uygulama adı ve ortam bilgisiyle sıkıştırılmış JSON yazacak şekilde kurar. |
| `UseRequestLogging(app)` | Her HTTP isteği için yöntem, yol, durum kodu ve süreyi içeren tek satırlık log yazar. |

### `shared-lib/Extensions/ProductionConfiguration.cs`
Production ortamında geliştirme sırlarıyla açılmayı engelleyen güvenlik ağı.

| Fonksiyon | Ne yapar |
|---|---|
| `ValidateProductionConfiguration(builder)` | Ortam Production ise `INTERNAL_API_KEY` ve `JwtSettings:Secret` tanımlıysa zayıf olup olmadıklarına bakar, zayıfsa hata fırlatır. |
| `IsDevelopmentSecret(secretValue)` | Değer 32 karakterden kısaysa, "ChangeMe" içeriyorsa ya da git geçmişinde açıkta olan bilinen geliştirme sırlarından biriyse (`<yerel-varsayılan>`, eski JWT geliştirme sırrı) true döner. |

### `shared-lib/Extensions/RabbitMqExtensions.cs`
`RabbitMQ:*` ayarlarını her MassTransit veri yolu için aynı varsayılanlarla okur.

| Fonksiyon | Ne yapar |
|---|---|
| `ConfigureRabbitMqHost(cfg, configuration)` | MassTransit RabbitMQ veri yolunu ayarlardaki sunucu, port ve kimlik bilgilerine bağlar (varsayılan localhost:5672, guest/guest). |

### `shared-lib/Extensions/ServiceOpsExtensions.cs`
Her servisin sunduğu standart operasyon uçlarını ekler.

| Fonksiyon | Ne yapar |
|---|---|
| `MapStandardOpsEndpoints(app, serviceName, links)` | `/info`, `/health/live`, `/health/ready` ve `/health` uçlarını ekler; canlılık hiçbir kontrol çalıştırmaz, hazırlık hepsini çalıştırır. |

### `shared-lib/Health/HealthCheckResponseWriter.cs`
Sağlık uçlarının kısa ve her serviste aynı olan JSON gövdesini yazar.

| Fonksiyon | Ne yapar |
|---|---|
| `WriteJsonResponse(context, report)` | `{ status, checks: [{ name, ok, ms }] }` biçiminde genel durumu ve her kontrolün sonucunu yazar. |

### `shared-lib/Middleware/ExceptionHandlingMiddleware.cs`
Yakalanmamış her hatayı loglayıp HTML yerine JSON 500 yanıtı döndüren son savunma hattı.

| Fonksiyon | Ne yapar |
|---|---|
| `ExceptionHandlingMiddleware(next, logger, environment)` | Sonraki ara katmanı, logger'ı ve ortam bilgisini saklar. |
| `InvokeAsync(context)` | İsteği çalıştırır; hata olursa loglar ve yanıt henüz başlamadıysa hatadan önce eklenmiş başlıkları (ör. `Cache-Control`) temizleyip JSON problem gövdesi yazar; böylece hata yanıtı önbelleğe alınmaz (hata ayrıntısı yalnızca Development'ta görünür). |
| `UseGlobalExceptionHandling(app)` | Bu ara katmanı istek hattına ekler. |

### `shared-lib/Science/ScientificCatalog.cs`
Bilimsel element ve bileşik kayıtlarını salt okunur olarak sunan motor: arama, filtre, sayfalama, alan seçimi (projeksiyon) ve ETag önbelleği.

| Fonksiyon | Ne yapar |
|---|---|
| `ScientificCatalog(filename, elements)` | `Data/<dosya>` JSON'unu belleğe yükler, boşsa hata fırlatır, her kaydın aranabilir metnini bir kez hesaplayıp saklar ve element mi bileşik mi kurallarının kullanılacağını belirler. |
| `Read(request, response, identifier)` | Kimlik verildiyse tek kaydı, verilmediyse filtrelenmiş ve sayfalanmış listeyi döndürür; hatalı sorguda 400, bulunamayan kayıtta 404 verir. |
| `Project(record, paths)` | Kayıttan yalnızca istenen nokta yollarını (ör. `atomic_properties.atomic_mass`) iç içe yapıyı koruyarak yeni bir nesneye kopyalar. |
| `ResolveView(requestedView, identifier)` | `view` boşsa tek kayıtta `full`, listede `summary` seçer; başka bir değer gelirse hata verir. |
| `EnsurePathsExist(paths)` | `include` ve `fields` içindeki her yolun gerçekten var olduğunu ilk kayda bakarak doğrular. |
| `ChooseProjectionPaths(view, include, fields)` | `fields` varsa onu, `full` görünümde bütün bölümleri, `summary` görünümde özet listesi ile `include` alanlarını seçer. |
| `BuildPagedList(request, paths)` | Kayıtları filtreler, istenen sayfayı keser ve `info` (sayı, sayfa, önceki/sonraki bağlantı) ile `results` nesnesini kurar. |
| `PageLink(targetPage)` | `BuildPagedList` içindeki yerel yardımcı; sayfa aralık dışındaysa null, değilse o sayfanın bağlantısını döndürür. |
| `FilterRecords(query)` | `q` serbest metin aramasını (önceden hesaplanmış arama metinleri üzerinde) ve elementlere özel `category`, `block`, `group`, `period` filtrelerini uygular. |
| `BuildPageLink(request, targetPage, pageSize)` | Mevcut sorgu parametrelerini koruyup yalnızca `page` ve `pageSize` değerini (büyük/küçük harf duyarsız, `Page=` gibi yazımlar dahil) değiştirerek sayfa bağlantısı üretir. |
| `CachedJson(request, response, json)` | Gövdenin özetinden zayıf bir ETag üretir, `Cache-Control` ekler ve istemci aynı sürüme sahipse 304 döndürür. |
| `MatchesIdentifier(record, identifier)` | Elementte id, sembol veya atom numarasını; bileşikte id, slug veya PubChem CID'yi büyük/küçük harf duyarsız eşleştirir. |
| `EqualsIgnoreCase(node, value)` | Bir JSON değerinin metin halini verilen değerle büyük/küçük harf duyarsız karşılaştırır. |
| `Fold(value)` | Metni küçük harfe çevirip aksanları ve Türkçe "ı" farkını kaldırır; "bakır", "bakir" ve "BAKIR" aynı sayılır. |
| `SearchText(record)` | Kaydın aranabilir metnini (id, sembol, atom numarası, tüm dillerdeki adlar, formül, PubChem CID) üretir; yalnızca kurucuda bir kez çağrılır. |
| `ParsePositiveInt(value, fallback, max, name)` | Boş değerde varsayılanı döndürür; aksi halde 1 ile üst sınır arasında bir tam sayı bekler. |
| `ParsePaths(value)` | Virgülle ayrılmış yol listesini okur; en fazla 2048 karakter, 32 yol ve 6 seviye derinliğe izin verir. |
| `PathExists(record, path)` | Nokta yolunun her parçasının bir nesne alanı olarak var olup olmadığını söyler (dizilerin içine girilmez). |

Proje dosyası: `Element.Shared.csproj` (paket bağımlılıkları). `README.md` kütüphanenin kısa tanıtımıdır.

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `RabbitMQ:Host` | `localhost` | RabbitMQ sunucusunun adı. |
| `RabbitMQ:Port` | `5672` | RabbitMQ portu; geçersiz bir sayı verilirse MassTransit için 5672 kullanılır. |
| `RabbitMQ:Username` | `guest` | RabbitMQ kullanıcı adı. |
| `RabbitMQ:Password` | `<yerel-varsayılan>`| RabbitMQ şifresi. |
| `INTERNAL_API_KEY` | yok | Servisler arası iç anahtar; Production'da tanımlıysa en az 32 karakter olmalı, "ChangeMe" içermemeli ve geliştirme anahtarı olmamalıdır. |
| `JwtSettings:Secret` | yok | JWT imza sırrı; Production'da `INTERNAL_API_KEY` ile aynı kurallarla denetlenir. |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Production'da sır denetimi açılır; Development'ta hata yanıtlarında hata mesajı gösterilir. |

## Testler

- `deploy/tests/Element.Services.UnitTests/Element/ScientificCatalogTests.cs`: kimlik eşleştirme (Fe, FE, 26, fe-26), projeksiyonun null değerleri koruduğunu, hatalı sorguların 400 aldığını, sayfa bağlantılarının filtreleri koruduğunu, `include` ile özetin genişlediğini, ETag ile 304 döndüğünü ve `Cache-Control: public, max-age=3600` yazıldığını, `Page`/`PageSize` gibi farklı harf büyüklüklü anahtarlarla bile `next` bağlantısının geçerli kaldığını, Türkçe/ASCII aramanın çalıştığını ve filtrelerle birleştiğini, aspirin kaydının doğru olduğunu denetler.
- `deploy/tests/Element.Services.UnitTests/Element/OrderSubmittedConsumerTests.cs` ve `Shipment/ShipmentRequestedConsumerTests.cs`: shared-lib olay tiplerini kullanan tüketicileri denetler.
- Diğer parçalar (loglama, sağlık uçları, hata yakalama, veritabanı hazırlığı, RabbitMQ ayarı) servislerin entegrasyon testlerinde dolaylı olarak çalışır.

Çalıştırmak için:

```powershell
dotnet build shared-lib/Element.Shared.csproj
dotnet test deploy/tests/Element.Services.UnitTests/Element.Services.UnitTests.csproj --filter "Category!=Integration"
```
