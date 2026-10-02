# Legacy bring-up: runs the .NET services and the Node order-service directly on this machine
# (no containers for the apps). Prefer ./present-platform.ps1 / docker compose.
# Postgres, Redis and RabbitMQ must already be running (for example from docker compose).
#   -NoBuild        start existing builds without compiling
#   -Restart        stop this project's running service processes first
#   -WebOrigin      origin the services trust for the web app (CORS, links)
#   -Configuration  build configuration whose bin/ folder is started
param(
    [switch]$NoBuild,
    [switch]$Restart,
    [string]$WebOrigin = 'http://localhost:3000',
    [ValidateSet('Debug', 'Release', 'Science')][string]$Configuration = 'Release'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$logs = Join-Path $root 'artifacts/local'
$orderPort = 5003
$serviceStartTimeoutSeconds = 90
$stopTimeoutSeconds = 15

# A portable runtime under artifacts/dotnet wins over the globally installed dotnet.
$dotnetHost = Join-Path $root 'artifacts/dotnet/dotnet.exe'
if (!(Test-Path -LiteralPath $dotnetHost)) { $dotnetHost = (Get-Command dotnet).Source }
New-Item -ItemType Directory -Force -Path $logs | Out-Null

# Read docker/.env so local processes use the same credentials as the containers.
$settings = @{}
$envFile = Join-Path $root 'docker/.env'
if (Test-Path -LiteralPath $envFile) {
    # ponytail: Split('=',2) — avoid PowerShell -match [A-Za-z] under Turkish locale (letter I drops out of the range, so RABBITMQ_* never loads → guest ACCESS-REFUSED).
    foreach ($line in Get-Content -LiteralPath $envFile) {
        $trimmed = $line.Trim()
        if (!$trimmed -or $trimmed.StartsWith('#')) { continue }
        $separatorIndex = $trimmed.IndexOf('=')
        if ($separatorIndex -lt 1) { continue }
        $value = $trimmed.Substring($separatorIndex + 1).Trim().Trim('"').Trim("'")
        $settings[$trimmed.Substring(0, $separatorIndex)] = $value
    }
}

# Returns the docker/.env value for $name, or $fallback when the key is missing.
function Get-Setting($name, $fallback) {
    if ($settings.ContainsKey($name)) { return $settings[$name] }
    return $fallback
}

# True when something on this machine is listening on the TCP port.
function Test-PortListening($port) {
    $listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    return [bool]($listeners | Where-Object Port -eq $port)
}

# Finds processes named $processName whose command line contains $path (slashes normalised).
# Matching on the path keeps us from touching processes that belong to other projects.
function Find-ProjectProcess($processName, $path) {
    $normalizedPath = $path.Replace('/', '\')
    Get-CimInstance Win32_Process -Filter "Name = '$processName'" | Where-Object {
        $_.CommandLine -and $_.CommandLine.Replace('/', '\').Contains($normalizedPath)
    }
}

# Stops this project's process for one service and waits until its port is free again.
function Stop-LocalProcess($processName, $path, $port) {
    $projectProcesses = @(Find-ProjectProcess $processName $path)
    $projectProcesses | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force
        Wait-Process -Id $_.ProcessId -Timeout $stopTimeoutSeconds -ErrorAction SilentlyContinue
    }
    if ($projectProcesses.Count -and $port) {
        $deadline = (Get-Date).AddSeconds($stopTimeoutSeconds)
        while ((Test-PortListening $port) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
        if (Test-PortListening $port) { throw "Port $port did not close after stopping this project's process." }
    }
}

# Waits until a freshly started service listens on its port; fails early if the process dies.
function Wait-LocalService($process, $port, $name) {
    $deadline = (Get-Date).AddSeconds($serviceStartTimeoutSeconds)
    do {
        $process.Refresh()
        if ($process.HasExited) { throw "$name exited. See $logs/$name.error.log and $logs/$name.log" }
        if (Test-PortListening $port) { return }
        Start-Sleep -Milliseconds 250
    } while ((Get-Date) -lt $deadline)
    throw "$name did not listen on port $port. See $logs."
}

$dbPort = Get-Setting 'POSTGRES_HOST_PORT' '5432'
$dbUser = Get-Setting 'POSTGRES_USER' 'postgres'
$dbPass = Get-Setting 'POSTGRES_PASSWORD' 'mysecretpassword'

# Environment shared by every .NET service (child processes inherit it).
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:RedisConnection = 'localhost:6380'
$env:RabbitMQ__Host = 'localhost'
$env:RabbitMQ__Port = '5672'
$env:RabbitMQ__Username = Get-Setting 'RABBITMQ_DEFAULT_USER' 'guest'
$env:RabbitMQ__Password = Get-Setting 'RABBITMQ_DEFAULT_PASS' 'guest'
$env:INTERNAL_API_KEY = Get-Setting 'INTERNAL_API_KEY' 'element-internal-dev-key'
$env:PUBLIC_API_BASE = 'http://localhost:5000'
$env:PUBLIC_WEB_ORIGIN = $WebOrigin
$env:Shipment__FailQuantityGte = '0'
if ($settings.ContainsKey('JWT_SECRET')) { $env:JwtSettings__Secret = $settings['JWT_SECRET'] }

$services = @(
    @{ Name = 'identity'; Project = 'identity-service/Element.Services.Identity.API'; Assembly = 'Element.Services.Identity.API'; Port = 5001; Db = 'element_identity_db' },
    @{ Name = 'catalog'; Project = 'catalog-service/Element.Services.Element.API'; Assembly = 'Element.Services.Element.API'; Port = 5002; Db = 'element_market_db' },
    @{ Name = 'compound'; Project = 'compound-service/Element.Services.Compound.API'; Assembly = 'Element.Services.Compound.API'; Port = 5007; Db = 'element_compound_db' },
    @{ Name = 'shipment'; Project = 'shipment-service/Element.Services.Shipment.API'; Assembly = 'Element.Services.Shipment.API'; Port = 5004; Db = 'element_shipment_db' },
    @{ Name = 'notification'; Project = 'notification-service/Element.Services.Notification.API'; Assembly = 'Element.Services.Notification.API'; Port = 5006; Db = $null },
    @{ Name = 'gateway'; Project = 'gateway-service'; Assembly = 'Element.Gateway'; Port = 5000; Db = $null }
)

# Processes started (or adopted) by this run, recorded in artifacts/local/processes.json so an
# operator can find and stop them later (nothing in the repo reads that file automatically).
$processes = @()

# Merges this run's processes into artifacts/local/processes.json, replacing entries with the same name.
function Save-LocalProcesses {
    $manifest = Join-Path $logs 'processes.json'
    $previous = if (Test-Path -LiteralPath $manifest) { @(Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json) } else { @() }
    $allProcesses = @($previous | Where-Object { $_.name -notin $processes.name }) + $processes
    ConvertTo-Json -InputObject @($allProcesses) | Set-Content -LiteralPath $manifest
}

foreach ($service in $services) {
    $serviceDir = Join-Path $root $service.Project
    $serviceDll = Join-Path $serviceDir "bin/$Configuration/net10.0/$($service.Assembly).dll"

    if ($Restart) {
        Stop-LocalProcess 'dotnet.exe' $serviceDll $service.Port
    }

    # Port already taken: adopt our own running copy (if any) and leave the service alone.
    if (Test-PortListening $service.Port) {
        foreach ($item in Find-ProjectProcess 'dotnet.exe' $serviceDll) {
            $processes += @{ name = $service.Name; id = $item.ProcessId }
        }
        Save-LocalProcesses
        Write-Host "$($service.Name): port $($service.Port) already in use, left running."
        continue
    }

    if (!$NoBuild) {
        dotnet build (Join-Path $serviceDir "$($service.Assembly).csproj") -c $Configuration --nologo -v quiet -m:1 -nodeReuse:false -p:UseSharedCompilation=false
        if ($LASTEXITCODE -ne 0) { throw "Build failed: $($service.Name)" }
    }

    $env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=$dbPort;Database=$($service.Db);Username=$dbUser;Password=$dbPass"
    $startArgs = @{
        FilePath               = $dotnetHost
        ArgumentList           = @("`"$serviceDll`"", '--urls', "http://localhost:$($service.Port)")
        WorkingDirectory       = $serviceDir
        WindowStyle            = 'Hidden'
        PassThru               = $true
        RedirectStandardOutput = (Join-Path $logs "$($service.Name).log")
        RedirectStandardError  = (Join-Path $logs "$($service.Name).error.log")
    }
    $process = Start-Process @startArgs
    $processes += @{ name = $service.Name; id = $process.Id }
    Save-LocalProcesses
    Wait-LocalService $process $service.Port $service.Name
    Write-Host "$($service.Name): started on $($service.Port)."
}

# The order-service is Node.js, so it is built and started separately.
$orderDir = Join-Path $root 'order-service'
$orderEntry = Join-Path $orderDir 'dist/index.js'
if ($Restart) {
    Stop-LocalProcess 'node.exe' $orderEntry $orderPort
}
if (!(Test-PortListening $orderPort)) {
    if (!$NoBuild) {
        Push-Location $orderDir
        try {
            npm run build
            if ($LASTEXITCODE -ne 0) { throw 'Order build failed.' }
        } finally { Pop-Location }
    }
    $escapedUser = [uri]::EscapeDataString($dbUser)
    $escapedPassword = [uri]::EscapeDataString($dbPass)
    $env:PORT = "$orderPort"
    $env:DATABASE_URL = "postgres://${escapedUser}:${escapedPassword}@localhost:$dbPort/element_order_db"
    $env:REDIS_URL = 'redis://localhost:6380'
    $env:RABBITMQ_HOST = 'localhost'
    $env:RABBITMQ_USERNAME = $env:RabbitMQ__Username
    $env:RABBITMQ_PASSWORD = $env:RabbitMQ__Password
    $startArgs = @{
        FilePath               = 'node'
        ArgumentList           = "`"$orderEntry`""
        WorkingDirectory       = $orderDir
        WindowStyle            = 'Hidden'
        PassThru               = $true
        RedirectStandardOutput = (Join-Path $logs 'order.log')
        RedirectStandardError  = (Join-Path $logs 'order.error.log')
    }
    $process = Start-Process @startArgs
    $processes += @{ name = 'order'; id = $process.Id }
    Save-LocalProcesses
    Wait-LocalService $process $orderPort 'order'
    Write-Host "order: started on $orderPort."
}
if ($processes.Count) { Save-LocalProcesses }
Write-Host "Local service logs: $logs"
