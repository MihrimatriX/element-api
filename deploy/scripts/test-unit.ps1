# Runs the .NET unit test projects only (no Docker; integration tests are filtered out).
param([string]$Configuration = 'Debug')
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

# A portable runtime under artifacts/dotnet (if present) is used instead of the global one.
$portableRuntime = Join-Path $root 'artifacts/dotnet'
if (Test-Path (Join-Path $portableRuntime 'dotnet.exe')) {
    $env:DOTNET_ROOT = $portableRuntime
    $env:DOTNET_ROOT_X64 = $portableRuntime
}

$testProjects = @(
    "deploy\tests\Element.Gateway.Tests\Element.Gateway.Tests.csproj",
    "deploy\tests\Element.Services.UnitTests\Element.Services.UnitTests.csproj"
)

foreach ($relativePath in $testProjects) {
    dotnet test (Join-Path $root $relativePath) -c $Configuration --filter "Category!=Integration" --verbosity minimal
    if ($LASTEXITCODE -ne 0) { throw "Tests failed: $relativePath" }
}
