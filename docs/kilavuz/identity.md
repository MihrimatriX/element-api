# Kimlik servisi (identity-service)

> Kullanıcı hesaplarını, oturum anahtarlarını (JWT), API anahtarlarını, webhook kayıtlarını ve öğrenme ilerlemesini tutan servis.

| Özellik | Değer |
|---|---|
| Teknoloji | .NET 10, ASP.NET Core, ASP.NET Identity, EF Core (Npgsql), JWT |
| Port | `5001` (Docker host) → konteyner içinde `8080`; `dotnet run` ile `5268` |
| Klasör | `identity-service/` |
| Veri | PostgreSQL `element_identity_db` (Identity tabloları + `ApiKeys` + `WebhookSubscriptions`; öğrenme ilerlemesi ve e-posta gönderim zamanları `AspNetUserTokens` içinde) · Data Protection anahtar klasörü |
| Mesajlaşma | yok |

## Ne işe yarar?

Ürünün "kim bu kullanıcı?" sorusunu cevaplayan tek yer burasıdır. Kayıt olma, giriş yapma, profil, şifre değiştirme/sıfırlama, e-posta doğrulama, hesabın verisini indirme ve hesabı silme bu serviste olur. Giriş başarılı olunca imzalı bir JWT üretir; web uygulaması bu jetonu sonraki her isteğe `Authorization: Bearer …` başlığıyla ekler.

Tarayıcıdan gelen istek önce gateway'e (`http://localhost:5000`) gelir. Gateway `/api/v1/auth/**`, `/api/v1/api-keys/**` ve `/api/v1/webhooks/**` yollarını bu servise yönlendirir. Servis JWT'yi kendisi doğrular; ek olarak jetondaki `security_stamp` değerini veritabanındaki ile karşılaştırır. Şifre değişince veya sıfırlanınca bu damga değişir, böylece eski oturumların hepsi anında geçersiz olur. Silinmiş bir hesabın jetonu da aynı kontrolle reddedilir.

Market API'sini kullanmak isteyen geliştirici burada `ele_live_…` biçiminde bir API anahtarı üretir. Veritabanında anahtarın kendisi değil yalnızca SHA-256 özeti tutulur. Gateway her API çağrısında anahtarı iç uç `POST /api/v1/internal/api-keys/validate` ile bu servise sordurur; önbellek yoktur, her çağrı veritabanından okunur, bu yüzden iptal anında geçerlidir. Her web girişi bir anahtar ürettiği için, yeni anahtar üretilirken kullanıcının iptal edilmiş anahtarlarından yalnızca en yeni 20'si tutulur, eskileri silinir. Webhook kayıtları da burada durur; notification servisi bir olay olduğunda `GET /api/v1/internal/webhooks` ile kime haber vereceğini buradan öğrenir. Bir hesap en fazla 10 webhook kaydedebilir ve adres DNS adlı, herkese açık bir HTTPS adresi olmalıdır (IP, `localhost`, tek etiketli Docker servis adı veya `kullanıcı:şifre` içeren adres reddedilir). Öğrenme ilerlemesi (keşfedilen bileşikler ve tamamlanan dersler) ayrı bir tablo açmadan Identity'nin `AspNetUserTokens` tablosunda, her başarı ayrı bir satır olacak şekilde saklanır.

Şifre isteyen hesap işlemleri (hesap silme, şifre değiştirme) girişle aynı kilit sayacını kullanır: toplam 5 hatalı şifreden sonra hesap yaklaşık 15 dakika kilitlenir ve bu uçlar da `429` döner. Böylece çalınmış bir JWT sınırsız şifre denemek için kullanılamaz. Şifre yenileme ve e-posta doğrulama mailleri hesap ve amaç başına 2 dakikada en fazla bir kez gönderilir; cevap yine aynıdır. Gönderim zamanı `AspNetUserTokens` tablosunda `ElementMail.v1` sağlayıcısıyla tutulur ve veri indirmede yer almaz.

Bilerek yapmadığı şeyler: cüzdan, sipariş ve sevkiyat burada değildir (wallet, order, shipment servisleri). RabbitMQ olayı yayınlamaz ve dinlemez. Webhook'ları kendisi göndermez; yalnızca listeyi verir. E-posta ayarı (`Mail:*`) yoksa şifre kurtarma ve e-posta doğrulama `503` döner ve "gönderildi" diye yalan söylemez. Captcha anahtarı yoksa captcha kontrolü kapalıdır.

