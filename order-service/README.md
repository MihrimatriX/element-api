# Sipariş (`order-service`)

order-service sanal ticaretteki sipariş saga’sını yönetir: siparişi kaydeder, event’leri yollar ve sipariş durumunu ilerletir. KREDI defteri ve stok bu serviste tutulmaz.

Örneğin 10.000 KREDI ile altın alınırken order siparişi açar, inventory stok ayırır, wallet KREDI’yi çeker, shipment takip numarası üretir.

| | |
|--|--|
| **Port** | `5003` |
| **Teknoloji** | Node.js 22, TypeScript, Express |
| **Veri** | Postgres `element_order_db` (sipariş, saga, outbox) · Redis · RabbitMQ |
| **Komşular** | inventory · wallet (`PaymentRequested`) · shipment · catalog (fiyat) · notification (durum event’i) |

Kapıdaki adres `http://localhost:5000/api/v1/orders`; API anahtarı (`X-API-Key`) ister. Gateway kullanıcıyı `X-User-Id` başlığıyla ekler.

Cüzdan, holdings ve desk sell wallet-service’tedir (`/api/v1/me/**`, `/desk/**`). Stok sorgusu inventory’dedir (`/api/v1/stock/**`).

## Bu kutu ne yapar?

- Alış: `POST /orders`. Fiyat olarak catalog’daki ask kullanılır; stok ön kontrolü inventory’de, bakiye ön kontrolü wallet’ta yapılır.
- Bakiye yetmezse 402 döner (kablodaki reason `INSUFFICIENT_ELX`; değer KREDI’dir).
- Saga sırası: `StockReserved`, `PaymentRequested`, `PaymentProcessed`, `ShipmentRequested`, `Completed` (ardından `AssetsCredited` ve `OrderCompleted`).
- Outbox: mesajlar önce Postgres’e yazılır, dispatcher onları RabbitMQ’ya yayınlar.
- Zaman aşımı veya hata durumunda `OrderStockRelease` ve `PaymentRefundRequested` yayınlanır.

Ekranda para birimi KREDI’dir. Kablodaki `balanceElx` gibi adlar bilinçli olarak eski haliyle bırakıldı; kural kök README’deki sözleşmede.

Ayrı bir payment JVM yok; 50.000 KREDI tavanı wallet tarafında uygulanır.

## Ne yapmaz?

Gerçek tahsilat yapmaz. Ledger ve holdings tutmaz (wallet). Stok ayırmaz (inventory). Katalog fiyatını kendisi belirlemez. Bildirim webhook’u göndermez (notification).

## Kimle konuşur? (saga)

```
POST /orders → inventory reserve → PaymentRequested → wallet
           → ShipmentRequested → shipment → Completed
           → inventory fulfill + AssetsCredited + catalog nudge
           → UpdateOrderStatus → notification (webhook)
```

## Nasıl açılır?

Tercih edilen yol tam platform: `./deploy/scripts/present-platform.ps1`.

Yalnız bu servis: `docker compose --env-file docker/.env up -d --build order-service`

Host’ta:

```powershell
cd order-service
npm ci
npm run build
npm start
```

Gerekenler: Postgres `element_order_db`, RabbitMQ; ayrıca wallet, inventory, catalog ve shipment ayakta olmalı.

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

Gram cinsinden `quantity` en fazla dört ondalık alır. Aynı `Idempotency-Key` ve aynı gövdeyle tekrar gelen istek yalnız bir kez ücretlendirilir; içerik farklıysa `409` döner.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| 402 | Wallet bakiyesi yetmiyor |
| Stokta takılı | inventory worker’ı veya Rabbit |
| Ödendi, Completed değil | shipment veya kuyruk |
| Çift düşüm şüphesi | Outbox ve idempotency bunu önler; `test-saga.ps1` bu durumu sınar |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
