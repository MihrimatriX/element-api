# Haberci (`notification-service`)

Fiyat kıpırdadı, sipariş ilerledi — tarayıcıya anında söyle. İstenirse kayıtlı HTTPS adresine de yaz.

> Piyasa sayfasındaki canlı rakam buradan gelir. Giriş zorunlu değildir (fiyat herkese).

| | |
|--|--|
| **Port** | `5006` · tarayıcı **kapı** üzerinden `ws://localhost:5000/hub/notifications` |
| **Teknoloji** | .NET 10, SignalR |
| **Veri** | Kuyruk. Kendi Postgres’i yok |

---

## Bu kutu ne yapar?

Rabbit’ten dinler:

- catalog fiyat olayı → hub’da `PriceUpdated` (her bağlı tarayıcı),
- order `UpdateOrderStatusEvent` → `OrderStatusUpdated`.

Identity’deki webhook listesine HTTPS POST atar (`X-Element-Signature`). Özel sipariş durumu herkese açık kanalda yayınlanmaz; istemci kendi siparişini anahtarla sorar.

## Ne yapmaz?

Sipariş oluşturmaz. E-posta göndermez (o identity mailer). ELK/Grafana yok.

## Nasıl açılır?

```powershell
dotnet run --project notification-service/Element.Services.Notification.API/Element.Services.Notification.API.csproj
```

Tarayıcı asla `:5006`’ya gitmesin; CORS/proxy kapıda.

```javascript
const hub = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5000/hub/notifications")
  .build();
```

İstemci sunucuya broadcast etmez; yalnız dinler.

## Sağlık

`/info`, `/health`, `/health/live`, `/health/ready` (Rabbit).

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Ticker donuk | hub bağlı değil, catalog yayınlamıyor, Rabbit |
| Webhook gitmiyor | identity iç listesi boş veya imza/URL |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
