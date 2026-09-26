# Kargo (`shipment-service`)

Sahte sevkiyat: sipariş ödendikten sonra bir takip numarası basar ve kaydı tutar. Kamyon yok, kargo firması yok.

> Kapı genel listeyi açmaz. Takip sorgusu anahtar ister. Worker kuyruktan beslenir; saga’nın “Completed” olması için bu kutu şart.

| | |
|--|--|
| **Port** | `5004` |
| **Teknoloji** | .NET 10, MassTransit |
| **Veri** | Postgres `element_shipment_db` · RabbitMQ |
| **Komşular** | order (ShipmentRequested → Dispatched) · gateway (track, API anahtarı) |

---

## Bu kutu ne yapar?

1. Order, ödeme OK olunca `ShipmentRequestedEvent` basar.
2. Bu worker kayıt açar, takip numarası üretir (`EM-…` tarzı).
3. `ShipmentDispatchedEvent` yayınlar → order saga **Completed**’a gider.
4. Sonra inventory kalıcı düşüm + wallet holdings + catalog fiyat nudge ayrı event’lerle yürür.

REST (doğrudan `:5004` veya kapıdaki track):

- sipariş id, takip no, durum, serbest metin ile ara,
- UUID ile tek kayıt,
- `GET /api/v1/shipments/track/{numara}`.

## Ne yapmaz?

Adrese mal göndermez. Ödeme almaz (wallet). Bildirim hub’ı değildir (onu notification yapar). Stok düşmez (inventory).

## Kimle konuşur?

```
order --ShipmentRequested--> shipment --ShipmentDispatched--> order
istemci --API key--> gateway --> GET …/shipments/track/{no}
```

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`.

Tek servis:

```powershell
docker compose --env-file docker/.env up -d --build shipment-service
```

Host (Postgres + Rabbit ayaktayken):

```powershell
dotnet run --project shipment-service/Element.Services.Shipment.API/Element.Services.Shipment.API.csproj
```

## Sık istekler

```bash
curl "http://localhost:5004/api/v1/shipments?orderId={guid}"
curl http://localhost:5004/api/v1/shipments/track/EM-2024-ABC123
curl "http://localhost:5004/api/v1/shipments?q=AU&status=Dispatched"
```

Kapıdan takip: `GET /api/v1/shipments/track/...` + `X-API-Key`.

Sağlık: `/info`, `/health/live`, `/health/ready`.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Sipariş ödendi, Completed olmadı | Bu worker veya Rabbit; `ShipmentRequested` tüketilmiyor |
| Track 401 | Kapı anahtar bekliyor |
| Track 404 | Numara yanlış veya shipment kaydı hiç açılmadı |
| DB migrate hatası | `element_shipment_db` init / connection string |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md) · [Order](../order-service/README.md)
