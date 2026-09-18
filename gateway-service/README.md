# Kapı (`gateway-service`)

Dış dünyanın konuştuğu tek adres. Kendisi element bilmez; isteği doğru odaya verir.

> Tarayıcı, dokümantasyon tezgâhı ve API anahtarlı istemci buraya gelir: **http://localhost:5000**

| | |
|--|--|
| **Port** | `5000` (konteyner içi 8080) |
| **Teknoloji** | .NET 10, YARP |
| **Veritabanı** | Yok. Redis: hız sınırı ve anahtar önbelleği |

---

## Bu kutu ne yapar?

- `/api/v2/elements/fe` → katalog
- `/api/v2/compounds/h2o` → bileşik
- `/api/v1/auth/login` → hesap
- `/api/v1/orders` → sipariş (API anahtarı şart)
- `/hub/notifications` → canlı bildirim (WebSocket)

Ayrıca: `X-API-Key` doğrular (identity’ye sorar, yanıtı Redis’te kısa tutar). Anahtar veya IP başına kabaca **10 saniyede 100** istek; aşanı 429.

Bilimsel GET’ler herkese açık, CORS açık.

## Ne yapmaz?

Ödeme ve kargo odalarına yol vermez. Onlar yalnız kuyrukla konuşur.

`GET /api/v2/coverage` burada yoktur ve bilinçli eklenmedi: kapsam, element ve
bileşik odalarının toplamını ister; kapı yalnız geçirir, toplama yapmaz.
Kapsam özeti bağımsız atlas’tadır (`:5080`). Kapıdayken alternatif: liste
uçlarındaki `info.count` (`GET /api/v2/elements?pageSize=1` → 118) veya
web’de `/data` sayfası.

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`. Kapı olmadan diğer odalar tarayıcıdan görünmez.

Yalnız kapıyı host’ta yeniden başlatmak (Redis + arka odalar ayaktayken):

```powershell
dotnet run --project gateway-service/Element.Gateway.csproj
```

Tek satır UI için tüm imajları `--build` etme.

## Sık bakılan kapılar

| Yol | Kime gider | Kim girebilir |
|-----|------------|----------------|
| `GET /info` | kendisi | herkes |
| `GET /api/v2/elements/**` | catalog | herkes |
| `GET /api/v2/compounds/**` | compound | herkes |
| `GET /api/v1/elements/{sembol}/ticker` | catalog | herkes |
| `GET /api/v1/market/**` | catalog | herkes |
| `/api/v1/auth/**` | identity | kayıt/giriş açık; öğrenme JWT |
| `/api/v1/api-keys/**`, `/webhooks/**` | identity | JWT |
| `/api/v1/me/**`, `/desk/**`, `/orders/**` | order | API anahtarı |
| `GET /api/v1/shipments/track/**` | shipment | API anahtarı |
| `/hub/notifications/**` | notification | tarayıcı |
| `/swagger` | catalog OpenAPI | herkes |

## Ortam

| Değişken | Ne işe yarar |
|----------|----------------|
| `RedisConnection` | hız sınırı / anahtar önbelleği |
| `IdentityServiceInternalUrl` | “bu anahtar kimin?” |
| `INTERNAL_API_KEY` | identity’ye iç sorgu |
| `PUBLIC_WEB_ORIGIN` | ekstra CORS kökeni (public host) |
| (rate limit IP) | peer loopback iken ilk `X-Forwarded-For` hop |
| `ReverseProxy__Clusters__*` | odaların adresi (Docker DNS veya localhost) |

Compose’ta Redis host’ta genelde **6380** yayınlanır; `localhost:6379` başka uygulamaya ait olabilir.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Vite `/docs` Failed to fetch | Dev’de bilim proxy’si `:5080`; kapı değil. Science kapalıysa tezgâh düşer |
| 401 sipariş | `X-API-Key` yok veya identity Redis/DB yok |
| 502 | Arka oda kalkmamış; `GET :5002/health` gibi doğrudan dene |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
