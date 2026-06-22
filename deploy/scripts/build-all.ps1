# Build all .NET services and test projects (replaces element-api.sln).
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

$projects = @(
    "shared-lib\Element.Shared.csproj",
    "gateway-service\Element.Gateway.csproj",
    "identity-service\Element.Services.Identity.API\Element.Services.Identity.API.csproj",
    "catalog-service\Element.Services.Element.API\Element.Services.Element.API.csproj",
    "notification-service\Element.Services.Notification.API\Element.Services.Notification.API.csproj",
    "shipment-service\Element.Services.Shipment.API\Element.Services.Shipment.API.csproj",
    "deploy\tests\Element.Gateway.Tests\Element.Gateway.Tests.csproj",
    "deploy\tests\Element.Services.UnitTests\Element.Services.UnitTests.csproj",
    "deploy\tests\Element.Services.IntegrationTests\Element.Services.IntegrationTests.csproj"
)

foreach ($rel in $projects) {
    $path = Join-Path $root $rel
    Write-Host "Building $rel ..." -ForegroundColor Cyan
    dotnet build $path -c Release
}

Write-Host "All projects built." -ForegroundColor Green
