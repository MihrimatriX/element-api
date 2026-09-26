$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
npm --prefix web-app run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm --prefix order-service run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'lint/build gate OK (web eslint + order tsc via build).' -ForegroundColor Green
