# Cüzdan (`wallet-service`)

wallet-service kâğıt KREDI’yi yönetir: bakiye, defter (ledger), holdings ve masadan satış (desk sell) burada.

Order doğrudan para çekmez; `PaymentRequested` event’i yollar. Wallet tutarı bakiyeden düşer ya da isteği reddeder. Gerçek banka yok; tavan 50.000 KREDI.

| | |
|--|--|
| **Port** | `5005` |
| **Teknoloji** | Java 21, Spring Boot 3.4 |
| **Veri** | Postgres `element_wallet_db` · RabbitMQ kuyruğu `wallet-service` |
| **Komşular** | order (`PaymentRequested` / refund) · inventory + catalog (`ElementSold` desk) · gateway (`/me`, `/desk`) |

Kapıdaki `/api/v1/me/**` ve `/api/v1/desk/**` istekleri buraya gelir (API anahtarı ve `X-User-Id` ile). Doğrudan `:5005` de çalışır, ama normal kullanımda istekler gateway’den geçer.

## Bu kutu ne yapar?

Hesap ilk kez `GET /me/wallet` çağırdığında hoş geldin grant’i yazılır (`WALLET_WELCOME_GRANT`; yerel varsayılan 10.000, public compose 1.000). Alış saga’sı geldiğinde tutar bakiyeden düşülür. Masadan satışta element bid fiyatından satılır, KREDI yazılır ve holdings’e gram eklenir.

- Ledger ve bakiye: kimde ne kadar olduğu.
- Holdings: gram ve ortalama maliyet (`avgCostElx` kablodaki eski isimdir; değer KREDI).
- Desk sell: `POST /desk/sell`, `ElementSoldEvent` yayınlar (inventory restock + catalog fiyat nudge).

Ekranda para birimi KREDI’dir. Kablodaki `balanceElx`, `INSUFFICIENT_ELX` gibi adlar bilinçli olarak eski wire adlarıyla bırakıldı; kural kök README’deki sözleşmede.

## Ne yapmaz?

Sipariş kaydı tutmaz (order). Stok ayırmaz (inventory). Fiyatı kendisi belirlemez (catalog). Gerçek tahsilat yapmaz.

## Nasıl açılır?

Tercih edilen yol tam platform: `./deploy/scripts/present-platform.ps1`; wallet konteyneri de bununla açılır.

Yalnız bu servis (Postgres ve Rabbit ayaktayken):

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

Hepsi kapıdan da çağrılabilir: `http://localhost:5000/...`

| Ne yapmak istiyorsun | İstek |
|----------------------|--------|
| Bakiyem | `GET /api/v1/me/wallet` |
| Kasam (holdings) | `GET /api/v1/me/holdings` |
| Masadan sat | `POST /api/v1/desk/sell` |

Para birimini yanıttaki `currency: "KREDI"` alanından doğrula.

## Kuyruk (gelen → giden)

| Gelen | Ne olur |
|-------|---------|
| `PaymentRequestedEvent` | Debit (tavan 50.000), ardından `PaymentProcessedEvent` veya `PaymentFailedEvent` |
| `PaymentRefundRequestedEvent` | Alış varsa bir kez iade |
| `AssetsCreditedEvent` | Holdings’e gram yaz |

Mesaj URN zarfı MassTransit’inkiyle aynıdır: `Element.Shared.Events:*`.

## Sağlık

Diğer servislerdeki gibi `/info`, `/health`, `/health/live`, `/health/ready`. Spring ayrıca `/actuator/health` sunar; Docker healthcheck `/health` kullanır.

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Sipariş Submitted kaldı, ödeme yok | Bu worker veya Rabbit; `PaymentRequested` gelmiyor |
| Holdings boş ama sipariş Completed | `AssetsCredited` asenkron işlenir; biraz bekle veya smoke poll kullan |
| 402 `INSUFFICIENT_ELX` | Bakiye yetmiyor; değer yine KREDI |
| Olay hiç işlenmedi | 5 denemede (≈15 sn backoff) işlenemeyen mesaj `wallet-service_failed` kuyruğuna düşer; Rabbit UI’dan bak veya geri taşı |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
