# Bilim atlası (science-service)

> Ticaret yığını olmadan çalışan tek kutu: Türkçe atlas sitesini ve salt okunur bilimsel v2 API'yi (elementler, bileşikler, kapsam özeti) aynı süreçten sunar.

| Özellik | Değer |
|---|---|
| Teknoloji | .NET 10 ASP.NET Core (minimal API + MVC denetleyicileri), web-app'in statik derlemesi |
| Port | `5080` (`docker-compose.science.yml`, konteyner içi `8080`) |
| Klasör | `science-service/` |
| Veri | Dosya: `Data/scientific-elements.json` (118 element) ve `Data/scientific-compounds.json`; açılışta belleğe alınır. Veritabanı yok |
| Mesajlaşma | yok |

## Ne işe yarar?

Tam platformu (gateway, catalog, compound, identity, kuyruklar, veritabanları) açmadan periyodik tabloyu ve laboratuvarı göstermek için vardır. Docker imajı web uygulamasını hesaplar kapalı (`VITE_ACCOUNTS_ENABLED=false`) şekilde derler ve `wwwroot/` içine gömer; aynı süreç hem siteyi hem API'yi sunar.

Açılışta iki JSON anlık görüntüsü (snapshot) okunur. Element dosyası tam 118 kayıt içermiyorsa ya da bileşik listesi boşsa servis hiç ayağa kalkmaz; böylece eksik veriyle "sağlıklı" görünen bir sunucu oluşmaz. Ayrıca hiçbir elementte dolu olmayan bölümler (ör. kristalografi) bir kez hesaplanıp `/api/v2/coverage` yanıtında listelenir.

Bir API isteği önce güvenlik başlıklarını (`nosniff`, `no-referrer`) alır, ardından sıkıştırma, her kökene açık CORS (yalnız GET/OPTIONS) ve `/api` için IP başına dakikada 300 istek sınırından geçer. `/api/v2/elements` ve `/api/v2/compounds` istekleri catalog ve compound servislerindeki denetleyicilerin birebir aynısı tarafından karşılanır; bu denetleyiciler ve `ScientificCatalog` motoru proje dosyasında bağlantı (link) olarak derlenir, ikinci bir API yazılmaz.

Liste uçları şu sorgu parametrelerini kabul eder: `view` (`summary` veya `full`), `include` (özete eklenecek bölümler), `fields` (yalnızca istenen nokta yolları), `q` (Türkçe/ASCII duyarsız arama, en fazla 120 karakter), `page`, `pageSize` (1–100, varsayılan 30) ve yalnız elementlerde `category`, `block`, `group`, `period`. Her başarılı yanıt zayıf bir ETag ve `Cache-Control: public, max-age=3600` taşır; aynı ETag ile gelen istek 304 alır. Sayfa bağlantıları (`next`/`prev`) istemci `Page=` gibi farklı harf büyüklüğü kullansa bile geçerli kalır.

Statik dosyalar web-app'in `nginx.conf` dosyasıyla aynı önbellek kuralını alır: `/assets` altındaki karma adlı dosyalar 1 yıl ve `immutable`, `/media` ile `/brand` 1 hafta, geri kalan her şey (özellikle `index.html`) `no-cache`; böylece yeniden dağıtımdan sonra `index.html` silinmiş varlıklara işaret etmez.

Bilinçli olarak şunları yapmaz: veritabanına yazmaz, sipariş ya da hesap işlemi yapmaz, mesaj kuyruğuna bağlanmaz. Bilinmeyen `/api/...` yolları siteye düşmez, JSON 404 döner. `/api/v2/coverage` yalnızca bu hostta vardır; gateway'de yoktur.

