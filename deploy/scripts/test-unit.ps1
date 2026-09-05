# Unit tests only (no Docker).
param([string]$Configuration = 'Debug')
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$portableRuntime = Join-Path $root 'artifacts/dotnet'
if (Test-Path (Join-Path $portableRuntime 'dotnet.exe')) {
    $env:DOTNET_ROOT = $portableRuntime
    $env:DOTNET_ROOT_X64 = $portableRuntime
}

$tests = @(
    "deploy\tests\Element.Gateway.Tests\Element.Gateway.Tests.csproj",
    "deploy\tests\Element.Services.UnitTests\Element.Services.UnitTests.csproj"
)

foreach ($rel in $tests) {
    dotnet test (Join-Path $root $rel) -c $Configuration --filter "Category!=Integration" --verbosity minimal
    if ($LASTEXITCODE -ne 0) { throw "Tests failed: $rel" }
}
