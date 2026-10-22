# Kapı (`gateway-service`)

gateway-service dışarıdan gelen bütün isteklerin girdiği tek adrestir. Element verisi tutmaz; her isteği yoluna bakarak ilgili servise iletir.

Tarayıcı, dokümantasyon sayfasındaki deneme alanı ve API anahtarlı istemciler http://localhost:5000 adresine bağlanır.

| | |
|--|--|
| **Port** | `5000` (konteyner içi 8080) |
| **Teknoloji** | .NET 10, **YARP** |
| **Veritabanı** | Yok. Redis: API anahtarı başına saniyelik hız sayacı |
| **Komşular** | Tüm HTTP servisleri (YARP) · identity (anahtar doğrulama) · Redis |

## Bu kutu ne yapar?

İsteğin yoluna bakar ve onu doğru kümeye (cluster) yollar:

- `/api/v2/elements/fe` → catalog
- `/api/v2/compounds/h2o` → compound
- `/api/v1/auth/login` → identity
- `/api/v1/me/**`, `/desk/**` → wallet
- `/api/v1/stock/**` → inventory
- `/api/v1/orders` → order (API anahtarı şart)

`X-API-Key` başlığını da doğrular. Bunun için her istekte identity’ye sorar ve yanıtı önbelleğe almaz, bu yüzden iptal edilen anahtar anında geçersiz olur.

IP başına hız sınırları: kayıt, şifre sıfırlama ve doğrulama e-postası için 5/dk, diğer auth POST istekleri için 15/dk, geri kalan istekler için 60 / 10 sn (ayrıntı `RateLimitPolicy`). Anahtarlı uçlarda ayrıca Redis üzerinden TPS sınırı uygulanır. Sınırı aşan istek 429 alır. Captcha (Turnstile) identity’de çalışır. Caddy’de stock `rate_limit` yok; Caddy security headers ekler ve body boyutunu 1MB ile sınırlar.

Bilimsel GET uçları herkese açıktır ve CORS açıktır.

## Ne yapmaz?

Ödeme ve kargo işlemlerine HTTP yolu açmaz. Bunlar yalnız kuyruk üzerinden yürür (wallet event’leri, shipment worker’ı).

`GET /api/v2/coverage` burada bilinçli olarak yok. Kapsam hesabı element ve bileşik servislerinin toplamını gerektirir; kapı ise istekleri yalnız iletir, toplama yapmaz. Kapsam özeti bağımsız atlas’ta (`:5080`) bulunur. Kapı üzerinden çalışırken liste uçlarındaki `info.count` alanını (`GET /api/v2/elements?pageSize=1` 118 döner) veya web’deki `/data` sayfasını kullanabilirsin.

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`. Kapı çalışmazsa diğer servislere tarayıcıdan ulaşılamaz.

Yalnız bu servis: `docker compose --env-file docker/.env up -d --build gateway-service`

Yalnız kapıyı host’ta yeniden başlatmak için (Redis ve arkadaki servisler ayaktayken):

```powershell
dotnet run --project gateway-service/Element.Gateway.csproj
```

Küçük bir arayüz değişikliği için bütün imajları `--build` ile yeniden derleme. Vite ve CSS işi için `npm --prefix web-app run dev` yeterli.

## Sık bakılan kapılar

| Yol | Kime gider | Kim girebilir |
|-----|------------|----------------|
| `GET /info` | kendisi | herkes |
| `GET /api/v2/elements/**` | catalog | herkes |
| `GET /api/v2/compounds/**` | compound | herkes |
| `GET /api/v1/elements/{sembol}/ticker` | catalog | herkes |
| `GET /api/v1/market/**` | catalog | herkes |
| `GET /api/v1/stock/**` | inventory | herkes |
| `/api/v1/auth/**` | identity | kayıt/giriş açık; öğrenme JWT |
| `/api/v1/api-keys/**`, `/webhooks/**` | identity | JWT |
| `/api/v1/me/**`, `/desk/**` | wallet | API anahtarı |
| `/api/v1/orders/**` | order | API anahtarı |
| `GET /api/v1/shipments/track/**` | shipment | API anahtarı |
| `/swagger` | catalog OpenAPI | herkes |

## Ortam

| Değişken | Ne işe yarar |
|----------|----------------|
| `RedisConnection` | API anahtarı başına saniyelik hız sayacı |
| `IdentityServiceInternalUrl` | Anahtarın kime ait olduğunu sormak için identity adresi |
| `INTERNAL_API_KEY` | identity’ye iç sorgu |
| `PUBLIC_WEB_ORIGIN` | ekstra CORS kökeni (public host) |
| (rate limit IP) | peer loopback veya Docker private ağdaysa ilk `X-Forwarded-For` hop’u kullanılır |
| `ReverseProxy__Clusters__*` | servislerin adresi (Docker DNS veya localhost) |

Compose, Redis’i host’ta genelde 6380 portunda yayınlar; `localhost:6379` başka bir uygulamaya ait olabilir.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Vite `/docs` Failed to fetch | Dev’de bilim proxy’si kapıya değil `:5080`’e gider; science kapalıysa deneme alanı çalışmaz |
| 401 sipariş / cüzdan | `X-API-Key` yok veya identity’nin Redis/DB bağlantısı yok |
| 502 | Arkadaki servis ayağa kalkmamış; `GET :5002/health` veya `:5005/health` gibi doğrudan dene |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
