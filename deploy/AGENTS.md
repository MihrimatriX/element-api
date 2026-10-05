# Agent notes (Element Market)

Moved from repo root — read when changing this codebase.

İnsan dili (operatör): [README.md](./README.md) · [servis kılavuzu](../docs/SERVIS-KILAVUZU.md) · [docker env](../docker/README.md).
Her proje klasörünün README’si o kutuyu anlatır.

## Root = projects only

`catalog-service`, `compound-service`, `gateway-service`, `identity-service`, `inventory-service`, `notification-service`, `order-service`, `science-service`, `shared-lib`, `shipment-service`, `wallet-service`, `web-app`, `deploy/`

## Build / test (no .sln)

```powershell
.\deploy\scripts\build-all.ps1
.\deploy\scripts\test-unit.ps1
cd order-service && npm ci && npm run build
dotnet test deploy/tests/Element.Services.IntegrationTests --filter "Category=Integration"
```

## Messaging

- `shared-lib/Events/` — .NET types (source of truth)
- URN prefix: `Element.Shared.Events:*` (do not rename without migration)
- Node/Java: same envelope + URN namespace as MassTransit

## Conventions

- `ConfigureRabbitMqHost` for RabbitMQ
- `ApplyDatabaseAsync<TContext>` for EF migrate
- MassTransit 8.3.4 on .NET services
- Integration tests: `[Trait("Category", "Integration")]`, `OrderNodeTestHost` needs `order-service` built
