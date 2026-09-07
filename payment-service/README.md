# payment-service

Ödeme saga worker — RabbitMQ komut tüketicisi (Java 21 + Spring Boot 3.4).

| | |
|--|--|
| **Port** | `5005` |
| **Info** | `GET /info` veya `/actuator/info` |

Gateway'den proxy edilmez — yalnızca mesaj tabanlı iş mantığı.

---

## Sorumluluklar

- `ProcessPaymentCommand` kuyruğunu dinler (`payment-processing`)
- Order-service `POST /internal/wallet/debit` ile Kredi çeker
- Başarı → `PaymentProcessedEvent`
- Yetersiz bakiye → `PaymentFailedEvent` (legacy reason `INSUFFICIENT_ELX`; değerler KREDI — kök README)
- Tek sipariş tavanı **50_000 KREDI**

Kalıcı veritabanı yok.

---

## Endpoint'ler

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/info` | Servis metadata |
| GET | `/health` | Readiness JSON (RabbitMQ) |
| GET | `/actuator/health/liveness` | Liveness |
| GET | `/actuator/health/readiness` | Readiness |
| GET | `/actuator/info` | Spring info (version) |

Actuator yalnız `health` + `info` expose eder. Prometheus `/actuator/prometheus` ve Logstash **yok** (infra sadeleştirme).

---

## İş kuralları

| Kural | Sonuç |
|-------|-------|
| Tutar > 50.000 KREDI | Red |
| Cüzdan yetersiz | `INSUFFICIENT_ELX` (legacy reason; KREDI bakiyesi) |

---

## Bağımlılıklar

| Kaynak | Açıklama |
|--------|----------|
| RabbitMQ | Komut + event fanout |
| order-service | Wallet debit/credit |

---

## Çalıştırma

```bash
# Host (tercih) — kök start-local -IncludePayment
mvn spring-boot:run

# İsteğe bağlı
cd payment-service && docker compose up -d --build
```

Docker healthcheck: `GET /health`. Eski `target/` Logstash XML içeriyorsa clean rebuild gerekir.

---

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `RABBITMQ_HOST` | RabbitMQ host |
| `ORDER_SERVICE_URL` | order-service (wallet debit) |
| `INTERNAL_API_KEY` | Internal debit header |

---

[← Ana README](../README.md)