## Uç noktalar

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Herkese açık (captcha açıksa token gerekir) | Yeni hesap açar; captcha yanlışsa veya Identity kuralları sağlanmazsa `400`. |
| POST | `/api/v1/auth/login` | Herkese açık (captcha açıksa token gerekir) | E-posta ve şifreyi kontrol edip JWT döner; yanlışsa `401`; 5. hatalı denemede hesap 15 dk kilitlenir ve o andan itibaren `429` döner. |
| GET | `/api/v1/auth/profile` | JWT | Oturumdaki kullanıcının e-posta, ad, soyad, doğrulama durumu ve kayıt tarihini döner. |
| GET | `/api/v1/auth/export` | JWT | Hesabın bu servisteki tüm verisini (profil, öğrenme kayıtları, maskeli anahtarlar, webhook adresleri) JSON olarak verir; şifre özeti ve ham anahtar içermez. |
| POST | `/api/v1/auth/delete` | JWT | Şifre ve `HESABIMI SİL` onayı doğruysa hesabı siler; anahtarlar, webhook'lar ve ilerleme de silinir. Yanlışsa `400`; hatalı şifre giriş kilidine sayılır, kilitliyse `429`. |
| GET | `/api/v1/auth/capabilities` | Herkese açık | Bu kurulumda e-posta ile kurtarma, e-posta doğrulama ve captcha açık mı, onu söyler. |
| POST | `/api/v1/auth/password/forgot` | Herkese açık | Hesap varsa (ve son 2 dakikada mail gitmediyse) şifre yenileme bağlantısı e-postalar; maili beklemez, her durumda aynı `202` cevabı verir, e-posta kapalıysa `503`. |
| POST | `/api/v1/auth/password/reset` | Herkese açık (e-postadaki token) | Bağlantıdaki token ile yeni şifre koyar, kilidi kaldırır, tüm API anahtarlarını kapatır. |
| POST | `/api/v1/auth/password/change` | JWT | Mevcut şifreyi doğrulayıp yenisini koyar; eski oturumlar ve tüm API anahtarları kapanır. Yanlışsa `400`; hatalı şifre giriş kilidine sayılır, kilitliyse `429`. |
| POST | `/api/v1/auth/email/send-verification` | JWT | Adres doğrulanmamışsa (ve son 2 dakikada mail gitmediyse) doğrulama bağlantısı e-postalar; cevap her zaman `202`, e-posta kapalıysa `503`. |
| POST | `/api/v1/auth/email/verify` | Herkese açık (e-postadaki token) | Bağlantıdaki token ile e-posta adresini doğrulanmış işaretler. |
| GET | `/api/v1/auth/learning` | JWT | Kullanıcının keşfettiği bileşikleri ve tamamladığı dersleri döner. |
| PUT | `/api/v1/auth/learning` | JWT | Gönderilen keşif ve dersleri mevcut ilerlemeye ekler (hiçbir şeyi silmez); katalogda olmayan değer gelirse `400`. |
| POST | `/api/v1/api-keys/generate` | JWT | Yeni API anahtarı üretir; ham anahtar yalnızca bu cevapta görünür, en fazla 20 etkin anahtar (`409`). İptal edilmiş anahtarlardan en yeni 20'si dışındakileri siler. |
| GET | `/api/v1/api-keys` | JWT | Kullanıcının tüm anahtarlarını (maskeli, iptal edilenler dahil) yeniden eskiye listeler. |
| DELETE | `/api/v1/api-keys/{id}` | JWT | Kullanıcının bir anahtarını iptal eder; başkasının anahtarıysa `404`. |
| POST | `/api/v1/webhooks` | JWT | Herkese açık HTTPS adresi (DNS adı; IP, `localhost`, tek etiketli ad ve `kullanıcı:şifre` yasak), olay listesi (`price.updated`, `order.updated`) ve imza sırrı ile webhook kaydeder. Adres veya olay geçersizse `400`, hesapta zaten 10 etkin webhook varsa `409`. |
| GET | `/api/v1/webhooks` | JWT | Kullanıcının etkin webhook'larını listeler; sır hiç dönmez. |
| DELETE | `/api/v1/webhooks/{id}` | JWT | Webhook'u kalıcı olarak siler (sırrı da gider); bulunamazsa veya başkasınınsa `404`. |
| POST | `/api/v1/internal/api-keys/validate` | İç servis anahtarı (`INTERNAL_API_KEY` başlığı) | Gateway'in sorduğu ham anahtarın sahibini ve hız sınırını döner; iç anahtar yanlışsa veya ham anahtar geçersizse `401`. |
| GET | `/api/v1/internal/webhooks?event=&customerId=` | İç servis anahtarı (`INTERNAL_API_KEY` başlığı) | Bir olay için en eski 10 etkin webhook'u (adres, sır, olaylar) döner; `order.updated` için yalnızca o müşterinin kayıtları. İç anahtar yanlışsa `401`. |
| GET | `/api/v1` | Herkese açık | Servisin ana uç noktalarının tam adreslerini listeler (yalnızca doğrudan 5001 portundan; gateway bu yolu başka servise yönlendirir). |
| GET | `/health` | Herkese açık | PostgreSQL kontrolüyle hazır olma durumu (`/health/ready` ile aynı). |
| GET | `/health/live` | Herkese açık | Süreç ayakta mı; bağımlılıkları kontrol etmez. |
| GET | `/health/ready` | Herkese açık | PostgreSQL erişilebilir mi. |
| GET | `/info` | Herkese açık | Servis adı, sürüm, ortam ve bağlantılar. |
| GET | `/swagger` | Herkese açık (yalnızca Development) | Etkileşimli API belgesi. |

