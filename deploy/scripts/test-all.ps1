param(
    [string]$Configuration = 'Review',
    [switch]$Integration,
    [switch]$Live,
    [switch]$Browser,
    [switch]$Recovery,
    [string]$WebBase = 'http://localhost:3000'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
function Invoke-Checked([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE)." }
}

$savedDotnet = $env:DOTNET_ROOT
$savedDotnetX64 = $env:DOTNET_ROOT_X64
$savedWebBase = $env:WEB_BASE
Push-Location $root
try {
    # Keep generated files and local secrets out of future commits.
    $tracked = @(git ls-files)
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect tracked files.' }
    $generated = @($tracked | Where-Object { $_ -match '/(bin|obj|dist|target|node_modules)/' -or $_ -match '(^|/)\.env$' })
    if ($generated.Count) { throw "$($generated.Count) generated or local environment files are tracked by Git." }

    Invoke-Checked npm @('--prefix', 'web-app', 'run', 'lint')
    Invoke-Checked npm @('--prefix', 'web-app', 'test')
    Invoke-Checked npm @('--prefix', 'web-app', 'run', 'build')
    Invoke-Checked npm @('--prefix', 'order-service', 'run', 'build')
    Invoke-Checked npm @('--prefix', 'order-service', 'run', 'check')
    & ./deploy/scripts/build-all.ps1 -Configuration $Configuration
    & ./deploy/scripts/test-unit.ps1 -Configuration $Configuration
    if ($Browser) {
        Invoke-Checked npm @('--prefix', 'web-app', 'run', 'test:e2e')
        Invoke-Checked npm @('--prefix', 'web-app', 'run', 'test:e2e:auth')
    }
    Invoke-Checked npm @('--prefix', 'web-app', 'audit')
    Invoke-Checked npm @('--prefix', 'order-service', 'audit')

    if ($Integration) {
        Invoke-Checked dotnet @('test', 'deploy/tests/Element.Services.IntegrationTests', '-c', $Configuration, '--no-build', '--filter', 'Category=Integration', '--verbosity', 'minimal')
    }
    if ($Live) {
        & ./deploy/scripts/test-saga.ps1
        Invoke-Checked node @('deploy/scripts/test-scientific-api.mjs')
        Invoke-Checked node @('deploy/scripts/test-e2e.mjs')
        Invoke-Checked pwsh @('-NoProfile', '-File', './deploy/scripts/test-smoke.ps1', '-WebBase', $WebBase)
        $env:WEB_BASE = $WebBase
        Invoke-Checked node @('deploy/scripts/test-platform.mjs')
        Invoke-Checked npm @('--prefix', 'web-app', 'run', 'test:e2e:live')
    }
    if ($Recovery) { Invoke-Checked node @('deploy/scripts/test-backup-restore.mjs') }
    Write-Host 'All selected checks passed. Integration and live checks run only when their switches are supplied.' -ForegroundColor Green
} finally {
    Pop-Location
    $env:DOTNET_ROOT = $savedDotnet
    $env:DOTNET_ROOT_X64 = $savedDotnetX64
    $env:WEB_BASE = $savedWebBase
}
