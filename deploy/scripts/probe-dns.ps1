# Probe DNS/TLS for elements-api.ahmetfuzunkaya.com (and apex context).
# Safe to re-run; prints no secrets.
param(
    [string]$Name = 'elements-api.ahmetfuzunkaya.com',
    [string]$Apex = 'ahmetfuzunkaya.com',
    [string]$DnsServer = '8.8.8.8'
)
$ErrorActionPreference = 'Continue'
Write-Host "=== DNS probe $(Get-Date -Format o) ==="
Write-Host "Resolver: $DnsServer"
Write-Host ""

function Show-Dns([string]$q, [string]$type = '') {
    $label = if ($type) { "$q ($type)" } else { $q }
    Write-Host "--- $label ---"
    try {
        if ($type) {
            Resolve-DnsName $q -Type $type -Server $DnsServer -ErrorAction Stop |
                Format-Table Name, Type, TTL, NameHost, IPAddress -AutoSize
        } else {
            Resolve-DnsName $q -Server $DnsServer -ErrorAction Stop |
                Format-Table Name, Type, TTL, NameHost, IPAddress -AutoSize
        }
        return $true
    } catch {
        Write-Host "FAIL: $($_.Exception.Message)"
        return $false
    }
}

$ok = Show-Dns $Name
[void](Show-Dns $Apex)
[void](Show-Dns $Apex 'NS')

Write-Host ''
Write-Host '--- HTTPS ---'
if ($ok) {
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
