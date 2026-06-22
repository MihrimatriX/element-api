# Smoke test — Docker stack public endpoints
# Usage: docker compose --env-file docker/.env up -d --build
#        ./deploy/scripts/test-smoke.ps1

$ErrorActionPreference = "Stop"
$base = "http://localhost:5000"
$web = "http://localhost:3000"
$passed = 0
$failed = 0

function Assert-Status {
    param([string]$Name, [string]$Url, [int[]]$Expected, [hashtable]$Headers = @{})
    try {
        $params = @{ Uri = $Url; UseBasicParsing = $true; TimeoutSec = 20 }
        if ($Headers.Count -gt 0) { $params.Headers = $Headers }
        $r = Invoke-WebRequest @params
        $code = [int]$r.StatusCode
    } catch {
        $code = [int]$_.Exception.Response.StatusCode.value__
    }
    if ($Expected -contains $code) {
        Write-Host "[OK]   $Name ($code)" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "[FAIL] $Name - got $code, expected $($Expected -join '|') - $Url" -ForegroundColor Red
        $script:failed++
    }
}

function Wait-OrderStatus {
    param([string]$OrderId, [string]$ApiKey, [string[]]$TargetStatuses, [int]$TimeoutSec = 90)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $lastStatus = $null
    while ((Get-Date) -lt $deadline) {
        try {
            $order = Invoke-RestMethod -Uri "$base/api/v1/orders/$OrderId" `
                -Headers @{ "X-API-Key" = $ApiKey } -TimeoutSec 15
            $lastStatus = $order.status
            if ($TargetStatuses -contains $order.status) {
                return $order.status
            }
        } catch {
            # retry
        }
        Start-Sleep -Seconds 2
    }
    return $lastStatus
}

Write-Host "`n=== Element Market Smoke Tests ===`n" -ForegroundColor Cyan

Assert-Status "API discovery" "$base/api/v1" @(200)
Assert-Status "Element list" "$base/api/v1/elements?pageSize=5" @(200)
Assert-Status "Element detail" "$base/api/v1/elements/au" @(200)
Assert-Status "Element search" "$base/api/v1/elements/search?q=gold" @(200)
Assert-Status "Element random" "$base/api/v1/elements/random" @(200)
Assert-Status "Categories" "$base/api/v1/categories" @(200)
Assert-Status "Gateway health" "$base/health" @(200)
Assert-Status "Order service health" "http://localhost:5003/health" @(200)
Assert-Status "Catalog health" "http://localhost:5002/health" @(200)
Assert-Status "History without key" "$base/api/v1/elements/au/history" @(401)
Assert-Status "Orders without key" "$base/api/v1/orders" @(401)
Assert-Status "Web UI" "$web/" @(200)

$email = "smoke-$(Get-Random)@element.dev"
$regBody = @{ firstName = "Smoke"; lastName = "Test"; email = $email; password = "Test1234!" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$base/api/v1/auth/register" -Method POST -Body $regBody -ContentType "application/json" | Out-Null
    $login = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method POST -Body (@{ email = $email; password = "Test1234!" } | ConvertTo-Json) -ContentType "application/json"
    $token = $login.token
    $keyRes = Invoke-RestMethod -Uri "$base/api/v1/api-keys/generate" -Method POST `
        -Headers @{ Authorization = "Bearer $token" } `
        -Body (@{ description = "smoke-test"; rateLimitTps = 20 } | ConvertTo-Json) `
        -ContentType "application/json"
    $apiKey = $keyRes.apiKey
    Write-Host "[OK]   Register + login + API key" -ForegroundColor Green
    $script:passed++

    Assert-Status "History with key" "$base/api/v1/elements/au/history?limit=5" @(200) @{ "X-API-Key" = $apiKey }

    $orderBody = @{ elementSymbol = "Au"; quantity = 1 } | ConvertTo-Json
    try {
        $order = Invoke-RestMethod -Uri "$base/api/v1/orders" -Method POST `
            -Headers @{ "X-API-Key" = $apiKey } `
            -Body $orderBody -ContentType "application/json"
        if ($order.id -and $order.totalPrice -gt 0) {
            Write-Host "[OK]   POST order (id=$($order.id.Substring(0,8))...)" -ForegroundColor Green
            $script:passed++

            $finalStatus = Wait-OrderStatus -OrderId $order.id -ApiKey $apiKey -TargetStatuses @("Completed", "Failed") -TimeoutSec 90
            if ($finalStatus -eq "Completed") {
                Write-Host "[OK]   Saga completed ($finalStatus)" -ForegroundColor Green
                $script:passed++
            } else {
                Write-Host "[FAIL] Saga did not complete - last status: $finalStatus" -ForegroundColor Red
                $script:failed++
            }
        } else {
            Write-Host "[FAIL] POST order - unexpected response" -ForegroundColor Red
            $script:failed++
        }
    } catch {
        Write-Host "[FAIL] POST order - $($_.Exception.Message)" -ForegroundColor Red
        $script:failed++
    }

    Assert-Status "GET orders with key" "$base/api/v1/orders" @(200) @{ "X-API-Key" = $apiKey }
} catch {
    Write-Host "[FAIL] Auth flow - $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
}

Write-Host ""
Write-Host "=== Results: $passed passed, $failed failed ===" -ForegroundColor Cyan
Write-Host ""
if ($failed -gt 0) { exit 1 }
