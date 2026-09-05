param(
    [string]$Configuration = 'Review',
    [switch]$Integration,
    [switch]$Live,
    [string]$WebBase = 'http://localhost:5173'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
function Invoke-Checked([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE)." }
}

$savedJava = $env:JAVA_HOME
$savedDotnet = $env:DOTNET_ROOT
$savedDotnetX64 = $env:DOTNET_ROOT_X64
Push-Location $root
try {
    $portableJava = Get-ChildItem 'artifacts/tools' -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($portableJava) { $env:JAVA_HOME = $portableJava.FullName }
    $maven = Join-Path $root 'artifacts/tools/apache-maven-3.9.9/bin/mvn.cmd'
    if (!(Test-Path -LiteralPath $maven)) { $maven = (Get-Command mvn -ErrorAction Stop).Source }

    # Keep generated files and local secrets out of future commits.
    $tracked = @(git ls-files)
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect tracked files.' }
    $generated = @($tracked | Where-Object { $_ -match '/(bin|obj|dist|target|node_modules)/' -or $_ -match '(^|/)\.env$' })
    if ($generated.Count) { throw "$($generated.Count) generated or local environment files are tracked by Git." }

    Invoke-Checked npm @('--prefix', 'web-app', 'run', 'lint')
    Invoke-Checked npm @('--prefix', 'web-app', 'run', 'build')
    Invoke-Checked npm @('--prefix', 'order-service', 'run', 'build')
    Invoke-Checked npm @('--prefix', 'order-service', 'run', 'check')
    & ./deploy/scripts/build-all.ps1 -Configuration $Configuration
    & ./deploy/scripts/test-unit.ps1 -Configuration $Configuration
    Invoke-Checked $maven @('-f', 'payment-service/pom.xml', '-q', 'test')
    Invoke-Checked npm @('--prefix', 'web-app', 'audit')
    Invoke-Checked npm @('--prefix', 'order-service', 'audit')

    if ($Integration) {
        Invoke-Checked dotnet @('test', 'deploy/tests/Element.Services.IntegrationTests', '-c', $Configuration, '--no-build', '--filter', 'Category=Integration', '--verbosity', 'minimal')
    }
    if ($Live) {
        & ./deploy/scripts/test-saga.ps1
        Invoke-Checked node @('deploy/scripts/test-scientific-api.mjs')
        Invoke-Checked node @('deploy/scripts/test-e2e.mjs')
        & ./deploy/scripts/test-smoke.ps1 -WebBase $WebBase
    }
    Write-Host 'All selected checks passed. Integration and live checks run only when their switches are supplied.' -ForegroundColor Green
} finally {
    Pop-Location
    $env:JAVA_HOME = $savedJava
    $env:DOTNET_ROOT = $savedDotnet
    $env:DOTNET_ROOT_X64 = $savedDotnetX64
}
