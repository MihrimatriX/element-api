# Unit tests only (no Docker).
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

$tests = @(
    "deploy\tests\Element.Gateway.Tests\Element.Gateway.Tests.csproj",
    "deploy\tests\Element.Services.UnitTests\Element.Services.UnitTests.csproj"
)

foreach ($rel in $tests) {
    dotnet test (Join-Path $root $rel) -c Release --filter "Category!=Integration" --verbosity minimal
}
