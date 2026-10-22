# Haberci (`notification-service`)

notification-service, sipariş durumu değişince kullanıcının kayıtlı HTTPS adresine `order.updated` webhook’u gönderir. Fiyat panosu bu servisten beslenmez; market ve shop sayfaları fiyatları kendi anketleriyle çeker.

Tarayıcı `:5006`’ya bağlanmaz; kapı bu servisi dışarıya açmaz. Servis yalnız Rabbit, identity’nin iç ucu ve dış webhook adresleriyle konuşur.

| | |
|--|--|
| **Port** | `5006` (gateway’de route yok) |
| **Teknoloji** | .NET 10, MassTransit |
| **Veri** | Kendi Postgres’i yok. Kuyruk: `notification-order-updates` |
| **Komşular** | order (event üretir) · identity (webhook listesi) · senin HTTPS uçların |

## Bu kutu ne yapar?

1. Order saga’sı sipariş durumunu günceller ve `UpdateOrderStatusEvent` kuyruğa düşer.
2. Bu servis event’i tüketir.
3. Identity’ye iç sorgu atar: `GET /api/v1/internal/webhooks?event=order.updated&customerId=…` (`INTERNAL_API_KEY`).
4. Her hook’a HTTPS POST gönderir: gövde JSON, başlıklar `X-Element-Event: order.updated` ve `X-Element-Signature` (HMAC-SHA256, hook secret).
5. İlk POST başarısızsa ~10 sn sonra bir kez daha dener.

Yalnız https:// adresleri kabul edilir; private/SSRF host’lar bilinçli olarak reddedilir. HTTP veya `user:pass@` içeren URL kabul edilmez.

Canlı fiyat, SignalR ve ELK kaldırıldı. İstemci kendi siparişini API anahtarıyla `GET /orders/{id}` üzerinden sorar.

## Ne yapmaz?

Sipariş oluşturmaz. KREDI veya stok bilmez. E-posta göndermez (e-posta identity’nin mailer’ının işi; çoğu kurulumda SMTP boş olduğundan kapalı). Gateway üzerinden HTTP API sunmaz.

## Kimle konuşur?

```
order  --UpdateOrderStatusEvent-->  notification
notification  --iç HTTP-->  identity (webhook listesi)
notification  --HTTPS POST-->  senin sunucun
```

Webhook’lar identity API’sinden kaydedilir (`/api/v1/webhooks/**`, JWT). notification yalnız bu listedeki adreslere yazar.

## Nasıl açılır?

Tam platformla birlikte açılır:

```powershell
./deploy/scripts/present-platform.ps1
```

Yalnız bu servis (Rabbit ve identity ayaktayken):

```powershell
docker compose --env-file docker/.env up -d --build notification-service
```

Host’ta:

```powershell
dotnet run --project notification-service/Element.Services.Notification.API/Element.Services.Notification.API.csproj
```

Gerekli ortam değişkenleri: `IdentityServiceInternalUrl` (Compose’ta identity’nin DNS adı) ve `INTERNAL_API_KEY` (identity’dekiyle aynı değer).

## Sağlık

`/info`, `/health`, `/health/live` ve `/health/ready` uçları var; `/health/ready` Rabbit’in hazır olup olmadığını gösterir. Örnek: `curl http://localhost:5006/health/ready`

`/metrics` ve `/health-ui` 404 döner; observability yığını yok.

## Webhook’u denemek

1. Hesap aç, JWT al.
2. Identity’de webhook kaydet (event `order.updated`, https URL ve secret).
3. Mağazadan sipariş ver; saga ilerledikçe POST gelmeli.
4. İmzayı doğrula: gövde byte’ları ve hook secret ile HMAC-SHA256 hex hesapla, `X-Element-Signature` ile sabit zamanlı karşılaştır. Gövdedeki `Timestamp` (unix saniye) imzaya dahildir; 5 dakikadan eskiyse isteği reddet (replay koruması).

Bir olay müşterinin en çok 10 hook’una paralel gider. Her hook için 4 sn zaman aşımı vardır; başarısız olursa 10 sn sonra bir deneme daha yapılır. Yönlendirmeler izlenmez, cevap gövdesi okunmaz. Özel, loopback, link-local, CGNAT ve NAT64 adresleri bağlantı anında, DNS’ten çözülen IP üzerinde engellenir.

Yerelde `https://localhost` çoğu zaman SSRF/private engeline takılır; gerçek bir dış HTTPS adresi veya tünel kullan.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Ticker / piyasa donuk | Sorun bu serviste değil; market anketine veya catalog’a bak |
| Webhook hiç gelmiyor | Identity’de kayıt yok, event adı yanlış veya identity iç ucu 401 dönüyor (`INTERNAL_API_KEY`) |
| POST reddediliyor | HTTP URL, private IP veya imza uyuşmazlığı |
| Sipariş Completed, hook yok | Bu worker veya Rabbit endpoint’i `notification-order-updates` |
| `notification-order-updates_error` kuyruğunda mesaj | Identity iç ucu ~2 dk boyunca cevap vermedi (kapalı / 401 / 5xx). Sebep düzelince mesajı Rabbit UI’dan ana kuyruğa geri taşı |
| Konteyner unhealthy | Rabbit yok; `/health/ready` ile kontrol et |

Webhook fanout’unun birim testi `deploy/tests/Element.Services.UnitTests` içinde.

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md) · [Identity](../identity-service/README.md)
