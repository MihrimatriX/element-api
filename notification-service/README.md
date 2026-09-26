# Haberci (`notification-service`)

Sipariş durumu değişince, kullanıcının kayıtlı **HTTPS** adresine `order.updated` yazar. Fiyat panosu buradan gitmez; market/shop kendi anketini çeker.

> Tarayıcı `:5006`’ya gelmez. Kapı bu odayı dışarıya yayınlamaz. Kutu yalnız Rabbit + identity iç uç + dış webhook konuşur.

| | |
|--|--|
| **Port** | `5006` (gateway’den route yok) |
| **Teknoloji** | .NET 10, MassTransit |
| **Veri** | Kendi Postgres’i yok. Kuyruk: `notification-order-updates` |
| **Komşular** | order (event üretir) · identity (webhook listesi) · senin HTTPS uçların |

---

## Bu kutu ne yapar?

Akış şöyle:

1. Order saga durum günceller → `UpdateOrderStatusEvent` kuyruğa düşer.
2. Bu kutu event’i yer.
3. Identity’ye iç sorgu: `GET /api/v1/internal/webhooks?event=order.updated&customerId=…` (`INTERNAL_API_KEY`).
4. Her hook için HTTPS POST: gövde JSON, başlıklar `X-Element-Event: order.updated` ve `X-Element-Signature` (HMAC-SHA256, hook secret).
5. İlk POST başarısızsa ~10 sn sonra bir kez daha dener.

Güvenlik: yalnız **https://**; private/SSRF host’lar bilinçli reddedilir. HTTP veya `user:pass@` URL kabul edilmez.

Canlı fiyat / SignalR / ELK **yok** — kaldırıldı. İstemci kendi siparişini API anahtarıyla `GET /orders/{id}` ile sorar.

## Ne yapmaz?

Sipariş oluşturmaz. KREDI veya stok bilmez. E-posta göndermez (o identity mailer; çoğu kurulumda SMTP boş → kapalı). Gateway üzerinden HTTP API sunmaz.

## Kimle konuşur?

```
order  --UpdateOrderStatusEvent-->  notification
notification  --iç HTTP-->  identity (webhook listesi)
notification  --HTTPS POST-->  senin sunucun
```

Webhook kaydı identity API’sinden (`/api/v1/webhooks/**`, JWT). Haberci yalnız listedeki adreslere yazar.

## Nasıl açılır?

Tam platform ile gelir:

```powershell
./deploy/scripts/present-platform.ps1
```

Tek servis (Rabbit + identity ayaktayken):

```powershell
docker compose --env-file docker/.env up -d --build notification-service
```

Host:

```powershell
dotnet run --project notification-service/Element.Services.Notification.API/Element.Services.Notification.API.csproj
```

Gerekli ortam: `IdentityServiceInternalUrl` (Compose’ta identity DNS), `INTERNAL_API_KEY` (identity ile aynı).

## Sağlık

`/info`, `/health`, `/health/live`, `/health/ready` (Rabbit hazır mı).  
Örnek: `curl http://localhost:5006/health/ready`

`/metrics` ve `/health-ui` **404** — observability yığını yok.

## Webhook’u denemek

1. Hesap aç, JWT al.
2. Identity’de webhook kaydet (event `order.updated`, **https** URL + secret).
3. Mağazadan sipariş ver; saga ilerleyince POST gelmeli.
4. İmza: gövde byte’ları + hook secret → HMAC-SHA256 hex; `X-Element-Signature` ile karşılaştır.

Yerelde `https://localhost` çoğu zaman SSRF/private engeline takılır; gerçek dış HTTPS veya tünel kullan.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Ticker / piyasa donuk | **Bu kutu değil** — market anketi veya catalog |
| Webhook hiç gelmiyor | Identity’de kayıt yok; event adı yanlış; identity iç uç 401 (`INTERNAL_API_KEY`) |
| POST reddediliyor | HTTP URL; private IP; imza uyuşmazlığı |
| Sipariş Completed, hook yok | Bu worker veya Rabbit endpoint `notification-order-updates` |
| Konteyner unhealthy | Rabbit yok; `/health/ready` |

Birim testi: `deploy/tests/Element.Services.UnitTests` içinde webhook fanout.

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md) · [Identity](../identity-service/README.md)