## Kod haritası

### `identity-service/Element.Services.Identity.API/Program.cs`
Servisin başlangıç noktası: veritabanı, Identity kuralları, JWT doğrulama, sağlık kontrolü (yalnızca PostgreSQL) ve ara katmanları kurar, sonra migrasyonları uygulayıp sunucuyu başlatır.

| Fonksiyon | Ne yapar |
|---|---|
| (üst düzey kod) | Servisleri kaydeder, şifre/kilit kurallarını (en az 10 karakter, 5 hatada 15 dk kilit) ve JWT doğrulamasını ayarlar, `element_identity_db` migrasyonlarını `try` bloğu içinde uygular ve uygulamayı çalıştırır; veritabanı hiç açılmazsa `Fatal` loglayıp çıkış kodu `1` ile kapanır (yeniden başlatma politikası devreye girer). |
| `RejectTokenWithStaleSecurityStampAsync(context)` | Geçerli imzalı bir JWT'nin kullanıcısı silinmişse veya jetondaki güvenlik damgası güncel değilse oturumu "Session expired" ile reddeder. |

### `identity-service/Element.Services.Identity.API/AccountMailer.cs`
Hesap e-postalarını (şifre yenileme, adres doğrulama) SMTP ile gönderen sözleşme ve uygulaması.

| Fonksiyon | Ne yapar |
|---|---|
| `IAccountMailer.Enabled` | E-posta gönderimi yapılandırılmış mı, onu söyler. |
| `IAccountMailer.SendAsync(email, subject, message, ct)` | Tek bir düz metin e-posta gönderir. |
| `AccountMailer.Enabled` | `Mail:Host` ve `Mail:From` doluysa `true` döner. |
| `AccountMailer.SendAsync(email, subject, message, ct)` | `Mail:*` ayarlarıyla (varsayılan port 587, SSL açık) SMTP üzerinden e-posta gönderir; asenkron gönderimi bağlı bir iptal jetonuyla 10 sn'de keser (`SmtpClient.Timeout` yalnızca senkron gönderimde işler). Ayar yoksa hata fırlatır. |

### `identity-service/Element.Services.Identity.API/ClaimsPrincipalExtensions.cs`
Tüm denetleyicilerin oturumdaki kullanıcı kimliğini JWT'den aynı yolla okumasını sağlayan yardımcı.

| Fonksiyon | Ne yapar |
|---|---|
| `GetUserIdValue(user)` | Kullanıcı kimliğini önce `NameIdentifier`, yoksa `sub` talebinden metin olarak okur. |
| `GetUserId(user)` | Aynı kimliği `Guid` olarak döner; eksik veya bozuksa `null`. |

### `identity-service/Element.Services.Identity.API/InternalApiKey.cs`
Yalnızca diğer servislerin çağırabileceği iç uçları koruyan ortak anahtar kontrolü.

| Fonksiyon | Ne yapar |
|---|---|
| `IsAuthorized(request, configuration)` | `INTERNAL_API_KEY` ayarı doluysa ve istek başlığındaki değer onunla birebir aynıysa `true` döner; karşılaştırma sabit sürelidir (`CryptographicOperations.FixedTimeEquals`), boş ayar hiçbir isteği geçirmez. |

### `identity-service/Element.Services.Identity.API/Controllers/AccountSecurityController.cs`
Hesabın kendi kendine yönetildiği uçlar: profil, veri indirme, silme, şifre işlemleri ve e-posta doğrulama. İstek gövdeleri bu dosyadaki `DeleteRequest`, `EmailRequest`, `VerifyRequest`, `ResetRequest`, `ChangeRequest` kayıtlarıdır; uzunluk sınırları kayıt/giriş ile aynıdır (e-posta 254, şifre 1024, token 2048, onay 64 karakter).

