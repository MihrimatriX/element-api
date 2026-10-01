# Bileşik servisi (compound-service)

> Elementlere bağlı bileşik, allotrop ve gram preparatlarını (mağaza listesi) ve bilimsel bileşik kayıtlarını sunan salt okunur servis.

| Özellik | Değer |
|---|---|
| Teknoloji | .NET 10 (ASP.NET Core Web API), EF Core 9 + Npgsql, Serilog, Swashbuckle |
| Port | Docker: `5007` → konteyner `8080` · yerel `dotnet run`: `5007` |
| Klasör | `compound-service/` |
| Veri | PostgreSQL `element_compound_db` (tek tablo: `Compounds`) + `Data/compounds.json`, `Data/compound-properties.json`, `Data/scientific-compounds.json` |
| Mesajlaşma | yok |

## Ne işe yarar?

Servisin iki ayrı listesi vardır ve birbirine karışmaz. **Mağaza listesi (v1)** her ürünü bir ana elemente bağlar: `aucl3` (altın klorür), bir allotrop ya da `elemental-au` gibi "1 gram saf element" preparatı. Her ürün `priceMult` (fiyat çarpanı) ve `gramsPerUnit` (birimdeki gram) taşır; tutarı bu servis değil, sipariş tarafı ana elementin fiyatıyla çarparak hesaplar. **Bilim listesi (v2)** `scientific-compounds.json` dosyasındaki bilinen molekülleri (ör. aspirin, su) kaynaklı ölçümleriyle döner; burada fiyat yoktur.

Açılışta `CompoundSeeder` çalışır: `compounds.json` satırlarını okur, eksik alanları güvenli varsayılanlarla doldurur, aynı slug iki kez varsa ilkini alır ve her element için bir `elemental-xx` preparatı ekler. Veritabanında olmayan slug'lar eklenir, var olanlara dokunulmaz; bu yüzden yeniden başlatmak güvenlidir.

Bir istek şöyle akar: tarayıcı veya order-service → gateway (`:5000`) → bu servis. `CompoundsController` filtreleri `EfCompoundRepository`'ye verir, sonuçları bellekte sayfalar ve her ürüne `compound-properties.json`'dan gelen PubChem kimliğini (formül, molekül ağırlığı, IUPAC adı) ekler. v2 istekleri ortak `ScientificCatalog` sınıfına gider.

Açılışta migration'lar ve `CompoundSeeder` `try` bloğunun içinde çalışır: veritabanı hiç gelmezse servis `Fatal` loglar ve çıkış kodu 1 ile kapanır (yeniden başlatma politikası devreye girer). Ürünler yalnız açılışta tohumlandığı ve canlı fiyat taşımadığı için v1 ürün yanıtları `Cache-Control: max-age=300` ile döner.

Bu servis stok tutmaz (inventory-service), piyasa fiyatı hesaplamaz (catalog-service), sipariş yazmaz ve RabbitMQ'ya bağlanmaz. Kimlik doğrulama yoktur; gateway'de de tüm GET yolları anahtarsızdır.

