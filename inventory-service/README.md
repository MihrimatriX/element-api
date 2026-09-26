# Stok (`inventory-service`)

Gram cinsinden “rafta ne kadar kaldı?” sorusunun cevabı. Ayırma, serbest bırakma, kalıcı düşüm burada.

> Catalog ticker’daki `availableStock` gösterim/legacy olabilir. Sipariş ön-kontrolü ve saga rezervasyonu **bu kutuya** bakar.

| | |
|--|--|
| **Port** | `5008` |
| **Teknoloji** | Java 21, Spring Boot 3.4 |
| **Veri** | Postgres `element_inventory_db` · RabbitMQ kuyruğu `inventory-service` |
| **Komşular** | order (HTTP ön-kontrol + event) · wallet/desk → ElementSold (restock) · gateway (`/stock`) |

Kapı: `GET /api/v1/stock/{symbol}` herkese açık. İçerde order, stok için HTTP + event konuşur.

---

## Bu kutu ne yapar?

Sembol bazlı stok tutar. İlk dokunuşta sembol yoksa simülasyon için varsayılan **100.000 g** seed eder.

Sipariş gelince şöyle akar:

1. `OrderSubmitted` → rezerve et → `StockReserved` (veya `StockReservationFailed`)
2. İptal / timeout → `OrderStockRelease` → rezervi geri al
3. `OrderCompleted` → kalıcı düşüm
4. Masadan satış → `ElementSold` → restock

Fiyat nudge catalog’da kalır; stok işi buradadır.

## Ne yapmaz?

KREDI düşmez (wallet). Sipariş durumu yazmaz (order). Bilimsel element kaydı tutmaz (catalog).

## Nasıl açılır?

Tam platform: `./deploy/scripts/present-platform.ps1`.

Tek servis:

```powershell
docker compose --env-file docker/.env up -d --build inventory-service
```

Host (JDK 21 + Maven, Postgres + Rabbit şart):

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
| `OrderSubmittedEvent` | Rezerve → `StockReserved` / `StockReservationFailed` |
| `OrderStockReleaseEvent` | Rezervi geri al |
| `OrderCompletedEvent` | Kalıcı düşüm |
| `ElementSoldEvent` | Restock (desk sell) |

## Sağlık

`/info`, `/health` ailesi + Spring `/actuator/health`. Docker `wget /health` kullanır.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Sipariş stokta takılı | Bu worker veya Rabbit; catalog eski stok consumer’ı artık kayıtlı değil |
| Ön-kontrol OK, saga fail | İki istek arası stok değişti; yeniden dene |
| `availableGrams` 0 | Seed yok veya tamamlanmış siparişler eritmiş |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
