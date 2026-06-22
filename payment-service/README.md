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
- Başarı → `PaymentProcessedEvent`
- Hata → `PaymentFailedEvent` (limit, banka red simülasyonu)

Kalıcı veritabanı yok.

---

## Endpoint'ler

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/info` | Servis metadata |
| GET | `/health` | HealthChecks.UI format (RabbitMQ) |
| GET | `/actuator/health/liveness` | Kubernetes liveness |
| GET | `/actuator/health/readiness` | Kubernetes readiness |
| GET | `/actuator/prometheus` | Prometheus metrikleri |
| GET | `/actuator/info` | Spring info (version) |

---

## İş kuralları

| Kural | Sonuç |
|-------|-------|
| Tutar > 50.000 USD | Red |
| Rastgele banka red | `PAYMENT_DETERMINISTIC=true` ile sabit |

---

## Bağımlılıklar

| Kaynak | Açıklama |
|--------|----------|
| RabbitMQ | Komut + event fanout |

---

## Çalıştırma

```bash
cd payment-service && docker compose up -d --build
mvn spring-boot:run
```

Docker healthcheck: `GET /health`

---

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `RABBITMQ_HOST` | RabbitMQ host |
| `PAYMENT_DETERMINISTIC` | Test modu |
| `LOGSTASH_TCP_HOST` | Log shipping |

---

[← Ana README](../README.md)
