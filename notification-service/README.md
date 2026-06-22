# notification-service

Gerçek zamanlı bildirimler — SignalR hub + RabbitMQ event tüketicisi (.NET 9).

| | |
|--|--|
| **Port** | `5006` (internal), gateway: `5000/hub/notifications` |
| **Info** | `GET /info` |

---

## Sorumluluklar

- Fiyat değişimi ve sipariş durumu event'lerini dinler
- Bağlı istemcilere SignalR push
- Gateway WebSocket proxy

---

## Endpoint'ler

| Method | Path | Açıklama |
|--------|------|----------|
| WS | `/hub/notifications` | SignalR hub |
| POST | `/hub/notifications/negotiate` | SignalR negotiate |

### Hub metodları

| Metod | Açıklama |
|-------|----------|
| `SendMessage(user, message)` | → `ReceiveMessage` broadcast |

### Ops

| Path | Açıklama |
|------|----------|
| `/info` | Hub path + linkler |
| `/health`, `/health/live`, `/health/ready` | RabbitMQ |
| `/metrics` | Prometheus |

---

## Tüketilen event'ler

| Event | Kaynak |
|-------|--------|
| Element fiyat değişimi | catalog |
| `UpdateOrderStatusEvent` | order saga |

---

## İstemci bağlantısı

```javascript
// Web app gateway üzerinden bağlanır
const hub = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5000/hub/notifications")
  .build();
```

---

## Çalıştırma

```bash
cd notification-service && docker compose up -d --build
dotnet run --project Element.Services.Notification.API/Element.Services.Notification.API.csproj
```

---

[← Ana README](../README.md)
