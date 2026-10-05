# Smoke test against already running local services or the Docker demo.
# Covers public catalog routes, auth guards, register -> API key, wallet grant, a full buy saga,
# holdings and a desk sell. Throws at the end if any check failed.
# Local setup: ./deploy/scripts/start-local.ps1
param([string]$WebBase = "http://localhost:5173", [string]$ApiBase = "http://localhost:5000")

$ErrorActionPreference = "Stop"
$passed = 0
$failed = 0

# Records one passing check.
function Write-Pass([string]$Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
    $script:passed++
}

# Records one failing check.
function Write-Fail([string]$Message) {
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    $script:failed++
}

# GETs a URL and checks that the HTTP status is one of the expected codes.
function Assert-Status {
    param([string]$Name, [string]$Url, [int[]]$Expected, [hashtable]$Headers = @{})
    try {
        $request = @{ Uri = $Url; UseBasicParsing = $true; TimeoutSec = 20 }
        if ($Headers.Count -gt 0) { $request.Headers = $Headers }
        $response = Invoke-WebRequest @request
        $code = [int]$response.StatusCode
    } catch {
        $code = [int]$_.Exception.Response.StatusCode.value__
    }
    if ($Expected -contains $code) {
        Write-Pass "$Name ($code)"
    } else {
        Write-Fail "$Name - got $code, expected $($Expected -join '|') - $Url"
    }
}

