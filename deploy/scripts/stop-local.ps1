$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $root
try {
    if (Test-Path -LiteralPath 'docker/.env') {
        docker compose --env-file docker/.env stop
    } else {
        docker compose stop
    }
    docker compose -f docker-compose.science.yml stop
    Write-Host 'Containers stopped. Volumes preserved. Remove everything with: docker compose --env-file docker/.env down'
} finally { Pop-Location }
