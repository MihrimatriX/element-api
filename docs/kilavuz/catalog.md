# Katalog servisi (catalog-service)

> 118 elementin bilimsel kaydını, sanal KREDI piyasa fiyatını, kategorilerini ve istatistiklerini sunan servis.

| Özellik | Değer |
|---|---|
| Teknoloji | .NET 10 (ASP.NET Core Web API), EF Core 9 + Npgsql, MassTransit 8 (RabbitMQ), Serilog, Swashbuckle |
| Port | Docker: `5002` → konteyner `8080` · yerel `dotnet run`: `5033` (http), `7199` (https) |
| Klasör | `catalog-service/` |
| Veri | PostgreSQL `element_market_db` (elementler, fiyat geçmişi, kategoriler, sipariş işaret satırları, MassTransit `InboxState` / `OutboxMessage` / `OutboxState` tabloları) + `Data/scientific-elements.json` ve `Data/element-properties.json` dosyaları |
| Mesajlaşma | yayınlar: ElementPriceChangedIntegrationEvent · dinler: OrderCompletedEvent, ElementSoldEvent |

## Ne işe yarar?

Periyodik tablodaki element verisi bu servisten gelir. Servisin iki API sürümü vardır. Bilimsel API (v2) `scientific-elements.json` anlık görüntüsünü olduğu gibi okur. Burada fiyat, stok veya uydurma değer yoktur; bilinmeyen alan `null` kalır. Piyasa API'si (v1) veritabanındaki elementleri döner: arama, filtreleme, sıralama, karşılaştırma, periyodik komşular, fiyat geçmişi, ticker (last/bid/ask) ve piyasa panosu.

Bir istek şöyle akar: tarayıcı → gateway (`:5000`) → bu servis. Controller isteği alır ve `EfElementRepository` ile 118 satırı veritabanından çeker (liste 5 saniyelik ortak bellek içi anlık görüntüden gelir, aşağıya bakın). Sıralama, filtreleme ve istatistik işini saf C# sınıfı `ElementAnalytics` yapar. Sonucu `ElementDtoMapper` herkese açık JSON'a çevirir. JSON'daki fiziksel değerler (kütle, yoğunluk, erime noktası...) veritabanındaki eski tohum değerlerinden gelmez; kaynağı belli olan `element-properties.json` dosyasından gelir. Bağlantılar (`links`) `PUBLIC_API_BASE` ya da `X-Forwarded-*` başlıklarına göre üretilir.

Fiyatların hepsi simülasyondur. `PriceSimulator` her 15 saniyede her elementin fiyatını ±%0,4 oynatır, geçmişe yazar ve `ElementPriceChangedIntegrationEvent` yayınlar. Saatte bir 2 günden eski fiyat geçmişini siler, böylece `PriceHistories` tablosu sınırsız büyümez. Bir sipariş tamamlanınca (`OrderCompletedEvent`) fiyat biraz yukarı, masada satış olunca (`ElementSoldEvent`) biraz aşağı itilir. Hareketin büyüklüğünü `MarketMaker` hesaplar (en fazla %3).

Önbellek iki katmanlıdır. Sunucu içinde `IMemoryCache` (Redis yok, her kopyanın kendi önbelleği vardır) tüm element listesini ve piyasa panosunu 5 saniye (`EfElementRepository.SnapshotTtl`) tutar. Liste, arama, istatistik ve pano okumaları bu süre içinde tek sorguyu paylaşır. Tek element okuması (`GetBySymbol*`) bilerek önbelleğe alınmaz, çünkü order- ve wallet-service işlem fiyatını ticker'dan canlı okur. HTTP tarafında `[ResponseCache]` yalnız `Cache-Control` başlığı koyar: kategoriler 300 sn, canlı fiyat taşıyan yanıtlar 5 sn, `random` hiç önbelleğe alınmaz, anahtarlı `history` yalnız istemcide (private) 5 sn tutulur.

Açılışta migration'lar `try` bloğunun içinde uygulanır. Veritabanına hiç bağlanılamazsa servis `Fatal` loglar ve çıkış kodu 1 ile kapanır (yeniden başlatma politikası devreye girer).

Bu servis stok ayırmaz ve düşmez; gram stok `inventory-service`'tedir. Eski, kayıtsız stok tüketicileri (`OrderSubmittedConsumer`, `OrderStockReleaseConsumer`) ve onların kilidi `StockTransaction` silindi. Bileşik/ürün listesi `compound-service`'tedir. Servisin kendisinde kimlik doğrulama yoktur; fiyat geçmişi için API anahtarını gateway ister.

### Fiyat kuralları ve tutarlılık

Fiyatı yalnız element nesnesi değiştirir (ADR 0003). `ChemicalElement.RecordTrade` alış ya da satıştan sonra fiyatı `MarketMaker` kuralıyla iter, `ChemicalElement.Tick` simülatörün küçük oynamasını uygular; ikisi de yeni fiyat geçmişi noktasını döner. Fiyat hiçbir zaman 0,0001 tabanının altına inmez. Bir sipariş ya da masa satışı fiyatı en çok bir kez iter: bunu `StockReservations` tablosundaki işaret satırı (`StockReservation.ForCompletedOrder` / `ForDeskSale`, `IsPriced`) sağlar. Bu kurallar veritabanı olmadan birim testleriyle denetlenir.

