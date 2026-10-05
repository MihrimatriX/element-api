# Optional Jenkins compose smoke: the gateway /health endpoints must answer 200.
#
# Jenkins runs this only when RUN_COMPOSE_SMOKE=1 and Docker is on the agent.
# It reuses an already-running local stack and never forces a rebuild of every image.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $root

$gatewayBase = 'http://127.0.0.1:5000'
$gatewayHealthUrl = "$gatewayBase/health"

# Prefer the already-running local stack; otherwise start it from existing images.
try {
  $response = Invoke-WebRequest -Uri $gatewayHealthUrl -UseBasicParsing -TimeoutSec 5
  if ($response.StatusCode -ne 200) { throw "gateway health $($response.StatusCode)" }
  Write-Host "gateway /health OK"
} catch {
  Write-Host "Gateway not up — starting present-platform -NoBuild (set images first)."
  & ./deploy/scripts/present-platform.ps1 -NoBuild
  Start-Sleep -Seconds 15
  $response = Invoke-WebRequest -Uri $gatewayHealthUrl -UseBasicParsing -TimeoutSec 30
  if ($response.StatusCode -ne 200) { throw "gateway health $($response.StatusCode)" }
}

foreach ($healthPath in @('/health', '/health/live', '/health/ready')) {
  $url = "$gatewayBase$healthPath"
  $statusCode = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15).StatusCode
  if ($statusCode -ne 200) { throw "$url -> $statusCode" }
  Write-Host "OK $url"
}
Write-Host 'Compose health smoke passed.'
