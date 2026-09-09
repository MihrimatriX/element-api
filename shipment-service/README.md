# shipment-service

Kargo / sevkiyat mikroservisi — saga worker + sevkiyat sorgu API (.NET 9).

| | |
|--|--|
| **Port** | `5004` |
| **Discovery** | `GET /info` |
| **Info** | `GET /info` |

Gateway'den proxy edilmez — doğrudan `:5004` veya internal DNS.

---

## Sorumluluklar

- `ShipmentRequestedEvent` tüketir → sevkiyat kaydı + takip numarası
- `ShipmentDispatchedEvent` yayınlayarak saga'yı tamamlar
- REST ile sevkiyat **arama ve takip** (orderId, tracking, status, q)

---

## API endpoint'leri

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/v1/shipments` | **Arama** — `orderId`, `tracking`, `status`, `q`, `page`, `pageSize` |
| GET | `/api/v1/shipments/{id}` | UUID ile sevkiyat |
| GET | `/api/v1/shipments/track/{trackingNumber}` | Takip numarası ile sorgu |

### Ops

| Path | Açıklama |
|------|----------|
| `/info` | Servis metadata + linkler |
| `/health`, `/health/live`, `/health/ready` | PostgreSQL + RabbitMQ |

---

## Arama örnekleri

```bash
# Siparişe göre
curl "http://localhost:5004/api/v1/shipments?orderId={guid}"

# Takip numarası
curl "http://localhost:5004/api/v1/shipments/track/EM-2024-ABC123"

# Serbest metin (tracking, sembol, müşteri, order id)
curl "http://localhost:5004/api/v1/shipments?q=AU&status=Dispatched"
```

---

## Bağımlılıklar

| Kaynak | Açıklama |
|--------|----------|
| PostgreSQL `element_shipment_db` | Shipments tablosu |
| RabbitMQ | Event tüketim / yayın |

---

## Çalıştırma

```bash
# Host (tercih)
dotnet run --project Element.Services.Shipment.API/Element.Services.Shipment.API.csproj
```

---

[← Ana README](../README.md)
