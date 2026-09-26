param([switch]$NoBuild)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $root
try {
    $args = @('-f', 'docker-compose.science.yml', 'up', '-d')
    if (!$NoBuild) { $args += '--build' }
    docker compose @args
    if ($LASTEXITCODE -ne 0) { throw 'Science presentation startup failed.' }
    Write-Host 'Atlas presentation: http://127.0.0.1:5080 — stop with ./deploy/scripts/stop-local.ps1'
} finally { Pop-Location }
