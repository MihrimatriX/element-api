# gateway-service

Tek giriş noktası — YARP reverse proxy, API key doğrulama, rate limiting, GraphQL BFF (.NET 9).

| | |
|--|--|
| **Port** | `5000` |
| **Swagger** | — (backend Swagger: catalog `:5002/swagger`) |
| **Health UI** | [localhost:5000/health-ui](http://localhost:5000/health-ui) |
| **Info** | `GET /info` |

---

## Sorumluluklar

- REST trafiğini identity, catalog, compound, order, notification servislerine yönlendirme
- `X-API-Key` doğrulama (Identity internal validate + Redis cache)
- Global rate limit (100 req / 10 sn / API key veya IP)
- GraphQL BFF — `elementPrice(symbol)` sorgusu
- SignalR proxy — `/hub/notifications`
- Health Checks UI — tüm backend'lerin durumu

## Veritabanı

Yok — stateless proxy. Redis: rate limit / cache.

---

## Endpoint'ler

### Gateway-native

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/info` | Platform keşif linkleri |
| GET | `/health` | Readiness (Redis) |
| GET | `/health/live` | Liveness |
| GET | `/health/ready` | Readiness |
| GET | `/health-ui` | Sağlık dashboard |
| GET | `/metrics` | Prometheus |
| POST | `/graphql` | GraphQL BFF |

### Proxy rotaları

| Path prefix | Cluster | Not |
|-------------|---------|-----|
| `/api/v1/auth/**` | identity | Kayıt, giriş |
| `/api/v1/api-keys/**` | identity | JWT |
| `/api/v1/webhooks/**` | identity | JWT |
| `/api/v1/elements/{symbol}/ticker` | catalog | Public |
| `/api/v1/market/**` | catalog | Public |
| `/api/v1/compounds/**` | compound | Public |
| `/api/v1/elements/{symbol}/compounds` | compound | Public |
| `/api/v1/elements/**` | catalog | History → API key |
| `/api/v1/me/**`, `/desk/**` | order | API key |
| `/api/v1/orders/**` | order | API key |
| `/swagger` | catalog | Public OpenAPI |
| `/hub/notifications/**` | notification | WebSocket |

---

## Bağımlılıklar

| Servis | Docker DNS |
|--------|------------|
| identity-service | `identity-service:8080` |
| catalog-service | `catalog-service:8080` |
| compound-service | `compound-service:8080` |
| order-service | `order-service:8080` |
| notification-service | `notification-service:8080` |
| Redis | `redis:6379` |

Payment ve shipment gateway'den proxy edilmez (saga internal).

---

## Çalıştırma

```bash
# Tüm platform (önerilen)
docker compose --env-file docker/.env up -d --build

# Sadece gateway (backend'ler ayakta olmalı)
cd gateway-service && docker compose up -d --build
```

```bash
dotnet run --project Element.Gateway.csproj
```

---

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `RedisConnection` | Redis adresi |
| `IdentityServiceInternalUrl` | API key validate |
| `INTERNAL_API_KEY` | Identity/order internal çağrılar |
| `PUBLIC_WEB_ORIGIN` | CORS ek origin |
| `ReverseProxy__Clusters__*` | YARP hedef adresleri |

---

[← Ana README](../README.md)
