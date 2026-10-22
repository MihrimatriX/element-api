# Kargo (`shipment-service`)

shipment-service sevkiyatı simüle eder: sipariş ödendikten sonra bir takip numarası üretir ve kaydını tutar. Gerçek kargo firması veya taşıma yoktur.

Kapı genel listeyi dışarı açmaz; takip sorgusu anahtar ister. Worker kuyruktan beslenir ve saga’nın Completed durumuna geçmesi için bu servisin çalışması gerekir.

| | |
|--|--|
| **Port** | `5004` |
| **Teknoloji** | .NET 10, MassTransit |
| **Veri** | Postgres `element_shipment_db` · RabbitMQ |
| **Komşular** | order (ShipmentRequested, Dispatched) · gateway (track, API anahtarı) |

## Bu kutu ne yapar?

1. Ödeme başarılı olunca order `ShipmentRequestedEvent` yayınlar.
2. Bu worker kayıt açar ve takip numarası üretir (`TRK-` + 16 hex, 64 bit rastgele). Her sipariş için tek kayıt olur (`OrderId` unique index); aynı istek iki kez gelirse ilk kaydın sonucu yeniden yayınlanır.
3. `ShipmentDispatchedEvent` yayınlar ve order saga’sı Completed durumuna geçer.
4. Ardından inventory’deki kalıcı düşüm, wallet holdings güncellemesi ve catalog fiyat nudge’ı ayrı event’lerle yürür.

REST uçları (doğrudan `:5004` üzerinden veya kapıdaki track ucuyla):

- sipariş id, takip no, durum veya serbest metinle arama,
- UUID ile tek kayıt,
- `GET /api/v1/shipments/track/{numara}`: yalnız `X-User-Id` kaydın sahibiyse sonuç döner; başkasının numarası bilinmeyen numara gibi 404 alır.

Her uç `INTERNAL_API_KEY` başlığı ister; track isteğinde kapı bu başlığı kendisi ekler. Anahtar gönderilmezse veya serviste tanımlı değilse 401 döner.

## Ne yapmaz?

Adrese mal göndermez. Ödeme almaz (wallet). Bildirim göndermez (o iş notification’ın). Stok düşmez (inventory).

## Kimle konuşur?

```
order --ShipmentRequested--> shipment --ShipmentDispatched--> order
istemci --API key--> gateway --> GET …/shipments/track/{no}
```

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`.

Yalnız bu servis:

```powershell
docker compose --env-file docker/.env up -d --build shipment-service
```

Host’ta (Postgres ve Rabbit ayaktayken):

```powershell
dotnet run --project shipment-service/Element.Services.Shipment.API/Element.Services.Shipment.API.csproj
```

## Sık istekler

```bash
K="INTERNAL_API_KEY: element-internal-dev-key"
curl -H "$K" "http://localhost:5004/api/v1/shipments?orderId={guid}"
curl -H "$K" -H "X-User-Id: {kullanıcı-guid}" http://localhost:5004/api/v1/shipments/track/TRK-0123456789ABCDEF
curl -H "$K" "http://localhost:5004/api/v1/shipments?q=AU&status=Shipped"
```

Kapıdan takip: `GET /api/v1/shipments/track/...` ve `X-API-Key`.

Sağlık: `/info`, `/health/live`, `/health/ready`.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Sipariş ödendi, Completed olmadı | Bu worker veya Rabbit; `ShipmentRequested` tüketilmiyor |
| Track 401 | Kapı anahtar bekliyor ya da kapıdaki ve bu servisteki `INTERNAL_API_KEY` değerleri farklı / burada tanımsız |
| Track 404 | Numara yanlış, kayıt hiç açılmadı ya da numara başka müşterinin |
| DB migrate hatası | `element_shipment_db` init / connection string |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md) · [Order](../order-service/README.md)
