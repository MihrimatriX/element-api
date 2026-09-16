# Legacy host bring-up (prefer ./present-platform.ps1 / docker compose).
param([switch]$NoBuild, [switch]$IncludePayment, [switch]$PaymentDocker, [switch]$Restart, [string]$WebOrigin = 'http://localhost:3000', [ValidateSet('Debug', 'Release', 'Science')][string]$Configuration = 'Release')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$logs = Join-Path $root 'artifacts/local'
$dotnetHost = Join-Path $root 'artifacts/dotnet/dotnet.exe'
if (!(Test-Path -LiteralPath $dotnetHost)) { $dotnetHost = (Get-Command dotnet).Source }
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$settings = @{}
$envFile = Join-Path $root 'docker/.env'
if (Test-Path -LiteralPath $envFile) {
    # ponytail: Split('=',2) — avoid PowerShell -match [A-Za-z] under Turkish locale (letter I drops out of the range, so RABBITMQ_* never loads → guest ACCESS-REFUSED).
    foreach ($line in Get-Content -LiteralPath $envFile) {
        $trim = $line.Trim()
        if (!$trim -or $trim.StartsWith('#')) { continue }
        $eq = $trim.IndexOf('=')
        if ($eq -lt 1) { continue }
        $settings[$trim.Substring(0, $eq)] = $trim.Substring($eq + 1).Trim().Trim('"').Trim("'")
    }
}
function Setting($name, $fallback) { if ($settings.ContainsKey($name)) { return $settings[$name] }; return $fallback }
function Listening($port) { return [bool]([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | Where-Object Port -eq $port) }
function Stop-LocalProcess($name, $path, $port) {
    $normalized = $path.Replace('/', '\')
    $matches = @(Get-CimInstance Win32_Process -Filter "Name = '$name'" | Where-Object {
        $_.CommandLine -and $_.CommandLine.Replace('/', '\').Contains($normalized)
    })
    $matches | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force
        Wait-Process -Id $_.ProcessId -Timeout 15 -ErrorAction SilentlyContinue
    }
    if ($matches.Count -and $port) {
        $deadline = (Get-Date).AddSeconds(15)
        while ((Listening $port) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
        if (Listening $port) { throw "Port $port did not close after stopping this project's process." }
    }
}
function Wait-LocalService($process, $port, $name) {
    $deadline = (Get-Date).AddSeconds(90)
    do {
        $process.Refresh()
        if ($process.HasExited) { throw "$name exited. See $logs/$name.error.log and $logs/$name.log" }
        if (Listening $port) { return }
        Start-Sleep -Milliseconds 250
    } while ((Get-Date) -lt $deadline)
    throw "$name did not listen on port $port. See $logs."
}
$dbPort = Setting 'POSTGRES_HOST_PORT' '5432'
$dbUser = Setting 'POSTGRES_USER' 'postgres'
$dbPass = Setting 'POSTGRES_PASSWORD' 'mysecretpassword'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:RedisConnection = 'localhost:6380'
$env:RabbitMQ__Host = 'localhost'
$env:RabbitMQ__Port = '5672'
$env:RabbitMQ__Username = Setting 'RABBITMQ_DEFAULT_USER' 'guest'
$env:RabbitMQ__Password = Setting 'RABBITMQ_DEFAULT_PASS' 'guest'
$env:INTERNAL_API_KEY = Setting 'INTERNAL_API_KEY' 'element-internal-dev-key'
$env:PUBLIC_API_BASE = 'http://localhost:5000'
$env:PUBLIC_WEB_ORIGIN = $WebOrigin
$env:Shipment__FailQuantityGte = '0'
if ($settings.ContainsKey('JWT_SECRET')) { $env:JwtSettings__Secret = $settings['JWT_SECRET'] }
$services = @(
    @{ Name='identity'; Project='identity-service/Element.Services.Identity.API'; Assembly='Element.Services.Identity.API'; Port=5001; Db='element_identity_db' },
    @{ Name='catalog'; Project='catalog-service/Element.Services.Element.API'; Assembly='Element.Services.Element.API'; Port=5002; Db='element_market_db' },
    @{ Name='compound'; Project='compound-service/Element.Services.Compound.API'; Assembly='Element.Services.Compound.API'; Port=5007; Db='element_compound_db' },
    @{ Name='shipment'; Project='shipment-service/Element.Services.Shipment.API'; Assembly='Element.Services.Shipment.API'; Port=5004; Db='element_shipment_db' },
    @{ Name='notification'; Project='notification-service/Element.Services.Notification.API'; Assembly='Element.Services.Notification.API'; Port=5006; Db=$null },
    @{ Name='gateway'; Project='gateway-service'; Assembly='Element.Gateway'; Port=5000; Db=$null }
)
$processes = @()
function Save-LocalProcesses {
    $manifest = Join-Path $logs 'processes.json'
    $previous = if (Test-Path -LiteralPath $manifest) { @(Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json) } else { @() }
    $allProcesses = @($previous | Where-Object { $_.name -notin $processes.name }) + $processes
    ConvertTo-Json -InputObject @($allProcesses) | Set-Content -LiteralPath $manifest
}
foreach ($service in $services) {
    if ($Restart) {
        $expected = Join-Path (Join-Path $root $service.Project) "bin/$Configuration/net10.0/$($service.Assembly).dll"
        Stop-LocalProcess 'dotnet.exe' $expected $service.Port
    }
    if (Listening $service.Port) {
        $expected = Join-Path (Join-Path $root $service.Project) "bin/$Configuration/net10.0/$($service.Assembly).dll"
        $owned = Get-CimInstance Win32_Process -Filter "Name = 'dotnet.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Replace('/', '\').Contains($expected.Replace('/', '\')) }
        foreach ($item in $owned) { $processes += @{ name=$service.Name; id=$item.ProcessId } }
        Save-LocalProcesses
        Write-Host "$($service.Name): port $($service.Port) already in use, left running."; continue
    }
    $dir = Join-Path $root $service.Project
    if (!$NoBuild) {
        dotnet build (Join-Path $dir "$($service.Assembly).csproj") -c $Configuration --nologo -v quiet -m:1 -nodeReuse:false -p:UseSharedCompilation=false
        if ($LASTEXITCODE -ne 0) { throw "Build failed: $($service.Name)" }
    }
    $env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=$dbPort;Database=$($service.Db);Username=$dbUser;Password=$dbPass"
    $dll = Join-Path $dir "bin/$Configuration/net10.0/$($service.Assembly).dll"
    $process = Start-Process $dotnetHost -ArgumentList @("`"$dll`"", '--urls', "http://localhost:$($service.Port)") -WorkingDirectory $dir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs "$($service.Name).log") -RedirectStandardError (Join-Path $logs "$($service.Name).error.log")
    $processes += @{ name=$service.Name; id=$process.Id }
    Save-LocalProcesses
    Wait-LocalService $process $service.Port $service.Name
    Write-Host "$($service.Name): started on $($service.Port)."
}
if ($Restart) {
    Stop-LocalProcess 'node.exe' (Join-Path $root 'order-service/dist/index.js') 5003
}
if (!(Listening 5003)) {
    $orderDir = Join-Path $root 'order-service'
    if (!$NoBuild) {
        Push-Location $orderDir
        try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'Order build failed.' } } finally { Pop-Location }
    }
    $env:PORT = '5003'
    $env:DATABASE_URL = "postgres://$([uri]::EscapeDataString($dbUser)):$([uri]::EscapeDataString($dbPass))@localhost:$dbPort/element_order_db"
    $env:REDIS_URL = 'redis://localhost:6380'
    $env:RABBITMQ_HOST = 'localhost'
    $env:RABBITMQ_USERNAME = $env:RabbitMQ__Username
    $env:RABBITMQ_PASSWORD = $env:RabbitMQ__Password
    $process = Start-Process node -ArgumentList "`"$(Join-Path $orderDir 'dist/index.js')`"" -WorkingDirectory $orderDir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'order.log') -RedirectStandardError (Join-Path $logs 'order.error.log')
    $processes += @{ name='order'; id=$process.Id }
    Save-LocalProcesses
    Wait-LocalService $process 5003 'order'
    Write-Host 'order: started on 5003.'
}
if ($PaymentDocker) {
    $containerName = 'element-payment-local'
    $existing = docker ps -a --filter "name=^/$containerName$" --format '{{.ID}}'
    if ($existing) {
        $container = (docker inspect $containerName | ConvertFrom-Json)[0]
        if ($container.Config.Labels.'elementapi.local.project' -ne $root) { throw 'Payment container name belongs to another project.' }
        if ($Restart) { docker rm -f $containerName | Out-Null; $existing = $null }
        elseif (!$container.State.Running) { docker start $containerName | Out-Null }
    }
    if (!$existing) {
        if (Listening 5005) { throw 'Port 5005 is owned by another process. Payment was not started.' }
        $paymentDir = Join-Path $root 'payment-service'
        $cacheDir = Join-Path $root 'artifacts/maven-cache'
        New-Item -ItemType Directory -Force $cacheDir | Out-Null
        if (!$NoBuild) {
            docker run --rm --cpus 2 --memory 1g --mount "type=bind,source=$paymentDir,target=/work" --mount "type=bind,source=$cacheDir,target=/root/.m2" -w /work maven:3.9.9-eclipse-temurin-21 mvn --batch-mode --no-transfer-progress package -DskipTests
            if ($LASTEXITCODE -ne 0) { throw 'Payment package failed.' }
        }
        $jarPath = Join-Path $paymentDir 'target/payment-service-1.0.0.jar'
        if (!(Test-Path -LiteralPath $jarPath)) { throw 'Payment jar missing. Run without -NoBuild.' }
        $env:RABBITMQ_USERNAME = $env:RabbitMQ__Username
        $env:RABBITMQ_PASSWORD = $env:RabbitMQ__Password
        docker run -d --name $containerName --label "elementapi.local.project=$root" --cpus 1 --memory 512m --publish '127.0.0.1:5005:5005' --mount "type=bind,source=$jarPath,target=/app/payment.jar,readonly" --env RABBITMQ_USERNAME --env RABBITMQ_PASSWORD --env INTERNAL_API_KEY --env RABBITMQ_HOST=host.docker.internal --env ORDER_SERVICE_URL=http://host.docker.internal:5003 --env SERVER_PORT=5005 maven:3.9.9-eclipse-temurin-21 java -Xmx256m -jar /app/payment.jar | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Payment container failed to start.' }
    }
    $deadline = (Get-Date).AddSeconds(90)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        try { $ready = (Invoke-RestMethod 'http://127.0.0.1:5005/health' -TimeoutSec 5).status -eq 'Healthy' } catch { }
        if ($ready) { break }
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw 'Payment readiness failed. Run docker logs element-payment-local.' }
    $processes += @{ name='payment-docker'; container=$containerName }
    Write-Host 'payment: container ready on 5005.'
}
if ($IncludePayment -and !$PaymentDocker -and $Restart) { Stop-LocalProcess 'java.exe' (Join-Path $root 'payment-service/target/payment-service-1.0.0.jar') 5005 }
if ($IncludePayment -and !$PaymentDocker -and !(Listening 5005)) {
    $java = Get-ChildItem (Join-Path $root 'artifacts/tools') -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($java) { $javaCommand = Join-Path $java.FullName 'bin/java.exe'; $env:JAVA_HOME = $java.FullName }
    else { $javaCommand = (Get-Command java -ErrorAction Stop).Source }
    if (!$NoBuild) {
        $maven = Join-Path $root 'artifacts/tools/apache-maven-3.9.9/bin/mvn.cmd'
        if (!(Test-Path -LiteralPath $maven)) { $maven = (Get-Command mvn -ErrorAction Stop).Source }
        & $maven -f (Join-Path $root 'payment-service/pom.xml') -q clean package
        if ($LASTEXITCODE -ne 0) { throw 'Payment build failed.' }
    }
    $env:RABBITMQ_HOST = 'localhost'
    $env:RABBITMQ_USERNAME = $env:RabbitMQ__Username
    $env:RABBITMQ_PASSWORD = $env:RabbitMQ__Password
    $env:ORDER_SERVICE_URL = 'http://localhost:5003'
    $env:SERVER_PORT = '5005'
    $process = Start-Process $javaCommand -ArgumentList @('-Xmx256m', '-jar', "`"$(Join-Path $root 'payment-service/target/payment-service-1.0.0.jar')`"") -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'payment.log') -RedirectStandardError (Join-Path $logs 'payment.error.log')
    $processes += @{ name='payment'; id=$process.Id }
    Save-LocalProcesses
    Wait-LocalService $process 5005 'payment'
    Write-Host 'payment: started on 5005.'
}
if ($processes.Count) { Save-LocalProcesses }
Write-Host "Local service logs: $logs"
