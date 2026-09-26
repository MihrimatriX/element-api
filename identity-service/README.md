# Hesap (`identity-service`)

Kim bu kullanıcı, oturumu geçerli mi, API anahtarı kimin, öğrenme ilerlemesi nerede duruyor.

> Laboratuvar misafirken tarayıcıda çalışır. “Koleksiyonum başka cihazda da dursun” dendiğinde bu kutu devreye girer.

| | |
|--|--|
| **Port** | `5001` |
| **Teknoloji** | .NET 10, ASP.NET Identity, JWT |
| **Veritabanı** | PostgreSQL `element_identity_db` · Redis |
| **Komşular** | gateway (auth + anahtar) · notification (webhook listesi) · web-app (JWT / öğrenme) |

---

## Bu kutu ne yapar?

- Kayıt ve giriş; JWT üretir (tarayıcı `localStorage`’a koyar).
- API anahtarı basar (`ele_live_` + rastgele). Gateway alışverişte ve cüzdanda bunu sorar.
- Webhook kaydı: “sipariş değişince şu HTTPS adresine yaz.”
- Öğrenme: `GET/PUT /api/v1/auth/learning` — keşif slug’ları ve tamamlanan rotalar. Uydurma slug yazılmaz; izin listesi `known-compounds.json` + `lessons.json`.
- Profil, veri indirme, şifre değiştirme, hesap silme (`HESABIMI SİL` onayı).
- Gateway için iç uç: `POST /api/v1/internal/api-keys/validate`.

Şifre değişince veya hesap silinince anahtarlar kapanır; yeniden giriş gerekir.

## Ne yapmaz?

Cüzdan burada değildir (**wallet-service**). E-posta şu an **e-postasız beta**: çoğu kurulumda kapalı; `GET /api/v1/auth/capabilities` “mail var mı” der. Kapalıyken unutulan şifre 503 döner — “gönderildi” yalanı yok. Resend sonra (SMTP env).

**Captcha:** Cloudflare Turnstile. `CAPTCHA_SECRET_KEY` boşsa kapalı (yerel). Doluysa kayıt ve giriş token ister; web’de `VITE_CAPTCHA_SITE_KEY` (imaj rebuild). `capabilities.captcha` dürüst.

Mağaza SKU’su ve bilimsel JSON’u barındırmaz; yalnız öğrenme izin listesini gömülü JSON’dan okur. Identity imajı eskiyse rota tavanı eski kalır; yeniden derle.

Ayrı Learning Progress servisi yok; ilerleme hâlâ bu kutunun token/kaydında.

## Kimle konuşur?

```
web-app → gateway → identity (kayıt/giriş/öğrenme/anahtar)
gateway → POST /internal/api-keys/validate (Redis önbellek)
notification → GET /internal/webhooks (order.updated listesi)
```

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`.

Tek servis: `docker compose --env-file docker/.env up -d --build identity-service`

Host:

```powershell
dotnet run --project identity-service/Element.Services.Identity.API/Element.Services.Identity.API.csproj
```

Postgres ve Redis ayakta olmalı.

## Sık uçlar

Hepsi kapı üzerinden: `http://localhost:5000/...`

| Ne yapmak istiyorsun | İstek |
|----------------------|--------|
| Kayıt | `POST /api/v1/auth/register` |
| Giriş | `POST /api/v1/auth/login` → JWT |
| Ben kimim | `GET /api/v1/auth/profile` + `Authorization: Bearer …` |
| Öğrenme oku / birleştir | `GET` / `PUT /api/v1/auth/learning` |
| Anahtar bas | `POST /api/v1/api-keys/generate` |
| Verimi indir | `GET /api/v1/auth/export` |
| Hesabı sil | `POST /api/v1/auth/delete` |
| Mail / captcha açık mı | `GET /api/v1/auth/capabilities` → `passwordRecovery`, `captcha` |

İç uçlar (`/internal/...`) tarayıcı işi değildir; `INTERNAL_API_KEY` ister.

Swagger (Development): http://localhost:5001/swagger

## Ortam

| Değişken | Ne işe yarar |
|----------|----------------|
| `ConnectionStrings__DefaultConnection` | Postgres |
| `RedisConnection` | önbellek |
| `JwtSettings__Secret` | token imzası |
| `PUBLIC_WEB_ORIGIN` | sıfırlama mailindeki site adresi |
| SMTP / mailer | yoksa kurtarma kapalı |
| `CAPTCHA_SECRET_KEY` | Turnstile secret; boşsa captcha kapalı |

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Öğrenme 400 | İstemci katalogda olmayan slug gönderiyor |
| Eski keşif tavanı | Identity imajı güncel `known-compounds.json` taşımıyor |
| Giriş 401 | yanlış şifre |
| Giriş 429 | kilit (5 hatalı → ~15 dk) veya gateway auth hız sınırı |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
