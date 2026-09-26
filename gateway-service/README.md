# Kapı (`gateway-service`)

Dış dünyanın konuştuğu tek adres. Kendisi element bilmez; isteği doğru odaya verir.

> Tarayıcı, dokümantasyon tezgâhı ve API anahtarlı istemci buraya gelir: **http://localhost:5000**

| | |
|--|--|
| **Port** | `5000` (konteyner içi 8080) |
| **Teknoloji** | .NET 10, **YARP** |
| **Veritabanı** | Yok. Redis: hız sınırı ve anahtar önbelleği |
| **Komşular** | Tüm HTTP odaları (YARP) · identity (anahtar doğrula) · Redis |

---

## Bu kutu ne yapar?

Şöyle çalışır: yoluna bakıp doğru kümeye (cluster) yollar.

- `/api/v2/elements/fe` → catalog
- `/api/v2/compounds/h2o` → compound
- `/api/v1/auth/login` → identity
- `/api/v1/me/**`, `/desk/**` → **wallet**
- `/api/v1/stock/**` → **inventory**
- `/api/v1/orders` → **order** (API anahtarı şart)

Ayrıca: `X-API-Key` doğrular (identity’ye sorar, yanıtı Redis’te kısa tutar). IP başına:
**kayıt 5/dk**, diğer auth POST **15/dk**, kalan **60 / 10 sn** (ayrıntı `RateLimitPolicy`); anahtarlı uçlarda ayrıca Redis TPS. Aşan 429. Captcha identity’de (Turnstile); Caddy’de stock `rate_limit` yok — security headers + body 1MB.

Bilimsel GET’ler herkese açık, CORS açık.

## Ne yapmaz?

Ödeme ve kargo odalarına HTTP yol vermez. Onlar yalnız kuyrukla konuşur (wallet event, shipment worker).

`GET /api/v2/coverage` burada yoktur ve bilinçli eklenmedi: kapsam, element ve bileşik odalarının toplamını ister; kapı yalnız geçirir, toplama yapmaz. Kapsam özeti bağımsız atlas’tadır (`:5080`). Kapıdayken alternatif: liste uçlarındaki `info.count` (`GET /api/v2/elements?pageSize=1` → 118) veya web’de `/data` sayfası.

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`. Kapı olmadan diğer odalar tarayıcıdan görünmez.

Tek servis: `docker compose --env-file docker/.env up -d --build gateway-service`

Yalnız kapıyı host’ta yeniden başlatmak (Redis + arka odalar ayaktayken):

```powershell
dotnet run --project gateway-service/Element.Gateway.csproj
```

Tek satır UI için tüm imajları `--build` etme. Vite CSS için `npm --prefix web-app run dev` yeter.

## Sık bakılan kapılar

| Yol | Kime gider | Kim girebilir |
|-----|------------|----------------|
| `GET /info` | kendisi | herkes |
| `GET /api/v2/elements/**` | catalog | herkes |
| `GET /api/v2/compounds/**` | compound | herkes |
| `GET /api/v1/elements/{sembol}/ticker` | catalog | herkes |
| `GET /api/v1/market/**` | catalog | herkes |
| `GET /api/v1/stock/**` | **inventory** | herkes |
| `/api/v1/auth/**` | identity | kayıt/giriş açık; öğrenme JWT |
| `/api/v1/api-keys/**`, `/webhooks/**` | identity | JWT |
| `/api/v1/me/**`, `/desk/**` | **wallet** | API anahtarı |
| `/api/v1/orders/**` | order | API anahtarı |
| `GET /api/v1/shipments/track/**` | shipment | API anahtarı |
| `/swagger` | catalog OpenAPI | herkes |

## Ortam

| Değişken | Ne işe yarar |
|----------|----------------|
| `RedisConnection` | hız sınırı / anahtar önbelleği |
| `IdentityServiceInternalUrl` | “bu anahtar kimin?” |
| `INTERNAL_API_KEY` | identity’ye iç sorgu |
| `PUBLIC_WEB_ORIGIN` | ekstra CORS kökeni (public host) |
| (rate limit IP) | peer loopback **veya** Docker private iken ilk `X-Forwarded-For` hop |
| `ReverseProxy__Clusters__*` | odaların adresi (Docker DNS veya localhost) |

Compose’ta Redis host’ta genelde **6380** yayınlanır; `localhost:6379` başka uygulamaya ait olabilir.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Vite `/docs` Failed to fetch | Dev’de bilim proxy’si `:5080`; kapı değil. Science kapalıysa tezgâh düşer |
| 401 sipariş / cüzdan | `X-API-Key` yok veya identity Redis/DB yok |
| 502 | Arka oda kalkmamış; `GET :5002/health` veya `:5005/health` gibi doğrudan dene |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
