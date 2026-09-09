# identity-service

Kimlik doğrulama, JWT oturumları ve API anahtarı yönetimi (.NET 9).

| | |
|--|--|
| **Port** | `5001` |
| **Discovery** | `GET /api/v1` |
| **Swagger** | [localhost:5001/swagger](http://localhost:5001/swagger) (Development) |
| **Info** | `GET /info` |

---

## Sorumluluklar

- Kullanıcı kaydı ve giriş
- JWT token üretimi
- API anahtarı CRUD (`ele_live_` + 32 karakter)
- Webhook abonelikleri (`POST/GET/DELETE /api/v1/webhooks`)
- Gateway için internal anahtar doğrulama (`INTERNAL_API_KEY`)

---

## API endpoint'leri

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET | `/api/v1` | — | Keşif linkleri |
| POST | `/api/v1/auth/register` | — | Yeni kullanıcı |
| POST | `/api/v1/auth/login` | — | JWT al |
| POST | `/api/v1/api-keys/generate` | JWT | API key üret |
| GET | `/api/v1/api-keys` | JWT | Anahtarları listele |
| DELETE | `/api/v1/api-keys/{id}` | JWT | Anahtar sil |
| POST | `/api/v1/webhooks` | JWT | HTTPS webhook (price.updated, order.updated) |
| GET | `/api/v1/webhooks` | JWT | Aktif webhook’lar |
| DELETE | `/api/v1/webhooks/{id}` | JWT | Soft-delete |
| POST | `/api/v1/internal/api-keys/validate` | Internal | Gateway doğrulama |
| GET | `/api/v1/internal/webhooks?event=` | Internal | Notification fan-out |

### Ops

| Path | Açıklama |
|------|----------|
| `/info` | Servis metadata |
| `/health`, `/health/live`, `/health/ready` | PostgreSQL + Redis |
| `/swagger` | OpenAPI UI |

---

## Bağımlılıklar

| Kaynak | DB / servis |
|--------|-------------|
| PostgreSQL | `element_identity_db` |
| Redis | Oturum / cache |

---

## Çalıştırma

```bash
# Host (tercih) — kök start-local; ortak Postgres host portu genelde 5434
dotnet run --project Element.Services.Identity.API/Element.Services.Identity.API.csproj
```

| Yerel stack port | Değer |
|------------------|-------|
| API | `:5001` |

Kök platformda identity ortak `postgres` / `redis` konteynerlerine bağlanır (host Postgres **5434** bu makinede).

---

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `ConnectionStrings__DefaultConnection` | PostgreSQL |
| `RedisConnection` | Redis |
| `JwtSettings__Secret` | JWT imza anahtarı |

---

[← Ana README](../README.md)
