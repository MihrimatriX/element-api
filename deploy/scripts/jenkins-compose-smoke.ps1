# Optional Jenkins compose smoke — critical /health

Requires Docker on the agent and `RUN_COMPOSE_SMOKE=1`. Does not rebuild the world if images already exist; uses existing compose project when possible.

```powershell
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $root

# Prefer already-running local stack; otherwise bring up without forcing --build of everything.
$gateway = 'http://127.0.0.1:5000/health'
try {
  $r = Invoke-WebRequest -Uri $gateway -UseBasicParsing -TimeoutSec 5
  if ($r.StatusCode -ne 200) { throw "gateway health $($r.StatusCode)" }
  Write-Host "gateway /health OK"
} catch {
  Write-Host "Gateway not up — starting present-platform -NoBuild (set images first)."
  & ./deploy/scripts/present-platform.ps1 -NoBuild
  Start-Sleep -Seconds 15
  $r = Invoke-WebRequest -Uri $gateway -UseBasicParsing -TimeoutSec 30
  if ($r.StatusCode -ne 200) { throw "gateway health $($r.StatusCode)" }
}

foreach ($path in @('/health', '/health/live', '/health/ready')) {
  $u = "http://127.0.0.1:5000$path"
  $code = (Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 15).StatusCode
  if ($code -ne 200) { throw "$u -> $code" }
  Write-Host "OK $u"
}
Write-Host 'Compose health smoke passed.'
