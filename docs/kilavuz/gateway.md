# API kapısı (gateway-service)

> Dış dünyadan gelen her HTTP isteğini karşılayan tek kapı: hız sınırı uygular, gerekiyorsa API anahtarını doğrular ve isteği doğru servise yönlendirir.

| Özellik | Değer |
|---|---|
| Teknoloji | .NET 10, ASP.NET Core, YARP 2.3 (ters vekil), StackExchange.Redis, Serilog |
| Port | Docker'da `5000` (konteyner içi `8080`); `dotnet run` ile `5010` |
| Klasör | `gateway-service/` |
| Veri | Veritabanı yok. Redis: API anahtarı başına saniyelik istek sayacı |
| Mesajlaşma | yok |

## Ne işe yarar?

Tarayıcı, web uygulaması ve API anahtarlı istemciler arka plandaki servislere doğrudan değil, bu kapı üzerinden konuşur. Kapı element, sipariş ya da cüzdan hakkında hiçbir şey bilmez; yalnızca isteğin yoluna bakar ve `appsettings.json` içindeki YARP rotalarına göre doğru kümeye (identity, catalog, compound, order, wallet, inventory, shipment) iletir.

Kestrel 1 MB'tan büyük istek gövdelerini (Caddy ile aynı sınır) daha kapıya girmeden reddeder ve yanıtlara `Server` başlığı eklemez. Bir istek şu sırayla ilerler: önce `CorrelationIdMiddleware` isteğe bir `X-Request-Id` verir (istemci gönderdiyse onu korur), ardından istek loglanır ve genel hata yakalayıcıdan geçer. Sonra CORS kuralları ve IP başına hız sınırı uygulanır (kayıt, şifre sıfırlama ve doğrulama e-postası POST'ları birlikte 5/dk, diğer auth POST'ları 15/dk, geri kalan her şey 60/10 sn). Ardından `ApiKeyValidationMiddleware` her rotada istemcinin gönderdiği `X-User-Id` ve `INTERNAL_API_KEY` başlıklarını siler; arka servisler bu başlıklara "kapı koydu" diye güvendiği için istemci bunları hiçbir yoldan taşıyamaz. Rota `RequireApiKey: "true"` olarak işaretliyse `ApiKeyValidationMiddleware` devreye girer: anahtarın biçimini denetler, identity servisine canlı olarak sorar ve Redis'te anahtar başına saniyelik kotayı sayar. Başarılı olursa isteğe `X-User-Id` ve `INTERNAL_API_KEY` başlıklarını ekleyip YARP'a bırakır.

Gerçek istemci IP'si yalnızca güvenilen bir vekil (loopback, Docker özel ağı ya da `TRUSTED_PROXY_CIDRS` içindeki adresler) arkasından gelindiğinde `X-Forwarded-For` başlığından okunur; böylece doğrudan gelen bir istemci sahte başlıkla hız sınırını atlatamaz.

Kapı bilinçli olarak şunları yapmaz: kullanıcı oturumu (JWT) doğrulamaz (bunu identity ve ilgili servisler yapar), yanıtları önbelleğe almaz, identity'nin anahtar yanıtını saklamaz (iptal edilen anahtar anında düşer), ödeme ve kargo kuyruklarına HTTP yolu açmaz ve `/api/v2/coverage` gibi birden fazla servisten veri toplayan uçlar sunmaz.

## Uç noktalar

