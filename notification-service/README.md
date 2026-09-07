# notification-service

Gerçek zamanlı bildirimler — SignalR hub + RabbitMQ event tüketicisi (.NET 9).

| | |
|--|--|
| **Port** | `5006` (internal), gateway: `5000/hub/notifications` |
| **Info** | `GET /info` |

---

## Sorumluluklar

- Fiyat değişimi ve sipariş durumu event'lerini dinler
- Bağlı istemcilere SignalR push (`PriceUpdated` herkese; login gerekmez)
- Identity'deki webhook listesine HTTPS POST (`X-Element-Signature`)

---

## Endpoint'ler

| Method | Path | Açıklama |
|--------|------|----------|
| WS | `/hub/notifications` | SignalR hub |
| POST | `/hub/notifications/negotiate` | SignalR negotiate |

### Hub metodları

İstemci broadcast yok. Sunucu `PriceUpdated` ve `OrderStatusUpdated` yollar.

### Ops

| Path | Açıklama |
|------|----------|
| `/info` | Hub path + linkler |
| `/health`, `/health/live`, `/health/ready` | RabbitMQ |

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
# Host (tercih)
dotnet run --project Element.Services.Notification.API/Element.Services.Notification.API.csproj
```

---

[← Ana README](../README.md)
