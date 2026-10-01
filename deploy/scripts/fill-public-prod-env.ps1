# Creates the gitignored docker/.env.public.prod from its example, with freshly generated secrets.
# Default: local prod smoke (:8082). Pass -ServerTemplate to write the real-host CADDY_SITE and 80/443
# (DNS must still point at this machine, and the operator still pastes the Turnstile keys).
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

$publicHost = 'elements-api.ahmetfuzunkaya.com'
$publicOrigin = "https://$publicHost"

if ((Test-Path -LiteralPath $target) -and -not $Force) {
    Write-Host "Exists: $target (pass -Force to regenerate secrets)."
    exit 0
}
if (!(Test-Path -LiteralPath $example)) { throw "Missing $example" }

# Returns a cryptographically random secret as lowercase hex (32 bytes -> 64 characters).
function New-HexSecret([int]$byteCount = 32) {
    $buffer = New-Object byte[] $byteCount
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($buffer) } finally { $generator.Dispose() }
    -join ($buffer | ForEach-Object { $_.ToString('x2') })
}

# Secrets replace the example placeholders in every mode.
$generatedSecrets = [ordered]@{
    JWT_SECRET            = New-HexSecret
    INTERNAL_API_KEY      = New-HexSecret
    POSTGRES_PASSWORD     = New-HexSecret
    RABBITMQ_DEFAULT_PASS = New-HexSecret
}

# Only -ServerTemplate switches the file from local smoke to the real public host.
$serverOverrides = [ordered]@{
    CADDY_SITE           = $publicHost
    CADDY_HTTP_PORT      = '80'
    CADDY_HTTPS_PORT     = '443'
    PUBLIC_WEB_ORIGIN    = $publicOrigin
    VITE_PUBLIC_SITE_URL = $publicOrigin
    PUBLIC_API_BASE      = $publicOrigin
}

# Returns "KEY=value" when the line assigns one of the given keys, otherwise $null.
function Get-ReplacementLine([string]$Line, $Values) {
    foreach ($key in $Values.Keys) {
        if ($Line -match "^\s*$key=") { return "$key=$($Values[$key])" }
    }
    return $null
}

$outputLines = foreach ($line in Get-Content -LiteralPath $example) {
    $replacement = Get-ReplacementLine $line $generatedSecrets
    if (-not $replacement -and $ServerTemplate) { $replacement = Get-ReplacementLine $line $serverOverrides }
    if ($replacement) { $replacement } else { $line }
}

# Footer: what the operator still has to do by hand (never contains secrets).
$footer = @(
    ''
    '# --- Operator leftovers (filled by fill-public-prod-env.ps1) ---'
    '# SMTP_* left empty = e-postasız beta (product decision).'
    '# CAPTCHA_SECRET_KEY / VITE_CAPTCHA_SITE_KEY: paste from Cloudflare Turnstile when ready;'
    '#   then rebuild web-app. See docs/ops/TURNSTILE.md.'
)
if ($ServerTemplate) {
    $footer += '# Server template: CADDY_SITE + 80/443 + https origins set.'
    $footer += "# DNS must resolve $publicHost → this host before ACME works."
    if ($DeployHostIp) {
        $footer += "# Expected A record target (operator-supplied): $DeployHostIp"
    } else {
        $footer += '# Set A/AAAA in Hostinger DNS (see docs/ops/DNS-TLS.md); IP not assumed by this script.'
    }
} else {
    $footer += '# Local smoke (:8082). For real host: re-run with -ServerTemplate (and -Force).'
}

$outputLines + $footer | Set-Content -LiteralPath $target -Encoding utf8
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
