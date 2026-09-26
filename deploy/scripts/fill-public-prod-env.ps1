# Creates gitignored docker/.env.public.prod from the example + fresh secrets.
# Default: local prod smoke (:8082). Pass -ServerTemplate to write real-host CADDY_SITE/80/443
# (still needs DNS → this machine and operator paste for Turnstile).
# Never prints secret values. Does not overwrite an existing file unless -Force.
param(
    [switch]$Force,
    [switch]$ServerTemplate,
    [string]$DeployHostIp = ''
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$example = Join-Path $root 'docker/.env.public.prod.example'
$target = Join-Path $root 'docker/.env.public.prod'

if ((Test-Path -LiteralPath $target) -and -not $Force) {
    Write-Host "Exists: $target (pass -Force to regenerate secrets)."
    exit 0
}
if (!(Test-Path -LiteralPath $example)) { throw "Missing $example" }

function New-HexSecret([int]$bytes = 32) {
    $buf = New-Object byte[] $bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buf) } finally { $rng.Dispose() }
    -join ($buf | ForEach-Object { $_.ToString('x2') })
}

$jwt = New-HexSecret
$iak = New-HexSecret
$pg = New-HexSecret
$rb = New-HexSecret

$lines = Get-Content -LiteralPath $example
$out = foreach ($line in $lines) {
    if ($line -match '^\s*JWT_SECRET=') { "JWT_SECRET=$jwt"; continue }
    if ($line -match '^\s*INTERNAL_API_KEY=') { "INTERNAL_API_KEY=$iak"; continue }
    if ($line -match '^\s*POSTGRES_PASSWORD=') { "POSTGRES_PASSWORD=$pg"; continue }
    if ($line -match '^\s*RABBITMQ_DEFAULT_PASS=') { "RABBITMQ_DEFAULT_PASS=$rb"; continue }

    if ($ServerTemplate) {
        if ($line -match '^\s*CADDY_SITE=') { 'CADDY_SITE=elements-api.ahmetfuzunkaya.com'; continue }
        if ($line -match '^\s*CADDY_HTTP_PORT=') { 'CADDY_HTTP_PORT=80'; continue }
        if ($line -match '^\s*CADDY_HTTPS_PORT=') { 'CADDY_HTTPS_PORT=443'; continue }
        if ($line -match '^\s*PUBLIC_WEB_ORIGIN=') { 'PUBLIC_WEB_ORIGIN=https://elements-api.ahmetfuzunkaya.com'; continue }
        if ($line -match '^\s*VITE_PUBLIC_SITE_URL=') { 'VITE_PUBLIC_SITE_URL=https://elements-api.ahmetfuzunkaya.com'; continue }
        if ($line -match '^\s*PUBLIC_API_BASE=') { 'PUBLIC_API_BASE=https://elements-api.ahmetfuzunkaya.com'; continue }
    }
    $line
}

# Footer: operator leftovers (no secrets)
$footer = @(
    ''
    '# --- Operator leftovers (filled by fill-public-prod-env.ps1) ---'
    '# SMTP_* left empty = e-postasız beta (product decision).'
    '# CAPTCHA_SECRET_KEY / VITE_CAPTCHA_SITE_KEY: paste from Cloudflare Turnstile when ready;'
    '#   then rebuild web-app. See docs/ops/TURNSTILE.md.'
)
if ($ServerTemplate) {
    $footer += '# Server template: CADDY_SITE + 80/443 + https origins set.'
    $footer += '# DNS must resolve elements-api.ahmetfuzunkaya.com → this host before ACME works.'
    if ($DeployHostIp) {
        $footer += "# Expected A record target (operator-supplied): $DeployHostIp"
    } else {
        $footer += '# Set A/AAAA in Hostinger DNS (see docs/ops/DNS-TLS.md); IP not assumed by this script.'
    }
} else {
    $footer += '# Local smoke (:8082). For real host: re-run with -ServerTemplate (and -Force).'
}

$out + $footer | Set-Content -LiteralPath $target -Encoding utf8
Write-Host "Wrote $target"
Write-Host "  JWT_SECRET / INTERNAL_API_KEY / POSTGRES_PASSWORD / RABBITMQ_DEFAULT_PASS: generated (len 64 hex each)"
Write-Host "  SMTP_*: empty (e-postasız beta)"
Write-Host "  Turnstile: still empty — paste when you have keys"
if ($ServerTemplate) {
    Write-Host "  Mode: ServerTemplate (elements-api + :80/:443)"
} else {
    Write-Host "  Mode: local Prod smoke (http://localhost:8082)"
}
Write-Host "File is gitignored. Do not commit."