| Fonksiyon | Ne yapar |
|---|---|
| `Export()` | Kullanıcının profilini, öğrenme kayıtlarını, maskeli anahtarlarını ve webhook adreslerini tek JSON'da döner. |
| `Delete(request)` | Onay cümlesi yanlışsa `400`; sonra şifreyi kilit sayacıyla kontrol eder (yanlışsa `400`, kilitliyse `429`), doğruysa hesabı siler; silme başarısızsa `409`. |
| `Capabilities()` | E-posta kurtarma, e-posta doğrulama ve captcha özelliklerinin açık olup olmadığını döner. |
| `Forgot(request)` | Hesap varsa ve 2 dakikalık gönderim hakkı alınabildiyse şifre yenileme bağlantısını gönderir; maili beklemez (SMTP gecikmesi veya hatası hesabın varlığını ele vermesin diye), hata yalnızca uyarı olarak loglanır. Hesabın var olup olmadığını belli etmez. |
| `Reset(request)` | Token ile yeni şifreyi koyar, hatalı giriş sayacını ve kilidi sıfırlar, API anahtarlarını kapatır (tek işlem içinde). |
| `Change(request)` | Mevcut şifreyi işlem dışında kilit sayacıyla doğrular (yanlışsa `400`, kilitliyse `429`), sonra yeni şifreyi koyar ve API anahtarlarını kapatır (tek işlem içinde). |
| `Profile()` | Oturumdaki kullanıcının profilini döner. |
| `SendVerification(ct)` | Adres henüz doğrulanmamışsa ve 2 dakikalık gönderim hakkı alınabildiyse doğrulama bağlantısını e-postalar. |
| `Verify(request)` | Token geçerliyse e-posta adresini doğrulanmış yapar. |
| `PublicWebOrigin` | E-posta bağlantılarının işaret ettiği web adresini (`PUBLIC_WEB_ORIGIN`) sondaki `/` olmadan verir. |
| `FindCurrentUserAsync()` | JWT'deki kimlikle kullanıcıyı veritabanından bulur; yoksa `null`. |
| `ConfirmPasswordAsync(user, password, wrongPasswordMessage)` | Şifreyi girişle aynı 5 denemelik kilitle (`CheckPasswordSignInAsync`, `lockoutOnFailure: true`) kontrol eder; doğruysa `null`, kilitliyse `429`, yanlışsa verilen mesajla `400` döner. Geri alınan bir işlemin içinde çağrılmamalıdır, yoksa hata sayacı da geri alınır. |
| `TryClaimMailSlotAsync(user, purpose)` | `AspNetUserTokens` tablosunda `ElementMail.v1` satırına tek bir atomik upsert yapar; son gönderim 2 dakikadan eskiyse zamanı günceller ve `true`, değilse `false` döner (posta kutusu bombalamasına ve SMTP kotası israfına karşı). |
| `DeactivateApiKeysAsync(user)` | Kullanıcının etkin tüm API anahtarlarını tek SQL güncellemesiyle pasif yapar. |
| `BuildEmailLink(pagePath, email, token)` | Token'ı sunucu loglarına düşmesin diye URL'nin `#` kısmına koyarak e-posta bağlantısını kurar. |
| `ToProfile(user)` | Profil cevabındaki alanları (e-posta, ad, soyad, doğrulama, kayıt tarihi) hazırlar. |

### `identity-service/Element.Services.Identity.API/Controllers/ApiInfoController.cs`
Servisin ana uç noktalarının tam adreslerini listeleyen keşif belgesi.

| Fonksiyon | Ne yapar |
|---|---|
| `Get()` | Kayıt, giriş, anahtar, webhook, swagger, sağlık ve bilgi adreslerini ad → URL sözlüğü olarak döner. |
| `GetPublicBaseUrl()` | Ters vekil arkasında `X-Forwarded-Proto` ve `X-Forwarded-Host` başlıklarını kullanarak dışarıdan görünen temel adresi bulur. |

### `identity-service/Element.Services.Identity.API/Controllers/ApiKeyController.cs`
Giriş yapmış kullanıcının API anahtarı üretme, listeleme ve iptal etme uçları.

| Fonksiyon | Ne yapar |
|---|---|
| `GenerateKey(request)` | Hesap satırını kilitleyip oturumu yeniden doğrular, 20 etkin anahtar sınırını kontrol eder, iptal edilmiş anahtarlardan en yeni 20'si dışındakileri siler ve yeni anahtarı üretir. |
| `GetUserKeys()` | Kullanıcının bütün anahtarlarını maskeli hâlde, yeniden eskiye döner. |
| `RevokeKey(id)` | Kullanıcının kendi anahtarını iptal eder; bulunamazsa `404`. |

