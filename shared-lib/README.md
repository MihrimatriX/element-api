# Ortak kutu (`shared-lib`)

Çalışan bir servis değil. .NET projelerinin paylaştığı kod.

> “Sağlık ucu her kutuda aynı dursun, kuyruk zarfı Node/Java ile uyuşsun” diye burası var.

| | |
|--|--|
| **Çıktı** | `Element.Shared` kütüphanesi |
| **Teknoloji** | .NET 10 |

Kullananlar: gateway, identity, catalog, compound, shipment, notification. Order (Node) ve payment (Java) yalnız **olay isimlerini** taklit eder, bu DLL’i yüklemez.

---

## İçinde ne var?

| Klasör | Düz dil |
|--------|---------|
| `Events/` | Sipariş/stok/ödeme olay tipleri. Kaynak gerçek. URN: `Element.Shared.Events:İsim` — isim değiştirmek migrasyon ister. |
| `Extensions/ServiceOpsExtensions` | `/info`, `/health/live`, `/health/ready` |
| `Health/` | Kısa `/health` JSON, Rabbit kontrolü |
| `Messaging/` | `ConfigureRabbitMqHost` |
| `Science/` | v2 `fields` / ETag yardımcısı (catalog + compound + science host) |
| `Middleware/` | genel hata |
| `Extensions/LoggingExtensions` | JSON konsol log |

## Sağlık ucunu takmak

```csharp
app.MapStandardOpsEndpoints("Element.MyService", new Dictionary<string, string>
{
    ["api"] = "/api/v1"
});
```

Önce `AddHealthChecks()` kaydet. Canlılık bağımlılık sormaz; hazırlık DB/kuyruk sorar.

## Derleme

```powershell
dotnet build shared-lib/Element.Shared.csproj
```

Başka proje `ProjectReference` ile bağlar. NuGet paketi yayınlanmaz.

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md)