## Uç noktalar

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/api/v2/elements` | Herkese açık | Elementleri arama, filtre, sayfalama ve alan seçimiyle listeler. |
| GET | `/api/v2/elements/{identifier}` | Herkese açık | Tek elementi sembol, atom numarası ya da kararlı id ile döndürür (varsayılan `view=full`). |
| GET | `/api/v2/compounds` | Herkese açık | Bilimsel bileşikleri arama, sayfalama ve alan seçimiyle listeler. |
| GET | `/api/v2/compounds/{identifier}` | Herkese açık | Tek bileşiği slug, PubChem CID ya da id ile döndürür. |
| GET | `/api/v2/coverage` | Herkese açık | Kayıt sayılarını, verinin alındığı tarihi ve hiçbir elementte dolu olmayan bölümleri döndürür (`Cache-Control: public, max-age=3600`). |
| GET | `/health` | Herkese açık | Her zaman `Healthy` ve servis adını döndürür (veri açılışta doğrulandığı için). |
| GET | `/health/live` | Herkese açık | Süreç ayakta ise `Healthy` döndürür. |
| GET | `/health/ready` | Herkese açık | Süreç ayakta ise `Healthy` döndürür. |
| GET | `/info` | Herkese açık | Servis adını, sürümünü (2.0), bağımlılık olmadığını ve API kökünü döndürür. |
| Tümü | `/api/**` (eşleşmeyen) | Herkese açık | JSON problem gövdesiyle 404 döndürür; siteye düşmez. |
| GET | `/` ve diğer yollar | Herkese açık | Statik site dosyalarını yola göre önbellek başlığıyla sunar; bulunamayan yollar için `index.html` (tek sayfa uygulama) döner. |

## Kod haritası

### `science-service/Program.cs`
Servisin tamamı: ayarlar, veri yükleme, ara katmanlar ve uçlar tek dosyadadır.

| Fonksiyon | Ne yapar |
|---|---|
| (üst düzey başlangıç kodu) | Denetleyicileri, sıkıştırmayı, statik dosya önbellek kuralını, CORS'u ve hız sınırını kaydeder; anlık görüntüleri yükleyip doğrular; ara katmanları ve uçları sırayla ekler. |
| `StaticFileCacheControl(path)` | Statik dosya yoluna göre `Cache-Control` değerini seçer: `/assets` için `public, max-age=31536000, immutable`, `/media` ve `/brand` için `public, max-age=604800`, diğerleri için `no-cache`. |
| `ChooseRateLimitPartition(context)` | `/api` isteklerini istemci IP'si başına dakikada 300 istekle sınırlar; statik site isteklerini sınırsız bırakır. |
| `LoadSnapshot(fileName)` | Uygulama klasöründeki `Data/<dosya>` JSON dizisini okur. |
| `FindSectionsEmptyInEveryRecord(records)` | İlk elementin üst düzey bölümlerinden, hiçbir kayıtta dolu olmayanları bulur. |
| `IsPopulated(node)` | Bir JSON değerinin içinde en az bir boş olmayan değer olup olmadığını özyinelemeli olarak söyler. |
| `Program` (partial sınıf) | Test barındırıcılarının (`WebApplicationFactory`) başvurabilmesi için giriş sınıfını açık (public) yapar. |

### `catalog-service/Element.Services.Element.API/Controllers/ScientificElementsController.cs` (bağlantılı dosya)
Element v2 uçlarını `ScientificCatalog` motoruna bağlayan denetleyici; catalog servisiyle ortaktır.

| Fonksiyon | Ne yapar |
|---|---|
| `List()` | `/api/v2/elements` isteğini katalogdaki liste okumasına yönlendirir. |
| `Get(identifier)` | `/api/v2/elements/{identifier}` isteğini tek kayıt okumasına yönlendirir. |

### `compound-service/Element.Services.Compound.API/Controllers/ScientificCompoundsController.cs` (bağlantılı dosya)
Bileşik v2 uçlarını `ScientificCatalog` motoruna bağlayan denetleyici; compound servisiyle ortaktır.

| Fonksiyon | Ne yapar |
|---|---|
| `List()` | `/api/v2/compounds` isteğini katalogdaki liste okumasına yönlendirir. |
| `Get(identifier)` | `/api/v2/compounds/{identifier}` isteğini tek kayıt okumasına yönlendirir. |

### `shared-lib/Science/ScientificCatalog.cs` (bağlantılı dosya)
Arama, filtre, sayfalama, alan seçimi ve ETag işini yapan motor; bütün fonksiyonları [shared-lib kılavuzunda](shared-lib.md) anlatılır.

### `science-service/Element.Science.csproj`
Yukarıdaki üç dosyayı ve iki JSON anlık görüntüsünü bu projeye bağlantı olarak ekler; ayrı bir kopya tutulmaz.

### `science-service/Dockerfile`
Üç aşamalı imaj: web uygulamasını hesaplar kapalı derler, .NET servisini yayınlar ve ikisini salt okunur çalışan tek bir imajda birleştirir.

Veri dosyaları: `catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json` ve `compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json` derleme sırasında `Data/` klasörüne kopyalanır.

`science-service/appsettings.json`: log seviyelerini ayarlar (varsayılan `Information`, `Microsoft.AspNetCore` için `Warning`).

## Yapılandırma

Servis kodu kendi ayar anahtarı okumaz; aşağıdakiler ASP.NET Core ve web derlemesi tarafından okunur. Log seviyeleri `appsettings.json` içindeki `Logging:LogLevel` ile ayarlanır.

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `ASPNETCORE_HTTP_PORTS` | `8080` (Dockerfile) | Konteyner içinde dinlenen port; compose bunu `127.0.0.1:5080` adresine yayınlar. |
| `ASPNETCORE_ENVIRONMENT` | `Production` (Dockerfile) | Çalışma ortamı. |
| `VITE_PUBLIC_SITE_URL` | `http://127.0.0.1:5080` (derleme argümanı) | Web derlemesindeki genel site adresi (kanonik bağlantı, Open Graph, site haritası). |
| `VITE_API_BASE_URL` | `/api/v1` | Web derlemesinin API kökü. |
| `VITE_ACCOUNTS_ENABLED` | `false` | Web derlemesinde hesap, giriş ve ticaret ekranlarını kapatır. |

## Testler

science-service'in ayrı bir test projesi yoktur. API'nin tüm mantığı `ScientificCatalog` içindedir ve `deploy/tests/Element.Services.UnitTests/Element/ScientificCatalogTests.cs` tarafından denetlenir (kimlik eşleştirme, projeksiyon, hatalı sorgular, sayfa bağlantıları ve farklı harf büyüklüklü `Page`/`PageSize`, ETag ve `Cache-Control`, Türkçe arama, aramanın filtrelerle birleşmesi, bileşik verisi).

```powershell
dotnet build science-service/Element.Science.csproj
dotnet test deploy/tests/Element.Services.UnitTests/Element.Services.UnitTests.csproj --filter "Category!=Integration"
```

Çalışan hostu elle denemek için:

```bash
curl http://127.0.0.1:5080/health
curl http://127.0.0.1:5080/api/v2/elements/fe
curl http://127.0.0.1:5080/api/v2/coverage
```
