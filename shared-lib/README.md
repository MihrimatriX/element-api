# Ortak kutu (`shared-lib`)

Çalışan bir servis değil. .NET projelerinin paylaştığı kod. NuGet’e basılmaz; `ProjectReference` ile bağlanır.

> “Sağlık ucu her kutuda aynı dursun, kuyruk zarfı Node/Java ile uyuşsun” diye burası var.

| | |
|--|--|
| **Çıktı** | `Element.Shared` kütüphanesi |
| **Teknoloji** | .NET 10 |
| **Port** | Yok — process açmaz |

**Kullananlar (.NET):** gateway, identity, catalog, compound, shipment, notification.  
**Order (Node)** ve **wallet / inventory (Java)** bu DLL’i yüklemez; yalnız **olay isimlerini / URN’yi** taklit eder. URN aynı kalır: `Element.Shared.Events:*`.

---

## İçinde ne var?

| Klasör | Düz dil |
|--------|---------|
| `Events/` | Sipariş / stok / ödeme olay tipleri. **Kaynak gerçek.** İsim değiştirmek üç dilde migrasyon ister. |
| `Extensions/ServiceOpsExtensions` | `/info`, `/health/live`, `/health/ready` |
| `Health/` | Kısa `/health` JSON, Rabbit kontrolü |
| `Messaging/` | `ConfigureRabbitMqHost` (MassTransit 8.3.4) |
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

Önce `AddHealthChecks()` kaydet. Canlılık bağımlılık sormaz; hazırlık DB/kuyruk sorar. `/metrics` ve `/health-ui` **bilinçli yok**.

## Derleme

```powershell
dotnet build shared-lib/Element.Shared.csproj
```

Başka proje `ProjectReference` ile bağlar. Tek başına “ayağa kalkmaz”; test için yukarıdaki build yeter.

## Olay sözleşmesi — dikkat

`PaymentRequested`, `StockReserved`, `OrderCompleted`, `AssetsCredited` … tipleri burada.  
Değiştirirken:

1. `shared-lib/Events/` (kaynak)
2. order-service TypeScript zarf / URN
3. wallet-service + inventory-service Java consumer string’leri

Üçü aynı `Element.Shared.Events:*` namespace’ini konuşmazsa saga sessizce ölür.

## Bozulursa (dolaylı)

| Belirti | Muhtemel neden |
|---------|----------------|
| Bir .NET servis health ucu yok | `MapStandardOpsEndpoints` unutulmuş |
| Node/Java event yemiyor | URN veya property adı drift |
| Science fields parse bozuldu | `Science/` yardımcısı + catalog/compound birlikte güncelle |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md) · [Deploy AGENTS](../deploy/AGENTS.md)
