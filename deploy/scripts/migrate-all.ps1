# Creates the first EF Core migration (InitialCreate) for each database-backed .NET service
# that has no migrations folder yet. Existing migrations are never touched.
# Requires the dotnet-ef tool: dotnet tool install -g dotnet-ef

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

Write-Host "Adding/updating EF migrations..." -ForegroundColor Cyan

$migrationTargets = @(
    @{
        Name = "Identity"
        Infrastructure = "identity-service\Element.Services.Identity.Infrastructure"
        Api = "identity-service\Element.Services.Identity.API"
        Context = "IdentityAppDbContext"
        Output = "Persistence\Migrations"
    },
    @{
        Name = "Element"
        Infrastructure = "catalog-service\Element.Services.Element.Infrastructure"
        Api = "catalog-service\Element.Services.Element.API"
        Context = "ElementDbContext"
        Output = "Persistence\Migrations"
    },
    @{
        Name = "Shipment"
        Infrastructure = "shipment-service\Element.Services.Shipment.Infrastructure"
        Api = "shipment-service\Element.Services.Shipment.API"
        Context = "ShipmentDbContext"
        Output = "Data\Migrations"
    }
)

foreach ($target in $migrationTargets) {
    $infrastructureDir = Join-Path $root $target.Infrastructure
    $apiDir = Join-Path $root $target.Api
    $migrationsDir = Join-Path $infrastructureDir $target.Output

    if (Test-Path $migrationsDir) {
        Write-Host "$($target.Name) migrations already exist at $migrationsDir" -ForegroundColor Green
        continue
    }

    Write-Host "Creating InitialCreate for $($target.Name)..." -ForegroundColor Yellow
    dotnet ef migrations add InitialCreate `
        --project $infrastructureDir `
        --startup-project $apiDir `
        --context $target.Context `
        --output-dir $target.Output
}

Write-Host "Done. Production deploys use Database.Migrate via ApplyDatabaseAsync." -ForegroundColor Cyan
