# Starts the standalone science atlas (docker-compose.science.yml) on http://127.0.0.1:5080.
# No database, broker or commerce services: the quickest way to demo the periodic table.
param([switch]$NoBuild)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $root
try {
    $composeArgs = @('-f', 'docker-compose.science.yml', 'up', '-d')
    if (!$NoBuild) { $composeArgs += '--build' }
    docker compose @composeArgs
    if ($LASTEXITCODE -ne 0) { throw 'Science presentation startup failed.' }
    Write-Host 'Atlas presentation: http://127.0.0.1:5080 — stop with ./deploy/scripts/stop-local.ps1'
} finally { Pop-Location }