# Polls an order until it reaches one of the target statuses; returns the last status seen.
function Wait-OrderStatus {
    param([string]$OrderId, [string]$ApiKey, [string[]]$TargetStatuses, [int]$TimeoutSec = 90)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $lastStatus = $null
    while ((Get-Date) -lt $deadline) {
        try {
            $order = Invoke-RestMethod -Uri "$ApiBase/api/v1/orders/$OrderId" `
                -Headers @{ "X-API-Key" = $ApiKey } -TimeoutSec 15
            $lastStatus = $order.status
            if ($TargetStatuses -contains $order.status) {
                return $order.status
            }
        } catch {
            # The order may not be readable yet; keep polling until the deadline.
        }
        Start-Sleep -Seconds 2
    }
    return $lastStatus
}

# Holdings are credited asynchronously after the saga completes, so poll for the Au row.
function Wait-GoldHolding([string]$ApiKey) {
    $holding = $null
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $holdings = Invoke-RestMethod -Uri "$ApiBase/api/v1/me/holdings" `
                -Headers @{ "X-API-Key" = $ApiKey } -TimeoutSec 15
            $holding = @($holdings) | Where-Object { $_.symbol -ieq "Au" } | Select-Object -First 1
            if ($holding -and [decimal]$holding.grams -ge 1) { break }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    return $holding
}

# Buys 1 g gold, waits for the saga, checks holdings, then sells the gram back at the desk.
function Test-OrderLifecycle([string]$ApiKey) {
    $orderBody = @{ elementSymbol = "Au"; quantity = 1 } | ConvertTo-Json
    $order = Invoke-RestMethod -Uri "$ApiBase/api/v1/orders" -Method POST `
        -Headers @{ "X-API-Key" = $ApiKey } `
        -Body $orderBody -ContentType "application/json"
    if (-not ($order.id -and $order.totalPrice -gt 0)) {
        Write-Fail "POST order - unexpected response"
        return
    }
    Write-Pass "POST order (id=$($order.id.Substring(0,8))...)"

    $finalStatus = Wait-OrderStatus -OrderId $order.id -ApiKey $ApiKey -TargetStatuses @("Completed", "Failed") -TimeoutSec 90
    if ($finalStatus -ne "Completed") {
        Write-Fail "Saga did not complete - last status: $finalStatus"
        return
    }
    Write-Pass "Saga completed ($finalStatus)"

    $goldHolding = Wait-GoldHolding $ApiKey
    if ($goldHolding -and [decimal]$goldHolding.grams -ge 1) {
        Write-Pass "Holdings after complete (Au $($goldHolding.grams)g)"
    } else {
        Write-Fail "Holdings after complete - no Au grams"
    }

    try {
        $sell = Invoke-RestMethod -Uri "$ApiBase/api/v1/desk/sell" -Method POST `
            -Headers @{ "X-API-Key" = $ApiKey } `
            -Body (@{ symbol = "Au"; grams = 1 } | ConvertTo-Json) `
            -ContentType "application/json"
        if ($sell.proceedsElx -gt 0) {
            Write-Pass "Desk sell Au 1g (proceeds=$($sell.proceedsElx))"
        } else {
            Write-Fail "Desk sell - no proceeds"
        }
    } catch {
        Write-Fail "Desk sell - $($_.Exception.Message)"
    }
}

Write-Host "`n=== Element Market Smoke Tests ===`n" -ForegroundColor Cyan

Assert-Status "API discovery" "$ApiBase/api/v1" @(200)
Assert-Status "Element list" "$ApiBase/api/v1/elements?pageSize=5" @(200)
Assert-Status "Element detail" "$ApiBase/api/v1/elements/au" @(200)
Assert-Status "Element search" "$ApiBase/api/v1/elements/search?q=gold" @(200)
Assert-Status "Element random" "$ApiBase/api/v1/elements/random" @(200)
Assert-Status "Ticker public" "$ApiBase/api/v1/elements/au/ticker" @(200)
Assert-Status "Market movers" "$ApiBase/api/v1/market/movers" @(200)
Assert-Status "Categories" "$ApiBase/api/v1/categories" @(200)
Assert-Status "Gateway health" "$ApiBase/health" @(200)
Assert-Status "History without key" "$ApiBase/api/v1/elements/au/history" @(401)
Assert-Status "Orders without key" "$ApiBase/api/v1/orders" @(401)
Assert-Status "Web UI" "$WebBase/" @(200)

# Fresh throwaway account for the authenticated checks.
$email = "smoke-$(Get-Random)@element.dev"
$password = 'Smoke-Test123!'
$registerBody = @{ firstName = "Smoke"; lastName = "Test"; email = $email; password = $password } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$ApiBase/api/v1/auth/register" -Method POST -Body $registerBody -ContentType "application/json" | Out-Null
    $loginBody = @{ email = $email; password = $password } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$ApiBase/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $keyResponse = Invoke-RestMethod -Uri "$ApiBase/api/v1/api-keys/generate" -Method POST `
        -Headers @{ Authorization = "Bearer $($login.token)" } `
        -Body (@{ description = "smoke-test"; rateLimitTps = 20 } | ConvertTo-Json) `
        -ContentType "application/json"
    $apiKey = $keyResponse.apiKey
    Write-Pass "Register + login + API key"

    try {
        $wallet = Invoke-RestMethod -Uri "$ApiBase/api/v1/me/wallet" -Headers @{ "X-API-Key" = $apiKey } -TimeoutSec 15
        if ([decimal]$wallet.balanceElx -eq 10000) {
            Write-Pass "Wallet grant 10000 Kredi"
        } else {
            Write-Fail "Wallet grant - got $($wallet.balanceElx)"
        }
    } catch {
        Write-Fail "Wallet - $($_.Exception.Message)"
    }

    Assert-Status "History with key" "$ApiBase/api/v1/elements/au/history?limit=5" @(200) @{ "X-API-Key" = $apiKey }

    try {
        Test-OrderLifecycle $apiKey
    } catch {
        Write-Fail "POST order - $($_.Exception.Message)"
    }

    Assert-Status "GET orders with key" "$ApiBase/api/v1/orders" @(200) @{ "X-API-Key" = $apiKey }
} catch {
    Write-Fail "Auth flow - $($_.Exception.Message)"
}

Write-Host ""
Write-Host "=== Results: $passed passed, $failed failed ===" -ForegroundColor Cyan
Write-Host ""
if ($failed -gt 0) { throw "Smoke checks failed: $failed failed, $passed passed." }
