# shared-lib

Paylaşılan .NET 9 kütüphanesi — çalışan servis değildir.

---

## Modüller

| Modül | İçerik |
|-------|--------|
| `Events/` | Entegrasyon event kayıtları |
| `Extensions/LoggingExtensions` | Serilog JSON konsol log |
| `Extensions/ServiceOpsExtensions` | **`/info`, `/health/live`, `/health/ready`** |
| `Health/` | HealthChecks.UI JSON writer, RabbitMQ check |
| `Middleware/` | Global exception handling |
| `Messaging/` | `ConfigureRabbitMqHost` |
| `Science/` | Bilimsel katalog yardımcıları |

---

## Standart ops convention

Tüm .NET servislerde:

```csharp
app.MapStandardOpsEndpoints("Element.MyService", new Dictionary<string, string>
{
    ["api"] = "/api/v1"
});
```

Bu şunları map eder:

- `GET /info` — name, version, environment, links
- `GET /health/live` — liveness (bağımlılık yok)
- `GET /health/ready` — tüm health check'ler
- `GET /health` — ready alias

Health check'leri **önce** `AddHealthChecks()` ile kaydedin.

---

## Polyglot sözleşme

Node ve Java aynı envelope kullanır:

- Namespace: `Element.Shared.Events:{MessageName}`
- Detay: [contracts/README.md](../contracts/README.md)

---

## Kullanan servisler

gateway, identity, catalog, shipment, notification

---

## Derleme

```bash
dotnet build shared-lib/Element.Shared.csproj
```

Diğer projeler `ProjectReference` ile bağlanır.

---

[← Ana README](../README.md)
