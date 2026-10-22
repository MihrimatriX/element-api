# Ortak kutu (`shared-lib`)

shared-lib çalışan bir servis değil, .NET projelerinin paylaştığı bir kütüphanedir. NuGet’e yayımlanmaz; projeler onu `ProjectReference` ile bağlar.

Amacı, sağlık uçlarının her serviste aynı olmasını ve kuyruk mesaj zarfının Node/Java tarafıyla uyuşmasını sağlamak.

| | |
|--|--|
| **Çıktı** | `Element.Shared` kütüphanesi |
| **Teknoloji** | .NET 10 |
| **Port** | Yok; process açmaz |

Kütüphaneyi kullanan .NET servisleri: gateway, identity, catalog, compound, shipment, notification. Order (Node) ve wallet/inventory (Java) bu DLL’i yüklemez; yalnız olay isimlerini ve URN’yi aynen kullanır. URN her yerde aynıdır: `Element.Shared.Events:*`.

## İçinde ne var?

| Klasör | Düz dil |
|--------|---------|
| `Events/` | Sipariş, stok ve ödeme olay tipleri. Olay tanımlarının asıl kaynağı burasıdır; bir ismi değiştirmek üç dilde migrasyon ister. |
| `Extensions/ServiceOpsExtensions` | `/info`, `/health/live`, `/health/ready` |
| `Health/` | Kısa `/health` JSON |
| `Extensions/RabbitMqExtensions` | `ConfigureRabbitMqHost` (MassTransit 8.3.4) |
| `Science/` | v2 `fields` / ETag yardımcısı (catalog + compound + science host) |
| `Middleware/` | genel hata yakalama |
| `Extensions/LoggingExtensions` | JSON konsol log |

## Sağlık ucunu takmak

```csharp
app.MapStandardOpsEndpoints("Element.MyService", new Dictionary<string, string>
{
    ["api"] = "/api/v1"
});
```

Önce `AddHealthChecks()` kaydını yap. Liveness ucu bağımlılıkları kontrol etmez; readiness DB ve kuyruğu kontrol eder. `/metrics` ve `/health-ui` bilinçli olarak yok.

## Derleme

```powershell
dotnet build shared-lib/Element.Shared.csproj
```

Diğer projeler kütüphaneyi `ProjectReference` ile bağlar. Tek başına çalıştırılacak bir şey yok; kontrol için yukarıdaki build yeterli.

## Olay sözleşmesi — dikkat

`PaymentRequested`, `StockReserved`, `OrderCompleted`, `AssetsCredited` ve diğer olay tipleri burada tanımlı. Bir tipi değiştirirken şu üç yeri birlikte güncelle:

1. `shared-lib/Events/` (kaynak)
2. order-service TypeScript zarfı / URN
3. wallet-service ve inventory-service Java consumer string’leri

Üçü aynı `Element.Shared.Events:*` namespace’ini kullanmazsa saga hata vermeden durur.

## Bozulursa (dolaylı)

| Belirti | Muhtemel neden |
|---------|----------------|
| Bir .NET servisin health ucu yok | `MapStandardOpsEndpoints` çağrılmamış |
| Node/Java event’i tüketmiyor | URN veya property adı uyuşmuyor |
| Science fields parse bozuldu | `Science/` yardımcısını catalog/compound ile birlikte güncelle |

[← Ana README](../README.md) · [Servis kılavuzu](../docs/SERVIS-KILAVUZU.md) · [Deploy AGENTS](../deploy/AGENTS.md)
