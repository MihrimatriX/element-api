# Ödeme işçisi (`payment-service`)

Kuyruktan “bu siparişi tahsil et” gelir. Kendi kasası yoktur; order’a “cüzdanından KREDI çek” der.

> Dışarıdan kart numarası, Iyzico, Stripe yok. Kapı bu kutuya yol vermez.

| | |
|--|--|
| **Port** | `5005` (sağlık için) |
| **Teknoloji** | Java 21, Spring Boot 3.4 |
| **Veritabanı** | Yok |

---

## Bu kutu ne yapar?

`ProcessPaymentCommand` dinler (`payment-processing` kuyruğu).

1. Tutar **50 000 KREDI** üstündeyse reddeder.
2. `POST {order}/internal/wallet/debit` — aynı `order_id` iki kez çekilmez.
3. Olursa `PaymentProcessedEvent`; yetmezse `PaymentFailedEvent`.

Ekranda KREDI. Fail reason kabloda hâlâ `INSUFFICIENT_ELX`.

## Ne yapmaz?

Kullanıcıya REST “öde” ucu sunmaz. Bakiyeyi kendi tablosunda tutmaz. Logstash / Prometheus actuator yok.

## Nasıl açılır?

Tam platform ile. Host:

```powershell
# kök script payment’ı da açar
./deploy/scripts/start-local.ps1 -IncludePayment
# veya
cd payment-service
mvn spring-boot:run
```

Java/Maven host’ta yoksa testler `test-all.ps1 -PaymentDocker` ile konteynerde koşar.

Eski `target/` artığı kafa karıştırırsa `mvn clean`.

## Sağlık

| Yol | Anlamı |
|-----|--------|
| `GET /health` | Compose healthcheck; Rabbit |
| `/actuator/health/liveness` | süreç |
| `/actuator/health/readiness` | hazır |
| `/info` veya `/actuator/info` | ad/sürüm |

## Ortam

| Değişken | Ne işe yarar |
|----------|----------------|
| `RABBITMQ_HOST` | kuyruk |
| `ORDER_SERVICE_URL` | debit/credit |
| `INTERNAL_API_KEY` | order iç kapısı |

## Bozulursa

| Belirti | Muhtemel neden |
|---------|----------------|
| Sipariş stok ayrıldı, para çekilmedi | bu kutu veya Rabbit |
| 401 debit | anahtar order ile aynı değil |
| Tavan reddi | 50 000 KREDI kuralı |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
