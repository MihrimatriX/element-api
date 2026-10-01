# Starts the full local platform (docker-compose.yml) with docker/.env.
# Creates docker/.env from docker/.env.example on first run so a fresh clone works immediately.
param([switch]$NoBuild)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $root
try {
    if (!(Test-Path -LiteralPath 'docker/.env')) {
        Copy-Item -LiteralPath 'docker/.env.example' -Destination 'docker/.env'
    }
    $composeArgs = @('--env-file', 'docker/.env', 'up', '-d')
    if (!$NoBuild) { $composeArgs += '--build' }
    docker compose @composeArgs
    if ($LASTEXITCODE -ne 0) { throw 'Platform startup failed.' }
    Write-Host 'Full platform: http://localhost:6241 (API http://localhost:5000) — stop with ./deploy/scripts/stop-local.ps1'
} finally { Pop-Location }
