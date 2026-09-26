# Workspace / solution layout

There is **no** single `.sln` at the root by design (see `deploy/AGENTS.md`). Projects are folders:

| Folder | Stack | Entry |
|--------|-------|-------|
| `gateway-service` | .NET YARP | `Element.Gateway.csproj` |
| `identity-service`, `catalog-service`, `compound-service`, `shipment-service`, `notification-service` | .NET | each `Element.Services.*.csproj` |
| `science-service` | .NET | atlas-only |
| `order-service` | Node | `package.json` |
| `wallet-service`, `inventory-service` | Java 21 / Maven | `pom.xml` |
| `web-app` | React / Vite | `package.json` |
| `shared-lib` | .NET shared | events + prod config |
| `deploy/tests` | .NET test projects | Gateway + integration |
| `docker/` + compose | runtime | `docker-compose.yml` (+ public overlay) |

## Commands that must match docs

| Doc claim | Real command |
|-----------|--------------|
| present | `./scripts/present.ps1` ≡ `./deploy/scripts/present-platform.ps1` |
| up | `./scripts/up.ps1` ≡ `docker compose --env-file docker/.env up -d --build` |
| test | `./scripts/test.ps1` ≡ `./deploy/scripts/test-all.ps1` |
| lint | `./scripts/lint.ps1` |
| CI | Jenkins Multibranch — [CI-JENKINS.md](./CI-JENKINS.md) |

Build all .NET: `./deploy/scripts/build-all.ps1`. Unit: `./deploy/scripts/test-unit.ps1`.