Kapının kendi uçları ile YARP üzerinden yönlendirdiği yollar aşağıdadır. `/**` yolun altındaki her şeyi (yolun kendisi dahil) kapsar. Tüm yollar IP başına hız sınırına tabidir.

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/info` | Herkese açık | Kapının adını, sürümünü, ortamını ve örnek bağlantıları döndürür. |
| GET | `/health/live` | Herkese açık | Süreç ayakta mı diye bakar; hiçbir bağımlılığı denetlemez. |
| GET | `/health/ready` | Herkese açık | Redis bağlantısını da (3 sn zaman aşımıyla) denetleyerek hazır olup olmadığını söyler (Redis yavaşsa ya da yoksa `Degraded`). |
| GET | `/health` | Herkese açık | `/health/ready` ile aynı yanıt. |
| Tümü | `/api/v1` | Herkese açık | Catalog servisinin API bilgi ucuna gider. |
| Tümü | `/api/v1/auth/**` | Herkese açık (identity kendi içinde JWT ister) | Kayıt, giriş ve oturum işlemleri için identity servisine gider. |
| Tümü | `/api/v1/api-keys`, `/api/v1/api-keys/**` | JWT (identity denetler) | API anahtarı oluşturma, listeleme ve iptal için identity servisine gider. |
| Tümü | `/api/v1/webhooks`, `/api/v1/webhooks/**` | JWT (identity denetler) | Webhook kayıtları için identity servisine gider. |
| Tümü | `/api/v1/elements/{symbol}/history` | API anahtarı | Bir elementin fiyat geçmişi için catalog servisine gider. |
| GET | `/api/v1/elements/{symbol}/ticker` | Herkese açık | Bir elementin anlık fiyat özeti için catalog servisine gider. |
| GET | `/api/v1/elements/{symbol}/compounds` | Herkese açık | Elementi içeren bileşikler için compound servisine gider (catalog rotasından önce eşleşir). |
| POST, PUT, DELETE | `/api/v1/elements/**` | API anahtarı | Element yazma işlemleri için catalog servisine gider. |
| GET | `/api/v1/elements/**` | Herkese açık | Element okuma işlemleri için catalog servisine gider. |
| GET, OPTIONS | `/api/v2/elements/**` | Herkese açık (her kökene açık CORS) | Bilimsel element kataloğu için catalog servisine gider. |
| GET, OPTIONS | `/api/v2/compounds/**` | Herkese açık (her kökene açık CORS) | Bilimsel bileşik kataloğu için compound servisine gider. |
| Tümü | `/api/v1/categories/**` | Herkese açık | Element kategorileri için catalog servisine gider. |
| Tümü | `/api/v1/statistics`, `/api/v1/statistics/**` | Herkese açık | Piyasa istatistikleri için catalog servisine gider. |
| Tümü | `/api/v1/market/**` | Herkese açık | Piyasa verileri için catalog servisine gider. |
| GET | `/api/v1/compounds`, `/api/v1/compounds/**` | Herkese açık | Ürün bileşikleri için compound servisine gider. |
| Tümü | `/api/v1/orders/**` | API anahtarı | Sipariş verme ve sorgulama için order servisine gider. |
| Tümü | `/api/v1/me/**` | API anahtarı | Kullanıcının cüzdanı ve varlıkları için wallet servisine gider. |
| Tümü | `/api/v1/desk/**` | API anahtarı | Masa (desk) alım-satım işlemleri için wallet servisine gider. |
| Tümü | `/api/v1/stock/**` | Herkese açık | Stok sorguları için inventory servisine gider. |
| Tümü | `/api/v1/shipments/track/**` | API anahtarı | Kargo takibi için shipment servisine gider. |
| Tümü | `/swagger`, `/swagger/**` | Herkese açık | Catalog servisinin OpenAPI sayfasına gider. |

Hata yanıtları: istek gövdesi 1 MB'ı aşarsa `413`; hız sınırı aşılınca `429` ve JSON problem gövdesi; API anahtarı yoksa `401`, biçimi bozuksa `400`, identity anahtarı tanımıyorsa `401`, identity'ye ulaşılamıyorsa `503`, anahtarın saniyelik kotası dolduysa veya Redis yoksa `429`.

## Kod haritası

### `gateway-service/Program.cs`
Uygulamanın giriş noktası: servisleri (Redis, YARP, sağlık kontrolü, hız sınırı, CORS, sıkıştırma) kaydeder ve ara katman sırasını kurar.

| Fonksiyon | Ne yapar |
|---|---|
| (üst düzey başlangıç kodu) | Kestrel'e 1 MB gövde sınırı koyar ve `Server` başlığını kapatır, loglamayı açar, Redis/YARP/CORS/hız sınırını kaydeder (Redis sağlık kontrolü 3 sn zaman aşımlı), ara katmanları doğru sırayla dizer ve kapıyı çalıştırır; beklenmeyen çöküşte çıkış kodunu 1 yapar. |
| `ResolveCorsOrigins(configuration)` | `Cors:AllowedOrigins` listesini (yoksa yerel geliştirme kökenlerini) okur ve `PUBLIC_WEB_ORIGIN` tanımlıysa onu da ekler. |
| `WriteRateLimitProblemAsync(rejection, cancellationToken)` | Hız sınırı aşıldığında 429 için JSON problem gövdesi yazar; yalnızca kayıt (`register`) denemelerine özel bir mesaj gösterir. |
| `Program` (partial sınıf) | Entegrasyon testlerinin kapıyı `WebApplicationFactory` ile ayağa kaldırabilmesi için giriş sınıfını açık (public) yapar. |

### `gateway-service/RateLimitPolicy.cs`
IP başına sabit pencereli kotaların sayılarını ve hangi isteğin hangi kotaya düştüğünü tanımlar.

| Fonksiyon | Ne yapar |
|---|---|
| `Resolve(context)` | İsteğin istemci IP'sine, yöntemine ve yoluna bakarak kota anahtarını, izin sayısını ve pencere süresini seçer. |
| `IsSignUpRequest(request)` | İstek yalnızca `POST /api/v1/auth/register` ise true döner; özel 429 mesajını seçmek için kullanılır. |
| `IsRegisterBucketRequest(request)` | İstek `POST /api/v1/auth/register`, `/api/v1/auth/password/forgot` ya da `/api/v1/auth/email/send-verification` ise true döner; hesap açan ya da e-posta gönderen bu uçlar aynı sıkı (5/dk) kotayı paylaşır. |
| `IsPost(request)` | İsteğin POST olup olmadığını söyler. |

### `gateway-service/ClientIp.cs`
Hız sınırı için gerçek istemci IP'sini bulur ve hangi vekillere güvenileceğine karar verir.

| Fonksiyon | Ne yapar |
|---|---|
| `Resolve(context)` | Güvenilen bir vekilden gelindiyse `X-Forwarded-For` içindeki ilk adresi, aksi halde TCP bağlantısının adresini döndürür. |
| `IsTrustedProxy(address)` | Adres loopback ise ya da `TRUSTED_PROXY_CIDRS` listesinde (liste boşsa özel/yerel ağlarda) ise vekil olarak güvenilir sayar. |
| `IsPrivateOrLinkLocal(address)` | IPv4 için 10/8, 172.16/12, 192.168/16 ve 169.254/16; IPv6 için link-local, site-local ve unique-local adresleri tanır. |
| `IsUniqueLocal(address)` | IPv6 adresinin `fc00::/7` (IPv6'daki özel ağ) aralığında olup olmadığını söyler. |

### `gateway-service/CorrelationIdMiddleware.cs`
Her isteğin bir izleme kimliği (`X-Request-Id`) taşımasını sağlar; bu kimlik arka servislere, yanıta ve loglara geçer.

| Fonksiyon | Ne yapar |
|---|---|
| `CorrelationIdMiddleware(next)` | Sonraki ara katmanı saklar. |
| `InvokeAsync(context)` | Kimliği istek başlığına yazar, yanıt başlığına ekler, log bağlamına koyar ve isteği devam ettirir. |
| `ResolveRequestId(request)` | İstemcinin `X-Request-Id` ya da `X-Correlation-Id` değerini kırpıp en fazla 128 karaktere indirir; yoksa yeni bir GUID üretir. |

### `gateway-service/Middleware/ApiKeyValidationMiddleware.cs`
`RequireApiKey` işaretli rotaları korur; anahtarı doğrular ve arka servise kullanıcı kimliğini iletir.

| Fonksiyon | Ne yapar |
|---|---|
| `ApiKeyValidationMiddleware(next, redisMultiplexer, httpClientFactory, configuration)` | Gerekli bağımlılıkları (Redis, HTTP istemcisi, ayarlar) saklar. |
| `TrustedHeaders` (alan) | Arka servislerin "kapı koydu" diye güvendiği başlıklar: `X-User-Id` ve `INTERNAL_API_KEY`. |
| `InvokeAsync(context)` | Önce her rotada istemcinin gönderdiği güvenilen başlıkları siler; açık rotaları olduğu gibi geçirir; korumalı rotada anahtarı doğrular, geçersizse hata yazar, geçerliyse `X-User-Id` ve `INTERNAL_API_KEY` başlıklarını ekleyip devam eder. |
| `RouteRequiresApiKey(context)` | Eşleşen YARP rotasının meta verisinde `RequireApiKey` değerinin `"true"` olup olmadığına bakar. |
| `WriteAuthenticationProblemAsync(context, validation)` | Doğrulama hatasını uygun durum koduyla JSON problem gövdesi olarak yazar. |

### `gateway-service/Middleware/ApiKeyValidation/ApiKeyValidator.cs`
API anahtarı doğrulamasının asıl mantığı: biçim, identity sorgusu ve anahtar başına saniyelik kota.

| Fonksiyon | Ne yapar |
|---|---|
| `ApiKeyValidationContext` (sınıf) | Doğrulamanın sonucunu taşır: kullanıcı kimliği, saniyelik kota, aktiflik, hata mesajı ve durum kodu. |
| `ValidateApiKeyAsync(context, apiKey, redisMultiplexer, httpClientFactory, configuration)` | Kontrolleri sırayla çalıştırır ve ilk hatada durur; anahtarın SHA-256 özetini `HttpContext.Items["HashedApiKey"]` içine koyar. |
| `AskIdentityAsync(context, apiKey, httpClientFactory, configuration)` | Anahtarı identity servisinin iç doğrulama ucuna 5 saniye zaman aşımıyla gönderir; tanınmayan anahtarda null döner, identity çökükse hata fırlatır. |
| `CountRequestAndCheckQuotaAsync(context, redisDb, hashedKey, limitPerSecond)` | Redis'te bu anahtar ve bu saniye için sayacı artırır, `X-RateLimit-*` başlıklarını yazar ve kota aşıldıysa false döner. |
| `Reject(validation, statusCode, errorMessage)` | Sonuca durum kodunu ve hata mesajını yazıp başarısız sonucu döndürür. |
| `HashKey(rawKey)` | Ham anahtarın SHA-256 özetini küçük harfli hex olarak üretir; Redis'e ham anahtar hiç yazılmaz. |
| `IdentityValidationResponse` (sınıf) | Identity servisinin doğrulama yanıtının şekli (Id, UserId, IsActive, RateLimitTps). |

Yapılandırma ve dağıtım dosyaları: `appsettings.json` (YARP rotaları, kümeler, varsayılan ayarlar), `appsettings.Development.json` (log seviyeleri), `Properties/launchSettings.json` (yerel port 5010), `Dockerfile` (iki aşamalı imaj: SDK ile `dotnet publish`, ardından yalnızca çalışma zamanı imajında root olmayan `$APP_UID` kullanıcısıyla çalışır; diske hiçbir şey yazmaz).

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `RedisConnection` | `localhost:6379` | API anahtarı sayaçları ve hazırlık kontrolü için Redis bağlantısı. |
| `IdentityServiceInternalUrl` | `http://localhost:5001` | API anahtarının sorulduğu identity servisinin iç adresi. |
| `INTERNAL_API_KEY` | `<yerel-varsayılan>` (appsettings) | Identity'ye iç sorguda ve arka servislere iletilen iç servis anahtarı; Production'da geliştirme değeri kabul edilmez. |
| `PUBLIC_WEB_ORIGIN` | yok | Genel yayındaki web sitesinin kökeni; CORS izin listesine eklenir. |
| `TRUSTED_PROXY_CIDRS` | boş (loopback + özel/yerel ağlar) | Virgülle ayrılmış CIDR listesi; yalnızca bu vekillerden gelen `X-Forwarded-For` başlığına güvenilir. |
| `Cors:AllowedOrigins` | `appsettings.json`: `http://localhost:3000`, `http://localhost:5173`, `http://localhost:6241` ve aynılarının `127.0.0.1` biçimi (ayar hiç yoksa koddaki yedek liste 6241'siz ilk dördüdür) | Çerezli/kimlikli çağrılara izin verilen web kökenleri. |
| `ReverseProxy:Routes` | `appsettings.json` içindeki rota listesi | Hangi yolun hangi kümeye gideceği ve hangi rotanın API anahtarı istediği (`Metadata.RequireApiKey`). |
| `ReverseProxy:Clusters:<küme>:Destinations:destination1:Address` | `http://localhost:5001` … `5008` | Arka servislerin adresleri; Docker'da `ReverseProxy__Clusters__...` ile servis adlarına çevrilir. |
| `JwtSettings:Secret` | yok | Kapı kullanmaz; yalnızca tanımlıysa Production'da zayıf değer olup olmadığı denetlenir. |
| `ASPNETCORE_ENVIRONMENT` | `Production` | `Production` iken geliştirme sırlarıyla başlamayı reddeder. |

## Testler

Birim testleri `deploy/tests/Element.Gateway.Tests/` altındadır:

- `ApiKeyValidationTests.cs`: anahtar yoksa 401, biçimi bozuksa 400 ve doğru hata mesajı döndüğünü denetler.
- `GatewayHandlerTests.cs`: identity'ye ulaşılamazsa 503; identity anahtarı onaylarsa kullanıcı kimliği ve saniyelik kotanın alındığını; Redis'te eski bir "aktif" kayıt olsa bile identity reddederse 401 döndüğünü; kota aşılınca ve Redis çökünce 429 döndüğünü denetler.
- `ClientIpTests.cs`: `X-Forwarded-For` başlığına yalnızca loopback/özel ağ vekillerinden gelindiğinde güvenildiğini ve `TRUSTED_PROXY_CIDRS` ayarının işlediğini denetler.
- `CorrelationIdMiddlewareTests.cs`: istek kimliği yoksa üretildiğini, varsa korunduğunu denetler.
- `RateLimitPolicyTests.cs`: kayıt 5/dk, giriş 15/dk ve genel 60/10 sn sayılarını sabitler; şifre sıfırlama ve doğrulama e-postası uçlarının kayıtla aynı `register:` kotasını paylaştığını denetler.
- `TrustedHeaderTests.cs`: API anahtarı istemeyen bir rotada bile istemcinin gönderdiği `X-User-Id` ve `INTERNAL_API_KEY` başlıklarının silindiğini, `X-Request-Id` gibi diğer başlıkların korunduğunu denetler.

Çalıştırmak için:

```powershell
dotnet test deploy/tests/Element.Gateway.Tests/Element.Gateway.Tests.csproj --filter "Category!=Integration"
```

Uçtan uca davranış (gerçek identity ve Postgres ile) `deploy/tests/Element.Services.IntegrationTests/GatewayApiKeyIntegrationTests.cs` içindedir; Docker gerektirir:

```powershell
dotnet test deploy/tests/Element.Services.IntegrationTests/Element.Services.IntegrationTests.csproj --filter "Category=Integration"
```