### `identity-service/Element.Services.Identity.API/Controllers/AuthController.cs`
Herkese açık kayıt ve giriş uçları.

| Fonksiyon | Ne yapar |
|---|---|
| `Register(request, ct)` | Captcha'yı kontrol eder, hesabı oluşturur; Identity hatalarını `400` ile alan bazında döner. |
| `Login(request, ct)` | Captcha ve şifreyi (kilit sayacıyla) kontrol eder; başarılıysa JWT, e-posta ve tam adı döner. |

### `identity-service/Element.Services.Identity.API/Controllers/InternalKeysController.cs`
Gateway'in API anahtarını doğrulatmak için çağırdığı iç uç.

| Fonksiyon | Ne yapar |
|---|---|
| `ValidateKey(request)` | İç servis anahtarını kontrol eder, ham anahtarı doğrular ve sahibini, durumunu, hız sınırını döner. |

### `identity-service/Element.Services.Identity.API/Controllers/InternalWebhooksController.cs`
Notification servisinin bir olay için hangi webhook'lara gönderim yapacağını sorduğu iç uç.

| Fonksiyon | Ne yapar |
|---|---|
| `List(event, customerId)` | Etkin abonelikleri olaya göre süzer; `order.updated` için yalnızca ilgili müşterinin kayıtlarını, müşteri yoksa boş liste döner. Notification olay başına en fazla 10 adrese gönderdiği için en eski 10 kaydı döner (yayın türü `price.updated` için bu sınır platform genelidir). |

### `identity-service/Element.Services.Identity.API/Controllers/LearningController.cs`
Kullanıcının öğrenme ilerlemesini cihazlar arasında saklayan uçlar; yalnızca web uygulamasının kataloğundaki keşif ve dersleri kabul eder. Gövde biçimi bu dosyadaki `Progress(Discoveries, Lessons)` kaydıdır.

| Fonksiyon | Ne yapar |
|---|---|
| `Get(ct)` | Kullanıcının kayıtlı ilerlemesini döner. |
| `Merge(progress, ct)` | Gelen keşiflerden yalnızca kayıtlı olmayanları ekler, gereken bütün keşifleri tamamlanmış yeni dersleri ekler ve birleşmiş ilerlemeyi döner (tek işlem içinde; web istemcisi her değişiklikte tüm kümeyi yeniden gönderir). |
| `CurrentUserId` | JWT'deki kullanıcı kimliğini `Guid` olarak verir. |
| `IsKnownProgress(progress)` | Listeler boş değil mi, katalogdan uzun değil mi ve her değer katalogda var mı, onu kontrol eder. |
| `LoadKnownDiscoverySlugs()` | `known-compounds.json` dosyasındaki bileşik kısa adlarını (slug) bir kümeye yükler. |
| `LoadLessonRequirements()` | `lessons.json` dosyasından her dersin gerektirdiği keşif listesini yükler. |
| `ReadBundledJson(fileName)` | Uygulamanın yanındaki `Data` klasöründen bir JSON dosyasını okur. |
| `InsertAchievementAsync(userId, achievementName, ct)` | Bir başarıyı `AspNetUserTokens` tablosuna ekler; zaten varsa hiçbir şey yapmaz. |
| `ReadProgressAsync(userId, ct)` | Kullanıcının başarı satırlarını okuyup keşif ve ders listelerine ayırır. |
| `NamesWithoutPrefix(names, prefix)` | Verilen ön ekle başlayan adları seçer, ön eki atar ve sıralar. |

### `identity-service/Element.Services.Identity.API/Controllers/WebhooksController.cs`
Giriş yapmış kullanıcının webhook ekleme, listeleme ve silme uçları.

| Fonksiyon | Ne yapar |
|---|---|
| `Create(request)` | Adresin `WebhookSubscription.IsAcceptableUrl` kuralına uyduğunu ve en az bir desteklenen olay seçildiğini kontrol eder; hesap satırını kilitleyip 10 etkin abonelik sınırını denetler (`409`) ve aboneliği kaydeder. |
| `List()` | Kullanıcının etkin aboneliklerini yeniden eskiye döner. |
| `Delete(id)` | Kullanıcının aboneliğini veritabanından kalıcı olarak siler; bulunamazsa `404`. |
| `ToDto(subscription)` | Kaydı sırrı içermeyen cevap biçimine çevirir ve olay metnini listeye böler. |

