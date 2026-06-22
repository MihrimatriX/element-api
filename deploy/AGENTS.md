# Agent notes (Element Market)

Moved from repo root — read when changing this codebase.

## Root = projects only

`catalog-service`, `contracts`, `gateway-service`, `identity-service`, `notification-service`, `order-service`, `payment-service`, `shared-lib`, `shipment-service`, `web-app`, `deploy/`

## Build / test (no .sln)

```powershell
.\deploy\scripts\build-all.ps1
.\deploy\scripts\test-unit.ps1
cd order-service && npm ci && npm run build
dotnet test deploy/tests/Element.Services.IntegrationTests --filter "Category=Integration"
```

## Messaging

- `contracts/README.md` — polyglot JSON envelopes
- `shared-lib/Events/` — .NET types
- URN prefix: `Element.Shared.Events:*` (do not rename without migration)

## Conventions

- `ConfigureRabbitMqHost` for RabbitMQ
- `ApplyDatabaseAsync<TContext>` for EF migrate
- MassTransit 9.1.1 on .NET services
- Integration tests: `[Trait("Category", "Integration")]`, `OrderNodeTestHost` needs `order-service` built
