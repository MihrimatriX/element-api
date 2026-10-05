# Runs the order-service saga regression check (src/saga.integration.check.ts) against the
# local Postgres from docker/.env. The previous DATABASE_URL is restored afterwards.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path

$settings = @{}
foreach ($line in Get-Content (Join-Path $root 'docker/.env')) {
    # -cmatch (case-sensitive) keeps [A-Za-z] culture-independent: with case-insensitive -match, older .NET
    # folds "I" to the Turkish dotless "ı" under a tr-TR locale and keys such as INTERNAL_API_KEY stop matching.
    if ($line -cmatch '^([A-Za-z_][A-Za-z_0-9]*)=(.*)$') {
        $settings[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
}
$dbPort = if ($settings.POSTGRES_HOST_PORT) { $settings.POSTGRES_HOST_PORT } else { '5432' }
$dbUser = if ($settings.POSTGRES_USER) { $settings.POSTGRES_USER } else { 'postgres' }
$dbPass = if ($settings.POSTGRES_PASSWORD) { $settings.POSTGRES_PASSWORD } else { 'mysecretpassword' }

$previousDatabaseUrl = $env:DATABASE_URL
try {
    $escapedUser = [uri]::EscapeDataString($dbUser)
    $escapedPassword = [uri]::EscapeDataString($dbPass)
    $env:DATABASE_URL = "postgres://${escapedUser}:${escapedPassword}@localhost:$dbPort/element_order_db"
    Push-Location (Join-Path $root 'order-service')
    try {
        # npx writes notices to stderr; under Stop that becomes a NativeCommandError even when exit 0.
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        npx --no-install tsx src/saga.integration.check.ts
        $exitCode = $LASTEXITCODE
        $ErrorActionPreference = $previousPreference
        if ($exitCode -ne 0) { throw 'Saga regression test failed.' }
    } finally { Pop-Location }
} finally { $env:DATABASE_URL = $previousDatabaseUrl }
