param([switch]$NoBuild)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $root
try {
    if (!(Test-Path -LiteralPath 'docker/.env')) { Copy-Item -LiteralPath 'docker/.env.example' -Destination 'docker/.env' }
    $args = @('--env-file', 'docker/.env', 'up', '-d')
    if (!$NoBuild) { $args += '--build' }
    docker compose @args
    if ($LASTEXITCODE -ne 0) { throw 'Platform startup failed.' }
    Write-Host 'Full platform: http://localhost:3000 (API http://localhost:5000) — stop with ./deploy/scripts/stop-local.ps1'
} finally { Pop-Location }
