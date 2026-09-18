# Kargo (`shipment-service`)

Sahte sevkiyat: sipariş ödendikten sonra bir takip numarası basar ve kaydı tutar. Kamyon yok, kargo firması yok.

> Kapı genel listeyi açmaz. Takip sorgusu anahtar ister. Worker kuyruktan beslenir.

| | |
|--|--|
| **Port** | `5004` |
| **Teknoloji** | .NET 10 |
| **Veri** | Postgres `element_shipment_db` · RabbitMQ |

---

## Bu kutu ne yapar?

`ShipmentRequestedEvent` gelince kayıt açar, numara üretir, `ShipmentDispatchedEvent` yayınlar — saga tamamlanır.

REST (doğrudan `:5004` veya kapıdaki track):

- sipariş id, takip no, durum, serbest metin ile ara,
- UUID ile tek kayıt,
- `GET /api/v1/shipments/track/{numara}`.

## Ne yapmaz?

Adrese mal göndermez. Ödeme almaz. Bildirim hub’ı değildir (onu notification yapar).

## Nasıl açılır?

```powershell
dotnet run --project shipment-service/Element.Services.Shipment.API/Element.Services.Shipment.API.csproj
```

Saga’nın bitmesi için bu kutu + Rabbit şart.

## Sık istekler

```bash
curl "http://localhost:5004/api/v1/shipments?orderId={guid}"
curl http://localhost:5004/api/v1/shipments/track/EM-2024-ABC123
curl "http://localhost:5004/api/v1/shipments?q=AU&status=Dispatched"
```

Kapıdan takip: `GET /api/v1/shipments/track/...` + API anahtarı.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Sipariş ödendi, Completed olmadı | bu worker veya kuyruk |
| Track 401 | kapı anahtar bekliyor |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
