# Sipariş (`order-service`)

Sanal ticaretin **saga yönetmeni**: emri yazar, event yollar, durumu ilerletir. KREDI defteri ve stok **bu kutuda değil**.

> “10.000 KREDI ile altın al” → order emri verir; **inventory** stok ayırır, **wallet** KREDI çeker, **shipment** takip basar.

| | |
|--|--|
| **Port** | `5003` |
| **Teknoloji** | Node.js 22, TypeScript, Express |
| **Veri** | Postgres `element_order_db` (sipariş, saga, outbox) · Redis · RabbitMQ |
| **Komşular** | inventory · wallet (`PaymentRequested`) · shipment · catalog (fiyat) · notification (durum event) |

Kapı: `http://localhost:5000/api/v1/orders` — **API anahtarı** (`X-API-Key`). Gateway kullanıcıyı `X-User-Id` ile ekler.

Cüzdan / holdings / desk sell → **wallet-service** (`/api/v1/me/**`, `/desk/**`). Stok sorgu → **inventory** (`/api/v1/stock/**`).

---

## Bu kutu ne yapar?

- Alış: `POST /orders` — fiyat **ask** (catalog), stok ön-kontrolü **inventory**, bakiye ön-kontrolü **wallet**.
- Bakiye yetmezse **402** (reason kabloda `INSUFFICIENT_ELX`; değer KREDI).
- Saga: `StockReserved` → `PaymentRequested` → `PaymentProcessed` → `ShipmentRequested` → `Completed` (+ `AssetsCredited` + `OrderCompleted`).
- Outbox: mesajlar Postgres’te; dispatcher RabbitMQ’ya basar.
- Timeout / fail: `OrderStockRelease` + `PaymentRefundRequested`.

Ekranda para **KREDI**. Kablodaki `balanceElx` vb. bilinçli eski isimlerdir — kök README sözleşmesi.

Ayrı payment JVM yok; tavan **50.000 KREDI** wallet tarafında.

## Ne yapmaz?

Gerçek tahsilat yok. Ledger/holdings tutmaz (wallet). Stok ayırmaz (inventory). Katalog fiyatını uydurmaz. Bildirim webhook’u atmaz (notification).

## Kimle konuşur? (saga)

```
POST /orders → inventory reserve → PaymentRequested → wallet
           → ShipmentRequested → shipment → Completed
           → inventory fulfill + AssetsCredited + catalog nudge
           → UpdateOrderStatus → notification (webhook)
```

## Nasıl açılır?

Tam platform tercih: `./deploy/scripts/present-platform.ps1`.

Tek servis: `docker compose --env-file docker/.env up -d --build order-service`

Host:

```powershell
cd order-service
npm ci
npm run build
npm start
```

Gerekli: Postgres `element_order_db`, RabbitMQ, ayakta **wallet** + **inventory** + catalog + shipment.

## Kontroller

```powershell
npm run check
# DATABASE_URL=... npm run  # saga.integration.check.ts (yerel Postgres)
```

## Sık uçlar

| Ne | İstek |
|----|--------|
| Sipariş ver | `POST /api/v1/orders` + `X-API-Key` + `Idempotency-Key` |
| Liste / durum | `GET /api/v1/orders` · `GET /api/v1/orders/{id}` |

Gram `quantity` en fazla dört ondalık. Aynı `Idempotency-Key` + aynı gövde → tek ücret; farklı içerik → `409`.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| 402 | Wallet bakiyesi yetmiyor |
| Stokta takılı | inventory worker / Rabbit |
| Ödendi, Completed değil | shipment veya kuyruk |
| Çift düşüm korkusu | Outbox + idempotency; `test-saga.ps1` bunu tarar |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
