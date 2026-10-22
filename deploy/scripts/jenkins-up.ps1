# Starts (or with -Down stops) the local Jenkins controller from docker-compose.jenkins.yml.
# UI: http://127.0.0.1:8085
param(
    # Kept for backwards compatibility: the controller always starts detached (-d).
    [switch]$Detach = $true,
    [switch]$Down,
    # Kept for backwards compatibility: the initial admin password is always printed when present.
    [switch]$PrintAdminPassword
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$compose = Join-Path $root 'docker-compose.jenkins.yml'
$jenkinsUrl = 'http://127.0.0.1:8085'
$readinessAttempts = 60
$secondsBetweenAttempts = 3

Push-Location $root
try {
    if ($Down) {
        docker compose -f $compose -p element-jenkins down
        exit $LASTEXITCODE
    }

    Write-Host "Starting Jenkins (element-jenkins) on $jenkinsUrl …"
    docker compose -f $compose -p element-jenkins up -d
    if ($LASTEXITCODE -ne 0) { throw 'jenkins compose up failed' }

    # Jenkins needs a while on first boot; any non-5xx answer from /login means HTTP is up.
    Write-Host 'Waiting for Jenkins to accept HTTP…'
    $ready = $false
    for ($attempt = 0; $attempt -lt $readinessAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri "$jenkinsUrl/login" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                $ready = $true
                break
            }
        } catch {
            Start-Sleep -Seconds $secondsBetweenAttempts
        }
    }
    if (-not $ready) {
        Write-Host 'Jenkins not ready yet — check: docker logs element-jenkins'
        exit 1
    }

    Write-Host "Jenkins is up: $jenkinsUrl"
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