### `identity-service/Element.Services.Identity.API/Element.Services.Identity.API.csproj`
Web projesinin tanımı; ayrıca `web-app/src/data/known-compounds.json` ve `lessons.json` dosyalarını derleme çıktısının `Data` klasörüne kopyalar.

### `identity-service/Element.Services.Identity.API/Dockerfile`
Önce yalnızca proje dosyalarını kopyalayıp paketleri geri yükler, sonra `shared-lib`, `identity-service` ve öğrenme izin listesi JSON'larını (`web-app/src/data/known-compounds.json`, `lessons.json`) kopyalayıp .NET 10 SDK ile yayımlar; sonucu `curl` eklenmiş ASP.NET çalışma imajında `8080` portunda başlatır. Mevcut `identity_keys` birimi root'a ait olduğu için bilerek root ile çalışır.

### `identity-service/Element.Services.Identity.API/appsettings.json`
Yerel geliştirme için varsayılan veritabanı bağlantısı ve JWT yayıncı/hedef/süre ayarları; JWT sırrı ve iç anahtar burada yoktur, ortam değişkeniyle verilmelidir.

### `identity-service/Element.Services.Identity.API/appsettings.Development.json`
Development ortamında log seviyelerini ve geliştirme amaçlı `JwtSettings:Secret` ile `INTERNAL_API_KEY` değerlerini verir (üretimde bu değerler reddedilir).

### `identity-service/Element.Services.Identity.API/Properties/launchSettings.json`
`dotnet run` için yerel adresler (`http://localhost:5268`) ve Development ortamı.

### `identity-service/Element.Services.Identity.Core/DTOs/AuthDtos.cs`
İstek ve cevap kayıtları: `RegisterRequest`, `LoginRequest`, `AuthResponse`, `GenerateKeyRequest`, `ApiKeyResponseDto`, `ValidateKeyRequest`, `CreateWebhookRequest`, `WebhookResponseDto`. `CreateWebhookRequest` alanları tablo sütunlarıyla aynı sınırları taşır (adres 2048, en fazla 10 olay, sır 256 karakter); fazlası Postgres'ten `500` yerine `400` döner.

| Fonksiyon | Ne yapar |
|---|---|
| `ApiKeyResponseDto.FromEntity(apiKey)` | Veritabanındaki anahtar kaydını, özet içermeyen herkese açık cevap biçimine çevirir. |

### `identity-service/Element.Services.Identity.Core/Entities/ApiKey.cs`
Bir API anahtarı kaydı: sahibi, SHA-256 özeti, maskeli görünümü, açıklaması, durumu ve saniyelik istek sınırı (varsayılan 10).

### `identity-service/Element.Services.Identity.Core/Entities/ApplicationUser.cs`
Standart Identity kullanıcısına ad, soyad ve oluşturulma zamanı ekleyen hesap kaydı.

### `identity-service/Element.Services.Identity.Core/Entities/WebhookSubscription.cs`
Bir webhook aboneliği: sahibi, HTTPS adresi, imza sırrı, virgülle ayrılmış olay adları ve etkin olup olmadığı. Silme satırı kalıcı olarak kaldırır.

| Fonksiyon | Ne yapar |
|---|---|
| `IsAcceptableUrl(url)` | Adres mutlak `https`, kullanıcı bilgisi içermeyen, en az bir nokta içeren DNS adlı (IP değil, `localhost`/`.localhost` değil) bir hostsa `true` döner. Bariz iç hedefleri baştan reddeder; çözülen IP'leri bağlantı anında notification servisi ayrıca denetler. |

### `identity-service/Element.Services.Identity.Core/Element.Services.Identity.Core.csproj`
Varlık ve DTO'ları içeren, yalnızca `Microsoft.Extensions.Identity.Stores` paketine bağlı çekirdek proje.

### `identity-service/Element.Services.Identity.Infrastructure/Persistence/IdentityAppDbContext.cs`
Identity tablolarına ek olarak `ApiKeys` ve `WebhookSubscriptions` tablolarını tanımlayan EF Core bağlamı.

| Fonksiyon | Ne yapar |
|---|---|
| `IdentityAppDbContext(options)` | Program.cs'te ayarlanan PostgreSQL seçenekleriyle bağlamı oluşturur. |
| `OnModelCreating(builder)` | Özel tablolara alan uzunluklarını, benzersiz anahtar özeti indeksini, kullanıcı indeksini ve kullanıcıyla birlikte silinme kuralını ekler. |

