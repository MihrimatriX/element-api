# Stok (`inventory-service`)

inventory-service her elementin gram cinsinden stoğunu tutar. Stok ayırma, ayrılan stoğu serbest bırakma ve kalıcı düşüm burada yapılır.

Catalog ticker’daki `availableStock` yalnız gösterim için duran eski (legacy) bir değer olabilir. Sipariş ön kontrolü ve saga rezervasyonu bu servise bakar.

| | |
|--|--|
| **Port** | `5008` |
| **Teknoloji** | Java 21, Spring Boot 3.4 |
| **Veri** | Postgres `element_inventory_db` · RabbitMQ kuyruğu `inventory-service` |
| **Komşular** | order (HTTP ön kontrol + event) · wallet/desk, ElementSold ile (restock) · gateway (`/stock`) |

Kapıda `GET /api/v1/stock/{symbol}` herkese açıktır. İçeride order bu servisle stok için hem HTTP hem event üzerinden konuşur.

## Bu kutu ne yapar?

Stok sembol bazında tutulur. İlk rezervasyonda sembol yoksa simülasyon için varsayılan 100.000 g ile oluşturulur (seed). Herkese açık `GET` yalnız okur: satır yazmaz, kilit almaz; daha önce görülmemiş bir sembol için varsayılan seed değerini döner.

Sipariş akışındaki adımlar:

1. `OrderSubmitted` gelir, stok rezerve edilir, `StockReserved` (veya `StockReservationFailed`) yayınlanır.
2. İptal veya zaman aşımında `OrderStockRelease` gelir ve rezerv geri alınır.
3. `OrderCompleted` gelince stok kalıcı olarak düşülür.
4. Masadan satışta `ElementSold` gelir ve stok yeniden eklenir (restock).

Fiyat nudge catalog’da kalır; bu servis yalnız stokla ilgilenir.

## Ne yapmaz?

KREDI düşmez (wallet). Sipariş durumu yazmaz (order). Bilimsel element kaydı tutmaz (catalog).

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`.

Yalnız bu servis:

```powershell
docker compose --env-file docker/.env up -d --build inventory-service
```

Host’ta (JDK 21 ve Maven gerekir; Postgres ve Rabbit ayakta olmalı):

```powershell
cd inventory-service
mvn -q package
java -jar target/inventory-service-1.0.0.jar
```

## Sık istekler

```bash
curl http://localhost:5000/api/v1/stock/au
# → { symbol, stockGrams, reservedGrams, availableGrams }
```

Doğrudan: `http://localhost:5008/api/v1/stock/au`.

## Kuyruk

| Gelen | Etki |
|-------|------|
| `OrderSubmittedEvent` | Rezerve et, sonra `StockReserved` / `StockReservationFailed` yayınla |
| `OrderStockReleaseEvent` | Rezervi geri al |
| `OrderCompletedEvent` | Kalıcı düşüm |
| `ElementSoldEvent` | Restock (desk sell) |

## Sağlık

`/info` ve `/health` uçları, ayrıca Spring’in `/actuator/health` ucu. Docker healthcheck `wget /health` kullanır.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Sipariş stokta takılı | Bu worker veya Rabbit; catalog’daki eski stok consumer’ı artık kayıtlı değil |
| Ön kontrol OK, saga fail | İki istek arasında stok değişti; yeniden dene |
| `availableGrams` 0 | Seed yok veya tamamlanmış siparişler stoğu tüketmiş |
| Olay hiç işlenmedi | 5 denemede (≈15 sn backoff) işlenemeyen mesaj `inventory-service_failed` kuyruğuna düşer; Rabbit UI’dan bak veya geri taşı |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
