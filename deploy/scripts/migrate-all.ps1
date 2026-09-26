# Generates or applies EF Core migrations for all database-backed services.
# Requires: dotnet-ef tool — dotnet tool install -g dotnet-ef

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

Write-Host "Adding/updating EF migrations..." -ForegroundColor Cyan

$migrations = @(
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

foreach ($m in $migrations) {
    $infra = Join-Path $root $m.Infrastructure
    $api = Join-Path $root $m.Api
    $outDir = Join-Path $infra $m.Output

    if (-not (Test-Path $outDir)) {
        Write-Host "Creating InitialCreate for $($m.Name)..." -ForegroundColor Yellow
        dotnet ef migrations add InitialCreate `
            --project $infra `
            --startup-project $api `
            --context $m.Context `
            --output-dir $m.Output
    } else {
        Write-Host "$($m.Name) migrations already exist at $outDir" -ForegroundColor Green
    }
}

Write-Host "Done. Production deploys use Database.Migrate via ApplyDatabaseAsync." -ForegroundColor Cyan