### `identity-service/Element.Services.Identity.Infrastructure/Persistence/Migrations/`
EF Core'un ürettiği şema geçmişi (`InitialCreate`, `AddWebhookSubscriptions`) ve model anlık görüntüsü; elle düzenlenmez, servis açılışta otomatik uygular.

### `identity-service/Element.Services.Identity.Infrastructure/Services/ApiKeyService.cs`
API anahtarlarını üreten, iptal eden ve doğrulayan servis; ham anahtarı asla saklamaz.

| Fonksiyon | Ne yapar |
|---|---|
| `ApiKeyService(context)` | Veritabanı bağlamını alır. |
| `GenerateKeyAsync(userId, description, rateLimitTps)` | `ele_live_` + 32 rastgele onaltılık karakterli anahtar üretir, hız sınırını 1-10 arasına sıkıştırır, özetini kaydeder ve ham anahtarı bir kez döner. |
| `RevokeKeyAsync(userId, keyId)` | Kullanıcıya ait anahtarı pasif yapar (temizlenecek önbellek yoktur; doğrulama her seferinde veritabanını okur); anahtar yoksa `false`. |
| `ValidateKeyAsync(rawKey)` | Ham anahtarın özetiyle etkin kaydı her seferinde veritabanından arar; yoksa `null`. |
| `HashKey(rawKey)` | Anahtarın küçük harfli SHA-256 onaltılık özetini hesaplar. |
| `MaskKey(rawKey)` | Anahtarı `ele_live_abcd...1234` gibi gösterilebilir biçime çevirir. |

### `identity-service/Element.Services.Identity.Infrastructure/Services/CaptchaVerifier.cs`
Kayıt ve girişte gönderilen captcha jetonunu Cloudflare Turnstile ile doğrulayan sözleşme ve uygulaması.

| Fonksiyon | Ne yapar |
|---|---|
| `ICaptchaVerifier.Enabled` | Captcha kontrolü açık mı, onu söyler. |
| `ICaptchaVerifier.VerifyAsync(token, ct)` | Jeton kabul edilirse `true` döner. |
| `TurnstileCaptchaVerifier.Enabled` | `CAPTCHA_SECRET_KEY` doluysa `true` döner. |
| `TurnstileCaptchaVerifier.VerifyAsync(token, ct)` | Kontrol kapalıysa hep `true`; açıksa boş jetonu reddeder, Cloudflare'e sorar ve yalnızca `success: true` cevabını kabul eder. |

### `identity-service/Element.Services.Identity.Infrastructure/Services/TokenService.cs`
Girişte dönen imzalı JWT'yi üreten servis; varsayılan yayıncı/hedef adlarını ve güvenlik damgası talep adını da tanımlar.

| Fonksiyon | Ne yapar |
|---|---|
| `TokenService(configuration)` | JWT ayarlarını okuyacağı yapılandırmayı alır. |
| `GenerateJwtToken(user)` | Kullanıcı kimliği, e-posta, ad, soyad ve güvenlik damgasıyla HMAC-SHA256 imzalı, `JwtSettings:ExpiryMinutes` dakika geçerli bir JWT üretir. |

### `identity-service/Element.Services.Identity.Infrastructure/Element.Services.Identity.Infrastructure.csproj`
ASP.NET Identity EF Core, Npgsql ve JWT paketlerini ve `shared-lib` referansını içeren altyapı projesi.