## Uç noktalar

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/api/v1` | Herkese açık | Servisin uç noktalarını örnek bağlantılarla listeler. |
| GET | `/api/v1/compounds` | Herkese açık | Ürünleri sayfalı listeler; `element`, `kind` (allotrope/compound/preparation), `q` (en çok 120 karakter, aşarsa 400), `page`, `pageSize` (1–100, varsayılan 40) destekler. |
| GET | `/api/v1/compounds/{slug}` | Herkese açık | Tek ürünü slug ile döner (ör. `aucl3`, `elemental-au`); yoksa 404. |
| GET | `/api/v1/elements/{symbol}/compounds` | Herkese açık | Ana elementi bu sembol olan tüm ürünleri sayfasız döner (gateway bu yolu catalog yerine buraya yönlendirir). |
| GET | `/api/v2/compounds` | Herkese açık | Bilimsel bileşik listesi; `q` (en çok 120 karakter), `view=summary\|full`, `include`, `fields`, `page`, `pageSize` (1–100); ETag ve `Cache-Control: public, max-age=3600` destekli; `category`/`block`/`group`/`period` burada 400 döner. |
| GET | `/api/v2/compounds/{identifier}` | Herkese açık | Tek bilimsel kayıt; slug (`aspirin`), kimlik veya PubChem CID (`2244`) kabul eder. |
| GET | `/info` | Herkese açık | Servis adı, sürüm, ortam ve bağlantılar. |
| GET | `/health`, `/health/ready` | Herkese açık | PostgreSQL dahil hazır olma kontrolü. |
| GET | `/health/live` | Herkese açık | Sadece sürecin ayakta olduğunu söyler. |
| GET | `/swagger` | Herkese açık | Swagger arayüzü ve `swagger/v1/swagger.json`. |

## Kod haritası

### `Element.Services.Compound.API/Program.cs`
Servisi ayağa kaldıran başlangıç kodu.

| Fonksiyon | Ne yapar |
|---|---|
| `Program` (üst düzey kod) | Loglamayı, `CompoundDbContext`'i, depoyu, Swagger'ı ve sağlık kontrolünü kaydeder; `try` içinde migration'ları uygular, `CompoundSeeder`'ı çalıştırır ve uygulamayı başlatır, hata olursa çıkış kodunu 1 yapar. |

### `Element.Services.Compound.API/PublicBaseUrl.cs`
Sayfalama bağlantıları için dışarıdan görünen adresi bulur.

| Fonksiyon | Ne yapar |
|---|---|
| `Resolve(request, config)` | Önce `PUBLIC_API_BASE` değerini, yoksa `X-Forwarded-Proto/Host` başlıklarını, o da yoksa isteğin kendi adresini kullanır. |

### `Element.Services.Compound.API/Controllers/ApiInfoController.cs`
`/api/v1` keşif uç noktası.

| Fonksiyon | Ne yapar |
|---|---|
| `ApiInfoController(configuration)` | Bağlantı adresi için yapılandırmayı alır. |
| `GetApiInfo()` | v1/v2 bileşik uç noktalarının örnek bağlantılarını döner. |

### `Element.Services.Compound.API/Controllers/CompoundsController.cs`
v1 mağaza listesi uç noktaları. Sınıf düzeyinde `[ResponseCache(Duration = 300)]` vardır.

| Fonksiyon | Ne yapar |
|---|---|
| `CompoundsController(repository, configuration)` | Depoyu ve yapılandırmayı alır. |
| `List(element, kind, q, page, pageSize)` | `q` 120 karakteri (`MaxSearchLength`) aşarsa 400 döner; değilse filtreli ürünleri getirir, sayfalar (atlama sayısı taşmasın diye `long` hesap) ve filtreleri koruyan next/prev bağlantıları üretir. |
| `Get(slug)` | Slug ile tek ürünü döner; yoksa 404. |
| `ForElement(symbol)` | Bir elemente bağlı tüm ürünleri döner. |
| `NormalizePageSize(pageSize)` | 1'den küçük boyutu 40'a, 100'den büyüğü 100'e çeker. |
| `BuildFilterQueryPrefix(element, kind, search)` | Aktif filtreleri sayfa bağlantısının başına `?element=..&kind=..&q=..&` biçiminde ekler; filtre yoksa yalnız `?` döner. |
| `Map(compound)` | Varlığı yanıt nesnesine çevirir ve kaynaklı özellikleri ekler. |

### `Element.Services.Compound.API/Controllers/ScientificCompoundsController.cs`
v2 bilimsel bileşik uç noktaları; işi ortak `ScientificCatalog` sınıfı yapar.

| Fonksiyon | Ne yapar |
|---|---|
| `List()` | Bilimsel listeyi arama, projeksiyon, sayfalama ve ETag ile döner. |
| `Get(identifier)` | Slug, kimlik veya PubChem CID ile tek kaydı döner. |

### `Element.Services.Compound.API/DTOs/CompoundProperties.cs`
`compound-properties.json` dosyasını bir kez yükleyip slug ile sorgulatır.

| Fonksiyon | Ne yapar |
|---|---|
| `CompoundProperties(...)` | Formül, molekül ağırlığı, IUPAC adı, InChIKey, PubChem kimliği ve kaynak bilgisi taşıyan kayıt. |
| `Get(slug)` | Slug'ın kaynaklı özelliklerini, yoksa `null` döner. |
| `Load()` | JSON dosyasını okuyup slug → özellik sözlüğüne çevirir. |

### `Element.Services.Compound.API/DTOs/CompoundResponseDto.cs`
Sadece veri sınıfları: `CompoundResponseDto` (ürün yanıtı, `priceSource=simulation`, `currency=KREDI`), `PaginatedResponse<T>` ve `PaginationInfo`.

### `Element.Services.Compound.Infrastructure/Entities/ChemicalCompound.cs`
Sadece veri sınıfı: veritabanındaki ürün satırı (slug, formül, adlar, tür, ana element, gram/birim, fiyat çarpanı, özet, görsel).

### `Element.Services.Compound.Infrastructure/Persistence/CompoundDbContext.cs`
EF Core bağlamı.

| Fonksiyon | Ne yapar |
|---|---|
| `OnModelCreating(modelBuilder)` | `Compounds` tablosunun anahtarını, benzersiz slug indeksini, uzunluk sınırlarını ve sayı tiplerini tanımlar. |

### `Element.Services.Compound.Infrastructure/Persistence/EfCompoundRepository.cs`
Salt okunur ürün sorguları.

| Fonksiyon | Ne yapar |
|---|---|
| `QueryAsync(element, kind, search, ct)` | Element sembolü, tür ve serbest metin filtrelerini uygular; sonucu sembol ve slug'a göre sıralar. |
| `GetBySlugAsync(slug, ct)` | Slug ile tek ürünü büyük/küçük harf duyarsız bulur. |

### `Element.Services.Compound.Infrastructure/Persistence/CompoundSeeder.cs`
Açılışta ürün tablosunu JSON dosyasından ve element listesinden doldurur.

| Fonksiyon | Ne yapar |
|---|---|
| `EnsureSeededAsync(services, env)` | Tohum ürünlerini hazırlar ve veritabanında olmayan slug'ları ekler. |
| `FindSeedFile(env)` | `compounds.json` dosyasını önce içerik kökünde, sonra derleme çıktısında arar; bulamazsa hata verir. |
| `LoadSeedCompounds(path, logger)` | JSON satırlarını okur (sembol/slug'ı boş olanı atlar, tekrar eden slug'da ilki kalır) ve her element için `elemental-xx` preparatı ekler. |
| `FromSeedRow(row, slug)` | Bir JSON satırını varlığa çevirir; boş formül, ad, tür, çarpan ve görseli güvenli değerlerle doldurur. |
| `ElementalPreparation(symbol, slug, englishName, turkishName)` | "1 gram saf element" simülasyon ürününü üretir. |
| `NullIfBlank(value)` | Boş metni `null` yapar, doluysa kırpar. |
| `SeedRow` | `compounds.json` içindeki bir satırın şekli. |

Veri dosyaları: `Infrastructure/Data/compounds.json` (mağaza tohumları), `compound-properties.json` (PubChem kimlikleri) ve `scientific-compounds.json` (v2 bilimsel kayıtlar) derlemede `Data/` klasörüne kopyalanır. `Persistence/Migrations/` EF tarafından üretilmiştir. `Element.Services.Compound.API/Dockerfile` önce yalnız proje dosyalarıyla `restore`, sonra `publish` yapar; konteyner root olmayan `$APP_UID` kullanıcısıyla çalışır.

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | `Host=localhost;Database=element_compound_db;Username=postgres;Password=mysecretpassword` | PostgreSQL bağlantısı; sağlık kontrolü de bunu kullanır. |
| `PUBLIC_API_BASE` | yok (Docker'da `http://localhost:5000`) | Sayfalama bağlantılarının dış adresi; boşsa istek başlıklarından hesaplanır. |
| `ASPNETCORE_ENVIRONMENT` | `Production` (Docker ve yerelde `Development`) | Ortam adı; `/info` içinde görünür ve üretim kontrollerini açar. |
| `INTERNAL_API_KEY`, `JwtSettings__Secret` | yok | Bu servis kullanmaz; yalnız üretimde tanımlıysa ortak kütüphane zayıf/dev değerleri reddeder. |

## Testler

Bu servisin kendi kontrolcüsü ve tohumlayıcısı için ayrı birim testi yoktur. v2 bilimsel bileşik okuması `deploy/tests/Element.Services.UnitTests/Element/ScientificCatalogTests.cs` içindeki `AspirinHasScientificIdentityAndNoSimulatedPrices` testiyle doğrulanır: PubChem CID `2244` ile aspirin bulunur, formül `C9H8O4` olur, fiyat alanı yoktur ve kaynak listesi doludur. Aynı dosyadaki projeksiyon, ETag/`Cache-Control`, geçersiz sorgu ve farklı harfli `Page`/`PageSize` anahtarıyla next bağlantısı testleri bu servisin de kullandığı ortak `ScientificCatalog` kurallarını kapsar.

Çalıştırmak için:

```bash
dotnet test deploy/tests/Element.Services.UnitTests/Element.Services.UnitTests.csproj --filter "Category!=Integration"
```

Yalnız ilgili dosya için: `--filter "FullyQualifiedName~ScientificCatalogTests"`.