Her mesaj tek bir veritabanı işleminde (transaction) işlenir. MassTransit'in EF Core outbox'ı açıktır: yayınlanan olay önce `OutboxMessage` tablosuna, fiyat değişikliğiyle aynı işlemde yazılır; işlem onaylanınca gönderilir. İşlem geri alınırsa olay da hiç gitmez. Tüketici tarafında inbox vardır: aynı mesaj kimliği ikinci kez gelirse (`InboxState`) atlanır. Fiyatı değiştiren her yol önce element satırını `SELECT … FOR UPDATE` ile kilitler; aynı elemente aynı anda gelen iki sipariş sırayla işlenir ve biri ötekinin fiyatını ezemez. Simülatör de her turu tek işlemde yapar ve satırları `Id` sırasıyla kilitler. Veritabanı ayrıca `PricePerGram > 0`, işaret satırında `Quantity > 0` ve geçerli `Status` kurallarını CHECK kısıtıyla korur (eski satırlar yüzünden açılış bozulmasın diye `NOT VALID`).

## Uç noktalar

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/api/v1` | Herkese açık | Tüm kaynakların örnek bağlantılarını listeler (keşif uç noktası). |
| GET | `/api/v1/elements` | Herkese açık | Elementleri sayfalı listeler; `category`, `block`, `phase`, `group`, `period`, `minPrice`, `maxPrice`, `inStock`, `sort`, `order`, `page`, `pageSize` (1–100, varsayılan 20) destekler. next/prev bağlantıları gönderilen tüm diğer parametreleri korur. `Cache-Control: max-age=5`. |
| GET | `/api/v1/elements/search?q=` | Herkese açık | İngilizce ad, Türkçe ad, sembol veya atom numarasında arar; `q` yoksa ya da 120 karakteri aşarsa 400. |
| GET | `/api/v1/elements/random` | Herkese açık | Rastgele bir element döner; yanıt önbelleğe alınmaz (`no-store`). |
| GET | `/api/v1/elements/compare?symbols=au,ag` | Herkese açık | 2–6 elementi yan yana koyar ve en ucuz/pahalı/ağır/hafif/yüksek erime/yoğun olanı söyler. |
| GET | `/api/v1/elements/{symbol}` | Herkese açık | Tek elementi sembolle (büyük/küçük harf fark etmez) döner; yoksa 404. |
| GET | `/api/v1/elements/{symbol}/neighbors` | Herkese açık | Periyodik tabloda sağ, sol, üst ve alt komşu hücreleri döner. |
| GET | `/api/v1/elements/{symbol}/related?limit=6` | Herkese açık | Aynı kategoride atom numarasına en yakın elementleri döner (1–20). |
| GET | `/api/v1/elements/{symbol}/history?limit=20` | API anahtarı (gateway `X-API-Key`) | Son fiyat noktalarını en yeniden eskiye döner (1–365); yalnız istemci 5 sn saklayabilir (`private`). |
| GET | `/api/v1/elements/{symbol}/ticker` | Herkese açık | Last, bid, ask, 24 saatlik değişim/yüksek/düşük, hacim, sparkline ve stok gösterir. |
| GET | `/api/v1/categories` | Herkese açık | 15 kategoriyi bağlantılarıyla listeler (`Cache-Control: max-age=300`). |
| GET | `/api/v1/categories/{slug}` | Herkese açık | Tek kategoriyi slug ile döner (ör. `noble-gas`). |
| GET | `/api/v1/categories/{slug}/elements` | Herkese açık | Kategorideki elementleri sayfalı döner; `pageSize` 1–100 (varsayılan 20), canlı fiyat taşıdığı için `max-age=5`. |
| GET | `/api/v1/statistics` | Herkese açık | Tüm katalog için sayım, ortalama/medyan fiyat ve liderleri döner. |
| GET | `/api/v1/statistics/category/{name}` | Herkese açık | Aynı istatistiği kategori adı bu metni içeren elementler için hesaplar; hiç yoksa 404. |
| GET | `/api/v1/market/board` | Herkese açık | Her element için last, bid, ask ve 24 saatlik değişimi tek çağrıda döner (ısı haritası); pano sunucuda 5 sn paylaşılır. |
| GET | `/api/v1/market/movers?limit=12` | Herkese açık | 24 saatte en çok oynayan elementleri mutlak değişime göre sıralar (1–50). |
| GET | `/api/v2/elements` | Herkese açık | Bilimsel element listesi; `view=summary\|full`, `include`, `fields`, `q` (en çok 120 karakter, filtrelerle birleşir), `category`, `block`, `group`, `period`, `page`, `pageSize` (1–100); ETag ve `Cache-Control: public, max-age=3600` destekli. |
| GET | `/api/v2/elements/{identifier}` | Herkese açık | Tek bilimsel kayıt; sembol (`fe`), atom numarası (`26`) veya kimlik (`fe-26`) kabul eder. |
| GET | `/info` | Herkese açık | Servis adı, sürüm, ortam ve bağlantılar. |
| GET | `/health`, `/health/ready` | Herkese açık | PostgreSQL dahil hazır olma kontrolü. |
| GET | `/health/live` | Herkese açık | Sadece sürecin ayakta olduğunu söyler. |
| GET | `/swagger` | Herkese açık | Swagger arayüzü ve `swagger/v1/swagger.json`. |

## Mesajlar

| Yön | Olay | Ne zaman | Ne yapar |
|---|---|---|---|
| Yayınlar | `ElementPriceChangedIntegrationEvent` | Fiyat simülatörünün her turunda ve her fiyat itişinden sonra | Yeni fiyatı ve zamanı diğer servislere duyurur. |
| Dinler | `OrderCompletedEvent` | Sipariş saga'sı (order-service) siparişi tamamlayınca | Fiyatı alış yönünde biraz yukarı iter; aynı sipariş ikinci kez gelirse yok sayar. |
| Dinler | `ElementSoldEvent` | Kullanıcı masada (wallet-service) gram sattığında | Fiyatı satış yönünde biraz aşağı iter; mesaj kimliğine göre tek sefer çalışır. |

Not: `OrderSubmittedEvent` ve `OrderStockReleaseEvent` bu servisle ilgili değildir; stok ayırma inventory-service'tedir. Başarısız mesajlar 5 saniye arayla 3 kez yeniden denenir; her deneme yeni bir işlemdir. Olaylar outbox'tan en geç ~1 saniye içinde gönderilir ve en az bir kez teslim edilir, MassTransit zarfı (`messageId`, `messageType[0]` URN) değişmez. Sayılar zarfta MassTransit'in her zamanki gibi metin olarak yazılır (`"newPrice": "75.4311"`).

## Kod haritası

### `Element.Services.Element.API/Program.cs`
Servisin başlangıç kodu: veritabanı, RabbitMQ, arka plan işleri, Swagger, sağlık kontrolleri ve uç noktalar burada bağlanır.

| Fonksiyon | Ne yapar |
|---|---|
| `Program` (üst düzey kod) | Loglamayı, `ElementDbContext`'i, bellek içi önbelleği (`AddMemoryCache`), iki tüketiciyi, `PriceSimulator`'ı (`PriceSimulator:Enabled` açıksa) ve `ElementDetailSeeder`'ı kaydeder. MassTransit EF Core outbox'ını Postgres kilitleriyle, `ReadCommitted` yalıtımla ve 1 sn sorgu aralığıyla açar (`UseBusOutbox` simülatörün yayınlarını da kapsar); her tüketici ucuna inbox/outbox süzgecini ekler. `try` içinde migration'ları uygulayıp uygulamayı çalıştırır, hata olursa çıkış kodunu 1 yapar. |

### `Element.Services.Element.API/PublicBaseUrl.cs`
Yanıtlardaki bağlantılar için dışarıdan görünen adresi bulur.

| Fonksiyon | Ne yapar |
|---|---|
| `Resolve(request, config)` | Önce `PUBLIC_API_BASE` değerini, yoksa `X-Forwarded-Proto/Host` başlıklarını, o da yoksa isteğin kendi adresini kullanır. |

### `Element.Services.Element.API/MarketOptions.cs`
`Market` yapılandırma bölümünü (spread oranı) taşır.

| Fonksiyon | Ne yapar |
|---|---|
| `EffectiveSpreadPct` | Ayarlı spread pozitifse onu, değilse `MarketMaker.DefaultSpreadPct` (0,008) değerini verir. |

### `Element.Services.Element.API/Controllers/ApiInfoController.cs`
`/api/v1` keşif uç noktası.

| Fonksiyon | Ne yapar |
|---|---|
| `ApiInfoController(configuration)` | Bağlantı adresi için yapılandırmayı alır. |
| `GetApiInfo()` | Tüm v1/v2 kaynaklarının örnek bağlantılarını sözlük olarak döner. |

### `Element.Services.Element.API/Controllers/ElementsController.cs`
Element listesi, arama, karşılaştırma, komşular, fiyat geçmişi ve ticker uç noktaları. Sınıf düzeyinde `[ResponseCache(Duration = 5)]` vardır.

| Fonksiyon | Ne yapar |
|---|---|
| `ElementsController(repository, market)` | Depoyu ve piyasa ayarlarını alır. |
| `GetAll(page, pageSize, category, block, phase, group, period, minPrice, maxPrice, inStock, sort, order)` | Filtreyi kurar, `ElementAnalytics.Query` ile süzer/sıralar ve sayfalı döner. |
| `Search(q, page, pageSize)` | `q` boşsa veya 120 karakteri (`MaxSearchLength`) aşarsa 400 döner; değilse ad, Türkçe ad, sembol ve atom numarasında arar, sayfalı döner. |
| `GetBySymbol(symbol)` | Sembolle tek elementi bulur; yoksa 404 döner. |
| `GetRandom()` | Listeden rastgele bir element seçer. |
| `Compare(symbols)` | Virgüllü 2–6 sembolü doğrular, istenen sırayı koruyarak elementleri ve metrik kazananlarını döner. |
| `GetNeighbors(symbol)` | Elementin periyodik tablo komşularını döner. |
| `GetRelated(symbol, limit)` | Aynı kategoride atom numarasına en yakın elementleri döner; geçersiz `limit` 6 olur. |
| `GetPriceHistory(symbol, limit)` | Son fiyat noktalarını döner; geçersiz `limit` 20 olur. |
| `GetTicker(symbol)` | Last/bid/ask, 24 saatlik açılışa göre değişim, yüksek/düşük (SQL'de `GetPriceRangeSinceAsync` ile toplanır; güncel fiyat her zaman hesaba katılır), hacim, 24 noktalık sparkline ve stok içeren ticker'ı üretir. |
| `GetBaseUrl()` | İstek için dışa açık adresi `PublicBaseUrl` ile hesaplar. |
| `MapToDto(element)` | Elementi `ElementDtoMapper` ile yanıt nesnesine çevirir. |
| `ElementNotFound(symbol)` | "Element bulunamadı" 404 yanıtını tek yerde üretir. |
| `NormalizePage(page)` | 1'den küçük sayfayı 1 yapar. |
| `NormalizePageSize(pageSize)` | 1'den küçük boyutu 20'ye, 100'den büyüğü 100'e çeker. |
| `Paginate(source, page, pageSize, path)` | Bellekteki listeden bir sayfa keser (atlama sayısı taşmasın diye `long` ile hesaplanır) ve `info` (sayı, sayfa, next/prev) bloğunu kurar; next/prev bağlantıları çağıranın `page`/`pageSize` dışındaki tüm parametrelerini kaçışlı olarak tekrarlar. |
| `IsPagingKey(key)` | Anahtar büyük/küçük harf fark etmeksizin `page` veya `pageSize` ise `true` döner (bağlantıda çift anahtar oluşmasın diye). |

### `Element.Services.Element.API/Controllers/CategoriesController.cs`
Kategori listesi ve kategoriye göre element sayfalama. Kategoriler deploy ile değişen tohum verisi olduğu için sınıf 300 sn, element sayfası 5 sn `Cache-Control` taşır; tüm sorgular `AsNoTracking`'dir.

| Fonksiyon | Ne yapar |
|---|---|
| `CategoriesController(context)` | Veritabanı bağlamını alır. |
| `GetAll()` | Tüm kategorileri kimliğe göre sıralı döner. |
| `GetBySlug(slug)` | Slug ile kategori bulur; yoksa 404 döner. |
| `GetElements(slug, page, pageSize)` | `pageSize`'ı 1–100 aralığına çeker (1'den küçükse 20), kategori adıyla eşleşen elementleri veritabanında sayfalar (OFFSET taşmasın diye `long` hesap) ve bağlantılarıyla döner. |
| `GetBaseUrl()` | Dışa açık adresi hesaplar. |
| `FindCategoryAsync(slug)` | Büyük/küçük harf duyarsız slug araması yapar. |
| `CategoryNotFound(slug)` | "Kategori bulunamadı" 404 yanıtını üretir. |
| `MapToDto(category)` | Kategoriyi `self` ve `elements` bağlantılarıyla yanıt nesnesine çevirir. |

### `Element.Services.Element.API/Controllers/MarketController.cs`
Piyasa panosu ve en çok hareket edenler. Sınıf düzeyinde `[ResponseCache(Duration = 5)]` vardır.

| Fonksiyon | Ne yapar |
|---|---|
| `MarketController(repository, market, cache)` | Depoyu, piyasa ayarlarını ve bellek içi önbelleği alır. |
| `Movers(limit)` | Panodan 24 saatlik değişimi olanları mutlak değere göre sıralayıp ilk `limit` kadarını döner. |
| `Board()` | Tüm elementlerin pano satırlarını döner. |
| `BuildBoardAsync(ct)` | Panoyu `market:board` anahtarıyla `SnapshotTtl` (5 sn) boyunca önbellekten verir; süre dolmuşsa `ComputeBoardAsync`'i çağırır. |
| `ComputeBoardAsync(ct)` | Her element için 24 saat önceki ilk fiyatı bulur, bid/ask ve değişimi hesaplayıp `BoardRow` listesi üretir. |
| `BoardRow(...)` | Tek elementin pano satırı (sembol, last, değişim, bid, ask, stok, para birimi, kaynak, zaman). |

### `Element.Services.Element.API/Controllers/ScientificElementsController.cs`
v2 bilimsel element uç noktaları; işi paylaşılan `ScientificCatalog` sınıfına bırakır.

| Fonksiyon | Ne yapar |
|---|---|
| `List()` | Bilimsel listeyi süzme, projeksiyon, sayfalama ve ETag ile döner. |
| `Get(identifier)` | Sembol, atom numarası veya kimlikle tek bilimsel kaydı döner. |

### `Element.Services.Element.API/Controllers/StatisticsController.cs`
Katalog istatistikleri. Sınıf düzeyinde `[ResponseCache(Duration = 5)]` vardır.

| Fonksiyon | Ne yapar |
|---|---|
| `StatisticsController(repository)` | Depoyu alır. |
| `GetOverview()` | Tüm elementler için `ElementAnalytics.ComputeStatistics` sonucunu döner. |
| `GetByCategory(name)` | Kategori adını içeren elementlerin istatistiğini döner; hiç yoksa 404. |

### `Element.Services.Element.API/DTOs/ElementDtoMapper.cs`
Veritabanındaki elementi herkese açık v1 JSON şekline çevirir.

| Fonksiyon | Ne yapar |
|---|---|
| `ToDto(element, baseUrl)` | Referans dosyasındaki değerleri tercih ederek detay, medya, ticaret, piyasa ve bağlantı bloklarını doldurur; 10 g fiyatı 120 KREDI ve üstüyse ücretsiz kargo işaretler. |
| `BuildLinks(element, baseUrl)` | `self`, `history`, `ticker`, `compounds`, `category` ve PubChem bağlantılarını üretir. |

### `Element.Services.Element.API/DTOs/ElementResponseDto.cs`
Sadece veri sınıfları: `ElementResponseDto` ve alt blokları `ElementDetailInfo`, `ElementMediaInfo`, `ElementCommerceInfo`, `ElementMarketInfo` (alan sırası JSON sırasıdır).

### `Element.Services.Element.API/DTOs/CategoryResponseDto.cs`
Sadece veri sınıfı: kategori yanıtı (id, ad, slug, açıklama, bağlantılar).

### `Element.Services.Element.API/DTOs/PaginatedResponse.cs`
Sadece veri sınıfları: `PaginatedResponse<T>` zarfı ve `PaginationInfo` (count, pages, next, prev).

### `Element.Services.Element.API/DTOs/AnalyticsDtos.cs`
Sadece veri sınıfı: karşılaştırma yanıtı (`elements` + `comparison`).

### `Element.Services.Element.Core/Domain/ElementAnalytics.cs`
Veritabanından bağımsız, yan etkisiz analiz fonksiyonları; birim testlerin ana hedefi.

| Fonksiyon | Ne yapar |
|---|---|
| `Query(source, filter)` | Filtreye uyan elementleri seçer, istenen anahtara göre sıralar, eşitlikte atom numarasına bakar. |
| `ComputeStatistics(elements)` | Sayı, ortalama ve medyan fiyat, en ucuz/pahalı/ağır/yüksek erime, toplam stok ve kategori/faz/blok sayımlarını hesaplar; boş listede sıfırlanmış sonuç döner. |
| `Compare(elements)` | Verilen kümede her metriğin kazananının sembolünü bulur. |
| `Neighbors(all, target)` | Aynı periyotta sağ/sol ve aynı grupta üst/alt hücreleri tekrarsız toplar. |
| `AddIfNew(candidate)` | (`Neighbors` içinde) Aday boş, hedefin kendisi veya zaten listede değilse ekler. |
| `FindCell(period, group)` | (`Neighbors` içinde) Verilen periyot/grup hücresindeki elementi bulur. |
| `Related(all, target, count)` | Aynı kategorideki elementleri atom numarası farkına göre sıralayıp ilk `count` kadarını alır. |
| `Median(sortedValues)` | Sıralı listenin medyanını bulur; çift sayıda ortadaki ikisinin ortalamasını 4 haneye yuvarlar. |
| `CountBy(elements, keySelector)` | Anahtara göre gruplayıp en kalabalık grup önde olacak şekilde sayar. |
| `ValueOrDefault(value, fallback)` | Boş metin yerine yedek değeri ("unknown", "?") koyar. |

### `Element.Services.Element.Core/Domain/ElementFilter.cs`
Sorgu tanımı: hangi elementin eşleştiği ve nasıl sıralanacağı.

| Fonksiyon | Ne yapar |
|---|---|
| `ElementSort` | Desteklenen sıralama anahtarları (atom no, ad, fiyat, kütle, yoğunluk, erime, kaynama, puan). |
| `ParseSort(value)` | `sort` metnini sıralama anahtarına çevirir; bilinmeyen değer atom numarası olur. |
| `Matches(element)` | Ayarlı tüm filtreleri (kategori, blok, faz, grup, periyot, fiyat aralığı, stokta, arama) sırayla kontrol eder. |
| `SortKey(element)` | Seçili sıralama anahtarının değerini verir; eksik ölçümler en küçük değer sayılır. |
| `MatchesSearch(element)` | Arama metnini ad, sembol, Türkçe ad ve atom numarasında arar. |

### `Element.Services.Element.Core/Domain/ElementStatistics.cs`
Sadece veri kayıtları: `ElementRef`, `ElementStatistics`, `ElementComparison`.

### `Element.Services.Element.Core/Domain/MarketMaker.cs`
Sanal piyasanın fiyat kuralları ve sabitleri (spread, etki katsayısı, taban fiyat, KREDI).

| Fonksiyon | Ne yapar |
|---|---|
| `NextLast(last, grams, depthGrams, buy)` | İşlem büyüklüğünün piyasa derinliğine oranıyla fiyatı alışta yukarı, satışta aşağı iter; hareket en fazla %3, fiyat en az 0,0001. |
| `Quotes(last, spreadPct)` | Last fiyatın etrafına spread kadar bid ve ask koyar. |
| `ChangePct(last, first)` | İlk fiyata göre yüzde değişimi verir; ilk fiyat yok ya da sıfırsa `null`. |

### `Element.Services.Element.Core/Entities/ChemicalElement.cs`
Veritabanındaki element satırı; fiyat için kök nesne (aggregate): fiyat yalnız aşağıdaki iki yöntemle değişir.

| Fonksiyon | Ne yapar |
|---|---|
| `AvailableStock` | Toplam stoktan rezerve gramı çıkarıp satılabilir gramı verir. |
| `RecordTrade(grams, buy, now)` | Gram sıfır ya da negatifse hata fırlatır; derinlik olarak stoku (işlem daha büyükse işlemi) alıp `MarketMaker.NextLast` ile fiyatı iter ve yeni geçmiş noktasını döner. |
| `Tick(fraction, now)` | Fiyatı verilen oranla oynatır (4 ondalığa yuvarlar); sonuç taban fiyata ulaşıyorsa fiyata dokunmaz ve `null` döner. |
| `PricePoint(now)` | O anki fiyattan yeni bir `ElementPriceHistory` satırı üretir. |

### `Element.Services.Element.Core/Entities/StockReservation.cs`
Sipariş (ya da masa satışı) başına işaret satırı: fiyatın en çok bir kez itilmesini sağlar. Adı ve `Reserved/Released/Fulfilled` değerleri servisin stok tuttuğu eski günlerden kalmadır.

| Fonksiyon | Ne yapar |
|---|---|
| `ForCompletedOrder(orderId, symbol, quantity, now)` | Tamamlanan sipariş için `Priced` işareti oluşturur; miktar pozitif değilse hata fırlatır. |
| `ForDeskSale(saleId, symbol, grams, now)` | Masa satışı için (anahtar: mesaj kimliği) `SoldPriced` işareti oluşturur. |
| `IsPriced` | Durum `Priced`, `SoldPriced` ya da eski `Fulfilled` ise true; bu sipariş için fiyat bir daha itilmez. |
| `MarkPriced()` | Eski bir `Reserved`/`Released` satırını `Priced` yapar; zaten fiyatlanmışsa hata fırlatır. |
| `StockReservationStatus` | Durum metinleri: `Reserved`, `Released`, `Fulfilled`, `Priced`, `SoldPriced`. |

### `Element.Services.Element.Core/Entities/ElementCategory.cs`
Sadece veri sınıfı: kategori (id, ad, slug, açıklama).

### `Element.Services.Element.Core/Entities/ElementPriceHistory.cs`
Sadece veri sınıfı: bir elementin belli bir andaki fiyatı.

### `Element.Services.Element.Infrastructure/Persistence/EfElementRepository.cs`
API'nin kullandığı salt okunur veritabanı sorguları. Hiçbir sonuç izlenmez (change tracking yok) ve sembol eşleşmesi büyük/küçük harf duyarsızdır.

| Fonksiyon | Ne yapar |
|---|---|
| `EfElementRepository(context, cache)` | Veritabanı bağlamını ve tekil (singleton) bellek önbelleğini alır. |
| `SnapshotTtl` | Ortak anlık görüntünün ömrü: 5 saniye (fiyatlar 15 saniyede bir değişir). |
| `GetAllAsync(ct)` | Tüm elementleri atom numarasına göre sıralı getirir; sonucu `catalog:elements` anahtarıyla `SnapshotTtl` boyunca paylaşır (dönen nesneler değiştirilmemelidir). |
| `GetBySymbolAsync(symbol, ct)` | Sembolle tek elementi büyük/küçük harf duyarsız bulur. |
| `GetBySymbolsAsync(symbols, ct)` | Listedeki sembollere uyan elementleri getirir. |
| `GetPriceHistoryAsync(symbol, limit, ct)` | En yeni `limit` fiyat noktasını getirir. |
| `GetPriceRangeSinceAsync(symbol, sinceUtc, ct)` | Verilen andan beri açılış (en eski), en yüksek ve en düşük fiyatı tek SQL sorgusuyla hesaplar; pencere boşsa üçü de `null` olur. |
| `GetFulfilledVolumeSinceAsync(symbol, sinceUtc, ct)` | `Fulfilled` durumdaki sipariş gramlarını toplar (ticker hacmi). |
| `GetOldestPriceSinceAsync(sinceUtc, ct)` | Her sembol için verilen andan sonraki ilk fiyatı sözlük olarak döner; her element için tek indeks araması yapar, fiyatı olmayanları bellekte eler. |
| `NormalizeSymbol(symbol)` | Sembolü kırpıp küçük harfe çevirir. |

### `Element.Services.Element.Infrastructure/Persistence/ElementDbContext.cs`
EF Core bağlamı; tablo ayarları ve 15 kategori + 119 element tohum verisi burada (sorgu filtresi 119'u gizler).

| Fonksiyon | Ne yapar |
|---|---|
| `OnModelCreating(modelBuilder)` | Tabloların anahtarlarını, indekslerini, sütun tiplerini ve tohum satırlarını tanımlar; MassTransit'in inbox/outbox tablolarını (`AddInboxStateEntity`, `AddOutboxMessageEntity`, `AddOutboxStateEntity`) modele ekler. |
| `LockElementAsync(symbol, ct)` | Elementi sembolle (büyük/küçük harf duyarsız) okur ve satırı işlem bitene kadar `FOR UPDATE` ile kilitler; açık bir işlem içinde çağrılmalıdır. |
| `LockAllElementsAsync(ct)` | Bütün elementleri `Id` sırasıyla kilitleyerek okur (sabit sıra kilitlenmeyi önler). |

### `Element.Services.Element.Infrastructure/Persistence/ElementDetailSeeder.cs`
Açılışta, görseli boş olan elementlere Türkçe ad, özet, görsel ve ticari bilgi yazar.

| Fonksiyon | Ne yapar |
|---|---|
| `StartAsync(cancellationToken)` | `ImageUrl` boş olan elementleri bulur, doldurur ve bir kez kaydeder. |
| `StopAsync(cancellationToken)` | Hiçbir şey yapmaz; iş açılışta biter. |
| `ResolveBlock(element)` | Grup, atom numarası ve kategoriden s/p/d/f bloğunu çıkarır (H ve He her zaman s). |
| `FillDetails(element)` | Türkçe ad, blok, elektronegatiflik, görünüm, kullanım, özet, görsel, satıcı, puan, yorum sayısı ve rozeti yazar. |
| `PickBadge(atomicNumber)` | 3'e bölünen için "Çok satan", 5'e bölünen için "Fırsat" rozetini seçer. |
| `ImageSlug(englishName)` | İngilizce adı görsel dosya adına çevirir. |
| `PhaseLabel(phase)` | Faz adını Türkçeye çevirir (gaz, sıvı, katı). |
| `ColorOrCategory(element)` | Renk varsa rengi, yoksa kategoriyi döner. |
| `CategoryUses(category)` | Kategoriye göre Türkçe kullanım alanı metni seçer. |
| `CategorySeller(category)` | Kategoriye göre sanal satıcı adı seçer. |
| `ParseTurkishNames()` | "Sembol,Ad" listesini sözlüğe çevirir. |

### `Element.Services.Element.Infrastructure/Persistence/ElementPropertyCatalog.cs`
`element-properties.json` referans değerlerini açılışta bir kez yükler.

| Fonksiyon | Ne yapar |
|---|---|
| `Get(symbol)` | Sembolün referans değerlerini, yoksa `null` döner. |
| `LoadReference()` | Dosyayı okuyup çözer; dosya boşsa açılışı hata ile durdurur. |

### `Element.Services.Element.Infrastructure/Services/PriceSimulator.cs`
Fiyatları 15 saniyede bir değiştiren arka plan işi.

| Fonksiyon | Ne yapar |
|---|---|
| `ExecuteAsync(stoppingToken)` | Servis durana kadar her 15 saniyede bir tur çalıştırır; hata olursa loglar ve devam eder (kapanırken gelen iptal hata sayılmaz). |
| `SimulatePriceChangesAsync(stoppingToken)` | Tek işlem açar, bütün elementleri kilitler, her birine `Tick` uygular, geçmişe yazar ve olayı outbox'a koyar (fiyat değişimi `Debug` seviyesinde loglanır); kaydedip onaylar, sonra budamayı tetikler. Olaylar ancak işlem onaylanınca gönderilir. |
| `PruneOldHistoryIfDueAsync(context, stoppingToken)` | Saatte en fazla bir kez, 2 günden (`HistoryRetention`) eski fiyat geçmişini siler ve silinen satır sayısını loglar. |
| `NextRandomChange()` | -%0,4 ile +%0,4 arası rastgele değişim oranı üretir. |

### `Element.Services.Element.Infrastructure/Messaging/Consumers/OrderCompletedConsumer.cs`
Tamamlanan siparişten sonra fiyatı yukarı iter.

| Fonksiyon | Ne yapar |
|---|---|
| `Consume(context)` | Miktar pozitif değilse durur; elementi kilitler, sipariş daha önce fiyatlanmadıysa `RecordTrade` ile fiyatı yukarı iter, `Priced` işareti ve geçmiş kaydı yazar, fiyat olayını outbox'a koyar. Hepsi tek işlemde onaylanır. |

### `Element.Services.Element.Infrastructure/Messaging/Consumers/ElementSoldConsumer.cs`
Masada satıştan sonra fiyatı aşağı iter.

| Fonksiyon | Ne yapar |
|---|---|
| `Consume(context)` | Gram pozitif değilse ya da mesaj kimliği yoksa durur; elementi kilitler, bu mesaj kimliği için işaret yoksa `RecordTrade` ile fiyatı düşürür, `SoldPriced` işareti ve geçmiş kaydı yazar, fiyat olayını outbox'a koyar. Hepsi tek işlemde onaylanır. |

Veri dosyaları: `Infrastructure/Data/scientific-elements.json` (v2 bilimsel kayıtlar) ve `Infrastructure/Data/element-properties.json` (kaynaklı fiziksel değerler) derlemede `Data/` klasörüne kopyalanır. `Persistence/seed_elements.txt` ve `seed_categories.txt` tohum verisinin eski metin kopyalarıdır, kod tarafından okunmaz. `Persistence/Migrations/` EF tarafından üretilmiştir; `20261001000000_PriceHistoryRetentionIndex` 2 günden eski fiyat geçmişini bir kez siler ve geçmiş sorgularının kullandığı `IX_PriceHistories_lower_ElementSymbol_Timestamp` (`lower(ElementSymbol), Timestamp`) indeksini ekler. `20261022144840_AddMassTransitOutbox` elle yazılmış SQL'dir: outbox/inbox tablolarını ve indekslerini `IF NOT EXISTS` ile, CHECK kısıtlarını yalnız yoksa ve `NOT VALID` olarak ekler; yani var olan bir veritabanında tekrar çalışsa da açılışı bozmaz. EF'in bu migration için önerdiği 119 `UpdateData` (eski model anlık görüntüsünün kaymasından) canlı element bilgisini ezeceği için alınmadı; yalnız anlık görüntü modele eşitlendi. `Element.Services.Element.API/Dockerfile` önce yalnız proje dosyalarıyla `restore`, sonra `publish` yapar; konteyner root olmayan `$APP_UID` kullanıcısıyla çalışır.

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | `Host=localhost;Database=element_market_db;Username=postgres;Password=<yerel-varsayılan>` | PostgreSQL bağlantısı; sağlık kontrolü de bunu kullanır. |
| `RabbitMQ__Host` | `localhost` | RabbitMQ sunucusu. |
| `RabbitMQ__Port` | `5672` | RabbitMQ portu. |
| `RabbitMQ__Username` | `guest` | RabbitMQ kullanıcı adı. |
| `RabbitMQ__Password` | `<yerel-varsayılan>`| RabbitMQ parolası. |
| `Market__SpreadPct` | `0.008` | Bid/ask için last fiyatın iki yanına konan oran; 0 veya negatifse 0,008 kullanılır. |
| `PriceSimulator__Enabled` | `true` | `false` olursa 15 saniyelik fiyat simülatörü hiç başlamaz (testlerde kapatılır). |
| `PUBLIC_API_BASE` | yok (Docker'da `http://localhost:5000`) | Yanıtlardaki bağlantıların dış adresi; boşsa istek başlıklarından hesaplanır. |
| `ASPNETCORE_ENVIRONMENT` | `Production` (Docker'da `Development`) | Ortam adı; `/info` içinde görünür ve üretim kontrollerini açar. |
| `INTERNAL_API_KEY`, `JwtSettings__Secret` | yok | Bu servis kullanmaz; yalnız üretimde tanımlıysa ortak kütüphane zayıf/dev değerleri reddeder. |

## Testler

Birim testler `deploy/tests/Element.Services.UnitTests/Element/` klasöründedir:

- `ElementAnalyticsTests.cs`: istatistik liderleri ve ortalama, boş küme, medyan, kategori + fiyat filtresi, stokta olanlar, fiyata göre azalan sıralama, ad/atom no araması, karşılaştırma kazananları, komşular ve ilgili elementler.
- `MarketMakerTests.cs`: varsayılan spread ile bid/ask, alışta %3 tavan, satışta fiyat düşüşü, geçmiş yoksa `null` değişim.
- `ElementBlockTests.cs`: `ResolveBlock` için s/p/d/f blokları ve helyum istisnası.
- `ChemicalElementTests.cs` (önce test yazıldı): alış fiyatı yukarı, satış aşağı iter ve geçmiş noktası döner; işlem stoktan büyükse hareket %3'te kalır; sıfır/negatif gram reddedilir ve fiyat değişmez; simülatör adımı 4 ondalığa yuvarlar, taban fiyata ulaşacak adım atlanır.
- `StockReservationTests.cs` (önce test yazıldı): sipariş ve masa satışı işaretleri fiyatlanmış sayılır; fiyatlanmış işaret ikinci kez işaretlenemez; sıfır/negatif miktar reddedilir.
- `ElementDbContextTests.cs`: `Migrations_MatchTheModel`, model anlık görüntüsünün modelle aynı olduğunu (`HasPendingModelChanges` false) doğrular.
- `EfElementRepositoryTests.cs`: bellek içi veritabanıyla `GetAllAsync` aynı önbellekle yeni depo örneğinde de aynı anlık görüntüyü döner; `GetPriceRangeSinceAsync` yalnız ilgili sembolün penceresini toplar, bilinmeyen sembolde `null` döner.
- `ScientificCatalogTests.cs`: v2 bilimsel katalog için farklı kimliklerle demir, alan projeksiyonu, geçersiz sorgular (400), sayfalama linkleri, özet görünüm, ETag/304 ve `Cache-Control`, Türkçe arama, aramanın filtrelerle birleşmesi, `Page`/`PageSize` gibi farklı harfli anahtarlarla next bağlantısının geçerli kalması.

Çalıştırmak için:

```bash
dotnet test deploy/tests/Element.Services.UnitTests/Element.Services.UnitTests.csproj --filter "Category!=Integration"
```

Yalnız bu klasörün 53 testi için: `--filter "FullyQualifiedName~Element.Services.UnitTests.Element."`. Gerçek API'yi Postgres/RabbitMQ konteynerleriyle deneyen testler `deploy/tests/Element.Services.IntegrationTests/` projesindedir (`Category=Integration`), Docker ister ve yukarıdaki komutla çalışmaz:

- `SagaFlowIntegrationTests.cs`: gerçek order, catalog ve shipment servisleriyle saga'nın Completed olduğunu uçtan uca doğrular.
- `CatalogOutboxIntegrationTests.cs`:
  - `ConcurrentCompletedOrders_EachMoveThePriceOnce_WithoutLostUpdates`: 12 sipariş, her biri iki farklı mesaj kimliğiyle (toplam 24 eşzamanlı teslim) gelir; fiyat tam 12 ardışık itişe eşittir, 12 işaret ve 12 olay vardır, her olay zarfında `messageId` ve `messageType[0]` URN'i bulunur. Satır kilidi kaldırılınca bu test kayıp güncelleme yüzünden kırmızıya döner.
  - `RedeliveredSale_SameMessageId_MovesThePriceOnce`: aynı mesaj kimliğiyle iki kez gelen masa satışı fiyatı bir kez iter, tek olay ve tek inbox satırı bırakır.
  - `PriceChangeAndItsEvent_RollBackTogether_AndCommitTogether`: geri alınan işlemde ne fiyat ne olay kalır; onaylanan işlemde fiyat değişir ve outbox tam o fiyatı yayınlar.
  - `Database_RejectsANonPositivePrice_AndTheOutboxMigrationCanRunAgain`: `PricePerGram = 0` CHECK hatası (23514) verir; migration geçmişi silinip servis yeniden açıldığında outbox migration'ı hatasız tekrar çalışır.

```bash
dotnet test deploy/tests/Element.Services.IntegrationTests --filter "FullyQualifiedName~CatalogOutboxIntegrationTests"
```
