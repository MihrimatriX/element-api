# order-service

Sipariş REST API ve dağıtık saga orkestrasyonu (Node.js 22 + TypeScript + Express).

| | |
|--|--|
| **Port** | `5003` |
| **Discovery** | `GET /api/v1` |
| **Info** | `GET /info` |

Gateway üzerinden erişim: `localhost:5000/api/v1/orders` (API key gerekli).

---

## Sorumluluklar

- Sipariş oluşturma ve durum takibi
- Saga: `Submitted → StockReserved → Payment → Shipping → Completed`
- MassTransit uyumlu RabbitMQ mesajları + transactional outbox
- Müşteri bazlı sipariş **arama ve filtreleme**

---

## API endpoint'leri

| Method | Path | Header | Açıklama |
|--------|------|--------|----------|
| GET | `/api/v1` | — | Keşif linkleri |
| POST | `/api/v1/orders` | `X-User-Id` (gateway) | Sipariş oluştur → 202 |
| GET | `/api/v1/orders` | `X-User-Id` | Müşteri siparişleri |
| GET | `/api/v1/orders/search` | `X-User-Id` | **Filtreli arama** |
| GET | `/api/v1/orders/stats` | `X-User-Id` | İstatistik özeti |
| GET | `/api/v1/orders/{id}` | — | Tek sipariş |

### Arama parametreleri (`/orders/search`)

| Param | Açıklama |
|-------|----------|
| `q` | Sipariş ID veya element sembolünde arama |
| `status` | `Submitted`, `Completed`, … |
| `elementSymbol` | `AU`, `AG`, … |
| `page`, `pageSize` | Sayfalama |

```bash
curl -H "X-User-Id: {customerId}" \
  "http://localhost:5003/api/v1/orders/search?status=Completed&q=au&page=1"
```

### Ops

| Path | Açıklama |
|------|----------|
| `/info` | Servis metadata |
| `/health`, `/health/live`, `/health/ready` | PostgreSQL + RabbitMQ |
| `/metrics` | Prometheus |

---

## Saga mesajları

| Event / Command | Yön |
|-----------------|-----|
| `OrderSubmittedEvent` | → catalog |
| `ProcessPaymentCommand` | → payment |
| `ShipmentRequestedEvent` | → shipment |
| `UpdateOrderStatusEvent` | → notification |

Detay: [contracts/README.md](../contracts/README.md)

---

## Bağımlılıklar

| Kaynak | Açıklama |
|--------|----------|
| PostgreSQL `element_order_db` | orders, saga_state |
| Redis | Katalog fiyat cache |
| RabbitMQ | Saga kuyrukları |
| catalog-service | Canlı fiyat HTTP |

---

## Çalıştırma

```bash
cd order-service && docker compose up -d --build
npm ci && npm run build && npm start
```

Tam saga için kök `docker compose` kullanın.

---

## Ortam değişkenleri

| Değişken | Varsayılan |
|----------|------------|
| `PORT` | `8080` |
| `DATABASE_URL` | PostgreSQL connection |
| `REDIS_URL` | Redis |
| `RABBITMQ_HOST` | RabbitMQ |
| `CATALOG_SERVICE_URL` | `http://catalog-service:8080` |
| `LOGSTASH_HTTP_URL` | Log shipping |

---

[← Ana README](../README.md)