Veri dosyaları: öğrenme izin listesi olarak `web-app/src/data/known-compounds.json` ve `web-app/src/data/lessons.json` kullanılır (derlemede kopyalanır); identity içinde başka büyük veri dosyası yoktur.

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | `appsettings.json`'daki yerel PostgreSQL (`element_identity_db`) | Veritabanı bağlantısı; sağlık kontrolünde de kullanılır. |
| `JwtSettings__Secret` | yok (yalnızca Development'ta `appsettings.Development.json`'daki geliştirme değeri); hiç yoksa servis açılmaz | JWT imzalama ve doğrulama anahtarı. |
| `JwtSettings__Issuer` | `ElementGateway` | JWT yayıncısı. |
| `JwtSettings__Audience` | `ElementMicroservices` | JWT hedef kitlesi. |
| `JwtSettings__ExpiryMinutes` | `60` (`appsettings.json`'da `120`) | JWT'nin geçerlilik süresi (dakika). |
| `INTERNAL_API_KEY` | boş (yalnızca Development'ta `appsettings.Development.json`'daki geliştirme değeri) | İç uçlara (`/api/v1/internal/...`) erişim için beklenen ortak anahtar; boşsa iç uçlar herkesi reddeder. |
| `PUBLIC_WEB_ORIGIN` | `http://localhost:5173` (Docker'da `http://localhost:3000`) | Şifre yenileme ve doğrulama e-postalarındaki bağlantıların web adresi. |
| `DataProtection__KeyPath` | boş (Docker'da `/app/keys`) | Doluysa e-posta token'larını imzalayan anahtarlar bu klasörde kalıcı tutulur. |
| `Mail__Host` | boş | SMTP sunucusu; boşsa e-posta özellikleri kapalıdır. |
| `Mail__Port` | `587` | SMTP portu. |
| `Mail__From` | boş | Gönderen adresi; boşsa e-posta özellikleri kapalıdır. |
| `Mail__Username` | boş | SMTP kullanıcı adı. |
| `Mail__Password` | boş | SMTP şifresi. |
| `Mail__EnableSsl` | `true` | SMTP bağlantısında SSL kullanılsın mı. |
| `CAPTCHA_SECRET_KEY` | boş | Cloudflare Turnstile gizli anahtarı; boşsa captcha kontrolü kapalıdır. |
| `ASPNETCORE_ENVIRONMENT` | `Production` | `Development` Swagger'ı açar; `Production` geliştirme sırlarıyla açılışı reddeden kontrolü çalıştırır. |

## Testler

Birim testleri (`deploy/tests/Element.Services.UnitTests/Identity/`):

- `ApiKeyServiceTests.cs`: anahtar biçimi (`ele_live_` + 32 küçük harfli onaltılık karakter), maskeleme, özetin ham anahtarı içermemesi, hız sınırının 10'a sıkıştırılması, başkasının anahtarının iptal edilememesi, sahibinin iptal edebilmesi ve iptal edilen anahtarın doğrulanamaması (bellek içi EF Core veritabanıyla).
- `CaptchaVerifierTests.cs`: kapalıyken jetonsuz geçiş, açıkken boş jetonun reddi, Cloudflare'in başarılı ve başarısız cevapları (sahte HTTP işleyicisiyle).
- `TokenServiceTests.cs`: JWT'nin yayıncı, hedef kitle, `sub`, `email`, `firstName` ve `security_stamp` taleplerini taşıması.
- `WebhookUrlTests.cs`: `WebhookSubscription.IsAcceptableUrl` için herkese açık HTTPS DNS adlarının (port, sorgu ve IDN dahil) kabulü; boş, göreli, `http`/`ftp`, `kullanıcı:şifre`, `localhost` türevleri, Docker servis adı, IPv4 (ondalık ve onaltılık yazımlar dahil), özel ağ, bulut meta veri adresi ve IPv6 hedeflerinin reddi.

Entegrasyon testleri (Docker gerekir; gerçek PostgreSQL konteyneri açılır — ortak test altyapısı ayrıca Redis de başlatır, kimlik servisi kullanmaz):

- `deploy/tests/Element.Services.IntegrationTests/IdentityServiceIntegrationTests.cs`: kayıt → giriş → anahtar üretme → iç uçla doğrulama ve webhook ekleme/listeleme/silme akışı; ikinci silmede `404`, iç adrese webhook'ta `400`, eşzamanlı 11 kayıtta 10 başarı ve bir `409`, yanlış iç anahtarla `401`, iç listenin 10 kayıt dönmesi.
- `deploy/tests/Element.Services.IntegrationTests/LearningIntegrationTests.cs`: iki cihazdan eşzamanlı ilerleme birleştirme ve başka hesabın görememesi, 5. hatalı girişte kilit ve `429`, silme ve şifre değiştirmenin giriş kilidini paylaşması, şifre değişince oturum ve anahtarların kapanması, e-posta bağlantılarının tek kullanımlık olması ve 2 dakika içinde ikinci yenileme mailinin gitmemesi, veri indirmenin sır içermemesi ve hesap silme, eşzamanlı anahtar üretiminde 20 sınırı, iptal edilmiş anahtar geçmişinin 20 kayıtla sınırlanması.

Komutlar (depo kökünden):

```powershell
# Birim testleri (kimlik testleri dahil tümü)
dotnet test deploy/tests/Element.Services.UnitTests/Element.Services.UnitTests.csproj --filter "Category!=Integration"

# Yalnızca kimlik birim testleri
dotnet test deploy/tests/Element.Services.UnitTests/Element.Services.UnitTests.csproj --filter "FullyQualifiedName~Element.Services.UnitTests.Identity"

# Kimlik entegrasyon testleri (Docker açık olmalı)
dotnet test deploy/tests/Element.Services.IntegrationTests --filter "FullyQualifiedName~IdentityServiceIntegrationTests|FullyQualifiedName~LearningIntegrationTests"
```
