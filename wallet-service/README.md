# Cüzdan (`wallet-service`)

Kâğıt KREDI’nin evi. Bakiye, defter, holdings, masadan satış — hepsi burada.

> Sipariş “para çek” demez; `PaymentRequested` yollar. Bu kutu düşer veya reddeder. Gerçek banka yok; tavan **50.000 KREDI**.

| | |
|--|--|
| **Port** | `5005` |
| **Teknoloji** | Java 21, Spring Boot 3.4 |
| **Veri** | Postgres `element_wallet_db` · RabbitMQ kuyruğu `wallet-service` |
| **Komşular** | order (`PaymentRequested` / refund) · inventory + catalog (`ElementSold` desk) · gateway (`/me`, `/desk`) |

Kapı üzerinden: `/api/v1/me/**` ve `/api/v1/desk/**` → buraya (API anahtarı + `X-User-Id`). Doğrudan `:5005` de çalışır; günlük yol gateway’dir.

---

## Bu kutu ne yapar?

Şöyle çalışır: ilk `GET /me/wallet` dokunuşunda hesaba **hoş geldin grant** yazar (`WALLET_WELCOME_GRANT`, yerel varsayılan **10.000**, public compose **1.000**). Sonra alış saga’sı gelince bakiyeden düşer; masa satışı gelince bid ile satıp KREDI yazar ve holdings’e gram ekler.

- **Ledger / bakiye** — kim ne kadar tutuyor.
- **Holdings** — gram + ortalama maliyet (`avgCostElx` kabloda eski isim; değer KREDI).
- **Desk sell** — `POST /desk/sell` → `ElementSoldEvent` (inventory restock + catalog fiyat nudge).

Ekranda para **KREDI**. Kablodaki `balanceElx`, `INSUFFICIENT_ELX` gibi isimler bilinçli eski wire adlarıdır — kök README sözleşmesi.

## Ne yapmaz?

Sipariş kaydı tutmaz (order). Stok ayırmaz (inventory). Fiyat uydurmaz (catalog). Gerçek tahsilat yok.

## Nasıl açılır?

Tam platform tercih: `./deploy/scripts/present-platform.ps1` — wallet konteyneri de gelir.

Tek başına (Postgres + Rabbit ayaktayken):

```powershell
docker compose --env-file docker/.env up -d --build wallet-service
```

Host’ta (JDK 21, Maven 3.9+):

```powershell
cd wallet-service
mvn -q package
java -jar target/wallet-service-1.0.0.jar
```

## Sık uçlar

Hepsi kapıdan da: `http://localhost:5000/...`

| Ne yapmak istiyorsun | İstek |
|----------------------|--------|
| Bakiyem | `GET /api/v1/me/wallet` |
| Kasam (holdings) | `GET /api/v1/me/holdings` |
| Masadan sat | `POST /api/v1/desk/sell` |

Yanıtta `currency: "KREDI"` ile doğrula.

## Kuyruk (gelen → giden)

| Gelen | Ne olur |
|-------|---------|
| `PaymentRequestedEvent` | Debit (tavan 50.000) → `PaymentProcessedEvent` veya `PaymentFailedEvent` |
| `PaymentRefundRequestedEvent` | Alış varsa bir kez iade |
| `AssetsCreditedEvent` | Holdings’e gram yaz |

URN zarfı MassTransit ile aynı: `Element.Shared.Events:*`.

## Sağlık

`/info`, `/health`, `/health/live`, `/health/ready` — diğer kutular gibi. Spring ayrıca `/actuator/health` sunar; Docker healthcheck `/health` kullanır.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Sipariş Submitted kaldı, ödeme yok | Bu worker veya Rabbit; `PaymentRequested` gelmiyor |
| Holdings boş ama sipariş Completed | `AssetsCredited` async — biraz bekle / smoke poll |
| 402 `INSUFFICIENT_ELX` | Bakiye yetmiyor; değer yine KREDI |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
