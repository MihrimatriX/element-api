# Probes DNS and HTTPS for the public host (elements-api.ahmetfuzunkaya.com) and its apex domain.
# Read-only and safe to re-run; prints no secrets.
param(
    [string]$Name = 'elements-api.ahmetfuzunkaya.com',
    [string]$Apex = 'ahmetfuzunkaya.com',
    [string]$DnsServer = '8.8.8.8'
)
$ErrorActionPreference = 'Continue'
Write-Host "=== DNS probe $(Get-Date -Format o) ==="
Write-Host "Resolver: $DnsServer"
Write-Host ""

# Prints the DNS answer for one name (optionally one record type) and returns $true when it resolved.
function Show-Dns([string]$QueryName, [string]$RecordType = '') {
    $label = if ($RecordType) { "$QueryName ($RecordType)" } else { $QueryName }
    Write-Host "--- $label ---"
    $query = @{ Name = $QueryName; Server = $DnsServer; ErrorAction = 'Stop' }
    if ($RecordType) { $query.Type = $RecordType }
    try {
        # Out-Host keeps the table on screen instead of mixing it into the function's return value.
        Resolve-DnsName @query | Format-Table Name, Type, TTL, NameHost, IPAddress -AutoSize | Out-Host
        return $true
    } catch {
        Write-Host "FAIL: $($_.Exception.Message)"
        return $false
    }
}

$hostResolves = Show-Dns $Name
[void](Show-Dns $Apex)
[void](Show-Dns $Apex 'NS')

Write-Host ''
Write-Host '--- HTTPS ---'
if ($hostResolves) {
    curl.exe -sI --max-time 20 "https://$Name/" 2>&1 | Select-Object -First 15
} else {
    Write-Host "Skipped HTTPS — DNS for $Name not resolving (create A/AAAA first)."
}

Write-Host ''
Write-Host 'Expected (after operator creates record):'
Write-Host "  A     $Name  ->  <IP of host running element-prod Caddy>"
Write-Host "  AAAA  $Name  ->  <IPv6 if any>"
Write-Host 'Do NOT point at apex Hostinger shared hosting unless that host actually runs Docker+Caddy.'
Write-Host 'See docs/ops/DNS-TLS.md'
