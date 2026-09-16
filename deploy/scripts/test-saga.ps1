$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$settings = @{}
foreach ($line in Get-Content (Join-Path $root 'docker/.env')) {
    if ($line -match '^([A-Za-z_][A-Za-z_0-9]*)=(.*)$') { $settings[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'") }
}
$dbPort = if ($settings.POSTGRES_HOST_PORT) { $settings.POSTGRES_HOST_PORT } else { '5432' }
$dbUser = if ($settings.POSTGRES_USER) { $settings.POSTGRES_USER } else { 'postgres' }
$dbPass = if ($settings.POSTGRES_PASSWORD) { $settings.POSTGRES_PASSWORD } else { 'mysecretpassword' }
$previous = $env:DATABASE_URL
try {
    $env:DATABASE_URL = "postgres://$([uri]::EscapeDataString($dbUser)):$([uri]::EscapeDataString($dbPass))@localhost:$dbPort/element_order_db"
    Push-Location (Join-Path $root 'order-service')
    try {
        # npx writes notices to stderr; under Stop that becomes a NativeCommandError even when exit 0.
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        npx --no-install tsx src/saga.integration.check.ts
        $code = $LASTEXITCODE
        $ErrorActionPreference = $prev
        if ($code -ne 0) { throw 'Saga regression test failed.' }
    } finally { Pop-Location }
} finally { $env:DATABASE_URL = $previous }
