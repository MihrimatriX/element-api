# web-app

Element Market mağaza arayüzü — React 19 + Vite + TypeScript + nginx.

| | |
|--|--|
| **Port** | `3000` |
| **Health** | `GET /health` |
| **Info** | `GET /info` |

---

## Sorumluluklar

- Element fiyat dashboard'u
- Sipariş oluşturma akışı
- API anahtarı yönetimi (Identity)
- SignalR canlı bildirimler

Statik SPA — tüm veri gateway API'den gelir.

---

## Endpoint'ler

| Path | Açıklama |
|------|----------|
| `/*` | React SPA |
| `/health` | nginx health probe |
| `/info` | Statik servis metadata |

---

## Bağımlılıklar

| Servis | Adres |
|--------|-------|
| gateway-service | `VITE_API_BASE_URL` → `http://localhost:5000/api/v1` |
| SignalR | `http://localhost:5000/hub/notifications` |

---

## Çalıştırma

```bash
# Tüm platform
docker compose --env-file docker/.env up -d --build

# Sadece web (gateway ayakta olmalı)
cd web-app && docker compose up -d --build
```

### Geliştirme

```bash
npm ci
npm run dev    # http://localhost:5173
```

Build arg (Docker):

```yaml
VITE_API_BASE_URL: http://localhost:5000/api/v1
```

---

[← Ana README](../README.md)
