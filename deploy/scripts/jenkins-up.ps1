# Start local Jenkins controller (docker-compose.jenkins.yml).
# UI: http://127.0.0.1:8085
param(
    [switch]$Detach = $true,
    [switch]$Down,
    [switch]$PrintAdminPassword
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$compose = Join-Path $root 'docker-compose.jenkins.yml'

Push-Location $root
try {
    if ($Down) {
        docker compose -f $compose -p element-jenkins down
        exit $LASTEXITCODE
    }

    Write-Host 'Starting Jenkins (element-jenkins) on http://127.0.0.1:8085 …'
    docker compose -f $compose -p element-jenkins up -d
    if ($LASTEXITCODE -ne 0) { throw 'jenkins compose up failed' }

    Write-Host 'Waiting for Jenkins to accept HTTP…'
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        try {
            $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8085/login' -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { $ready = $true; break }
        } catch {
            Start-Sleep -Seconds 3
        }
    }
    if (-not $ready) {
        Write-Host 'Jenkins not ready yet — check: docker logs element-jenkins'
        exit 1
    }

    Write-Host 'Jenkins is up: http://127.0.0.1:8085'
    Write-Host 'Initial admin password (first boot):'
    docker exec element-jenkins cat /var/jenkins_home/secrets/initialAdminPassword 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '(password file missing — wizard already completed or volume reused)'
    }
    Write-Host ''
    Write-Host 'Next: docs/CI-JENKINS.md — install plugins, create Multibranch, or paste'
    Write-Host '  deploy/jenkins/job-dsl-multibranch.groovy'
} finally {
    Pop-Location
}
