# Hesap (`identity-service`)

identity-service kullanıcı hesaplarını, oturumları (JWT), API anahtarlarını ve öğrenme ilerlemesini yönetir.

Misafir kullanıcıda laboratuvar tamamen tarayıcıda çalışır. Kullanıcı koleksiyonunun başka cihazlarda da görünmesini isteyince bu servis devreye girer.

| | |
|--|--|
| **Port** | `5001` |
| **Teknoloji** | .NET 10, ASP.NET Identity, JWT |
| **Veritabanı** | PostgreSQL `element_identity_db` |
| **Komşular** | gateway (auth + anahtar) · notification (webhook listesi) · web-app (JWT / öğrenme) |

## Bu kutu ne yapar?

- Kayıt ve giriş; JWT üretir (tarayıcı bunu `localStorage`’a koyar).
- API anahtarı üretir (`ele_live_` + rastgele). Gateway alışverişte ve cüzdan isteklerinde bu anahtarı sorar.
- Webhook kaydı: sipariş değişince bildirim gidecek HTTPS adresini saklar. Hesap başına en fazla 10 kayıt olur. URL, DNS adı olan herkese açık bir HTTPS adresi olmalı; IP, localhost, tek etiketli ad ve kullanıcı:şifre içeren URL reddedilir. Silme kalıcıdır, secret da silinir.
- Öğrenme: `GET/PUT /api/v1/auth/learning` keşif slug’larını ve tamamlanan rotaları tutar. Listede olmayan slug yazılmaz; izin listesi `known-compounds.json` + `lessons.json`.
- Profil, veri indirme, şifre değiştirme ve hesap silme (`HESABIMI SİL` onayıyla).
- Gateway için iç uç: `POST /api/v1/internal/api-keys/validate`.

Şifre değişince veya hesap silinince anahtarlar kapanır ve yeniden giriş gerekir. Şifre isteyen hesap işlemleri (silme, şifre değiştirme) girişle aynı kilidi paylaşır: 5 hatalı denemeden sonra ~15 dk kilit (429). Sıfırlama ve doğrulama e-postası hesap başına 2 dakikada en fazla bir kez gider; yanıt her durumda aynıdır.

## Ne yapmaz?

Cüzdan burada değil, wallet-service’te. Platform şu an e-postasız beta olarak çalışıyor: e-posta çoğu kurulumda kapalı ve `GET /api/v1/auth/capabilities` e-postanın açık olup olmadığını bildirir. E-posta kapalıyken şifremi unuttum isteği 503 döner; sahte bir "gönderildi" yanıtı verilmez. Resend entegrasyonu sonraya kaldı (SMTP env).

Captcha olarak Cloudflare Turnstile kullanılır. `CAPTCHA_SECRET_KEY` boşsa (yerelde) captcha kapalıdır. Doluysa kayıt ve giriş token ister; web tarafında `VITE_CAPTCHA_SITE_KEY` gerekir ve imaj yeniden derlenir. `capabilities.captcha` gerçek durumu bildirir.

Mağaza SKU’sunu ve bilimsel JSON’u barındırmaz; yalnız öğrenme izin listesini gömülü JSON’dan okur. Identity imajı eskiyse rota tavanı da eski kalır; imajı yeniden derle.

Ayrı bir Learning Progress servisi yok; ilerleme bu servisin token’ında ve kaydında tutulur.

## Kimle konuşur?

```
web-app → gateway → identity (kayıt/giriş/öğrenme/anahtar)
gateway → POST /internal/api-keys/validate (her çağrıda DB; önbellek yok)
notification → GET /internal/webhooks (order.updated listesi)
```

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`.

Yalnız bu servis: `docker compose --env-file docker/.env up -d --build identity-service`

Host’ta (Postgres ayakta olmalı):

```powershell
dotnet run --project identity-service/Element.Services.Identity.API/Element.Services.Identity.API.csproj
```

## Sık uçlar

Tüm uçlar kapı üzerinden çağrılır: `http://localhost:5000/...`

| Ne yapmak istiyorsun | İstek |
|----------------------|--------|
| Kayıt | `POST /api/v1/auth/register` |
| Giriş | `POST /api/v1/auth/login` → JWT |
| Ben kimim | `GET /api/v1/auth/profile` + `Authorization: Bearer …` |
| Öğrenme oku / birleştir | `GET` / `PUT /api/v1/auth/learning` |
| Anahtar üret | `POST /api/v1/api-keys/generate` |
| Verimi indir | `GET /api/v1/auth/export` |
| Hesabı sil | `POST /api/v1/auth/delete` |
| Mail / captcha açık mı | `GET /api/v1/auth/capabilities` → `passwordRecovery`, `captcha` |

İç uçlar (`/internal/...`) tarayıcıdan çağrılmaz ve `INTERNAL_API_KEY` ister.

Swagger (Development): http://localhost:5001/swagger

## Ortam

| Değişken | Ne işe yarar |
|----------|----------------|
| `ConnectionStrings__DefaultConnection` | Postgres |
| `JwtSettings__Secret` | token imzası (zorunlu; geliştirme değeri yalnız `appsettings.Development.json`’da) |
| `PUBLIC_WEB_ORIGIN` | sıfırlama e-postasındaki site adresi |
| SMTP / mailer | yoksa şifre kurtarma kapalı |
| `CAPTCHA_SECRET_KEY` | Turnstile secret; boşsa captcha kapalı |

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Öğrenme 400 | İstemci katalogda olmayan slug gönderiyor |
| Eski keşif tavanı | Identity imajı güncel `known-compounds.json` taşımıyor |
| Giriş 401 | yanlış şifre |
| Giriş 429 | kilit (5 hatalı deneme, ~15 dk) veya gateway auth hız sınırı |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md) · [Kod kılavuzu (her fonksiyon)](../docs/kilavuz/identity.md)
