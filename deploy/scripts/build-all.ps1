# Builds every .NET service and .NET test project one by one.
# The repo has no .sln on purpose, so this list is the single place that knows all .NET projects.
param([string]$Configuration = 'Release')
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

$projects = @(
    "science-service\Element.Science.csproj",
    "shared-lib\Element.Shared.csproj",
    "gateway-service\Element.Gateway.csproj",
    "identity-service\Element.Services.Identity.API\Element.Services.Identity.API.csproj",
    "catalog-service\Element.Services.Element.API\Element.Services.Element.API.csproj",
    "compound-service\Element.Services.Compound.API\Element.Services.Compound.API.csproj",
    "notification-service\Element.Services.Notification.API\Element.Services.Notification.API.csproj",
    "shipment-service\Element.Services.Shipment.API\Element.Services.Shipment.API.csproj",
    "deploy\tests\Element.Gateway.Tests\Element.Gateway.Tests.csproj",
    "deploy\tests\Element.Services.UnitTests\Element.Services.UnitTests.csproj",
    "deploy\tests\Element.Services.IntegrationTests\Element.Services.IntegrationTests.csproj"
)

foreach ($relativePath in $projects) {
    $projectPath = Join-Path $root $relativePath
    Write-Host "Building $relativePath ..." -ForegroundColor Cyan
    dotnet build $projectPath -c $Configuration
    if ($LASTEXITCODE -ne 0) { throw "Build failed: $relativePath" }
}

Write-Host "All projects built." -ForegroundColor Green
