param(
    [ValidateSet('Dev', 'Test', 'Prod')]
    [string]$Environment,
    [switch]$All,
    [switch]$NoBuild,
    [switch]$Server
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path

# Local HTTP ports (side-by-side). Server Prod uses 80/443 + real hostname - edit .env.public.prod.
$script:PublicEnvMatrix = @(
    [pscustomobject]@{ Name = 'Dev';  Port = 8080; EnvFile = 'docker/.env.public.dev';  Example = 'docker/.env.public.dev.example' }
    [pscustomobject]@{ Name = 'Test'; Port = 8081; EnvFile = 'docker/.env.public.test'; Example = 'docker/.env.public.test.example' }
    [pscustomobject]@{ Name = 'Prod'; Port = 8082; EnvFile = 'docker/.env.public.prod'; Example = 'docker/.env.public.prod.example' }
)

function Assert-PublicEnvMatrix {
    $ports = $script:PublicEnvMatrix | ForEach-Object { $_.Port }
    $unique = $ports | Select-Object -Unique
    if ($unique.Count -ne $ports.Count) {
        throw "public env HTTP ports collide: $($ports -join ', ')"
    }
    $projects = $script:PublicEnvMatrix | ForEach-Object { "element-$($_.Name.ToLowerInvariant())" }
    if (($projects | Select-Object -Unique).Count -ne $projects.Count) {
        throw 'public env compose project names collide'
    }
}

function Ensure-EnvFile([string]$EnvFile, [string]$Example) {
    if (Test-Path -LiteralPath $EnvFile) { return }
    if (!(Test-Path -LiteralPath $Example)) { throw "Missing example env: $Example" }
    Copy-Item -LiteralPath $Example -Destination $EnvFile
    Write-Host "Created $EnvFile from $Example - replace replace-with-... secrets before real production use."
}

function Read-DotEnv([string]$EnvFile) {
    $map = @{}
    Get-Content -LiteralPath $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith('#')) { return }
        $eq = $line.IndexOf('=')
        if ($eq -lt 1) { return }
        $map[$line.Substring(0, $eq).Trim()] = $line.Substring($eq + 1).Trim()
    }
    return $map
}

function Assert-ServerProdEnv([string]$EnvFile) {
    if (!(Test-Path -LiteralPath $EnvFile)) {
        throw "Missing $EnvFile. Copy docker/.env.public.prod.example and set real secrets + CADDY_SITE."
    }
    $vars = Read-DotEnv $EnvFile
    $site = $vars['CADDY_SITE']
    if ([string]::IsNullOrWhiteSpace($site)) {
        throw @"
CADDY_SITE is missing in $EnvFile.
Set your public hostname (no scheme), e.g. CADDY_SITE=elements-api.ahmetfuzunkaya.com
See docs/PUBLIC-HOST.md (DNS A/AAAA must point here first).
"@
    }
    if ($site -eq 'http://:80' -or $site -match '^https?://') {
        throw @"
CADDY_SITE=$site looks like local smoke, not a real host.
For -Server set a hostname only, e.g. CADDY_SITE=elements-api.ahmetfuzunkaya.com
Keep CADDY_HTTP_PORT=80 and CADDY_HTTPS_PORT=443. Docs: docs/PUBLIC-HOST.md
"@
    }
    $httpPort = $vars['CADDY_HTTP_PORT']
    $httpsPort = $vars['CADDY_HTTPS_PORT']
    if ($httpPort -ne '80' -or $httpsPort -ne '443') {
        throw @"
-Server expects CADDY_HTTP_PORT=80 and CADDY_HTTPS_PORT=443 (got HTTP=$httpPort HTTPS=$httpsPort).
Local smoke uses 8082/8445; edit $EnvFile for the real host.
"@
    }
    foreach ($key in @('JWT_SECRET', 'INTERNAL_API_KEY')) {
        $val = $vars[$key]
        if ([string]::IsNullOrWhiteSpace($val) -or $val -match 'replace-with' -or $val -match 'ChangeMe' -or $val.Length -lt 32) {
            throw "$key in $EnvFile must be a real secret (>=32 chars, no ChangeMe / replace-with). Generate: openssl rand -hex 32"
        }
    }
}

function Start-PublicEnv([string]$Name, [string]$EnvFile, [string]$Example) {
    Ensure-EnvFile -EnvFile $EnvFile -Example $Example
    $project = "element-$($Name.ToLowerInvariant())"
    $composeArgs = @(
        '-p', $project,
        '--env-file', $EnvFile,
        '-f', 'docker-compose.yml',
        '-f', 'docker-compose.public.yml',
        'up', '-d'
    )
    if (!$NoBuild) { $composeArgs += '--build' }
    Write-Host "Starting public $Name (project $project, env $EnvFile)..."
    docker compose @composeArgs
    if ($LASTEXITCODE -ne 0) { throw "Public $Name startup failed." }
}

Push-Location $root
try {
    Assert-PublicEnvMatrix

    if ($Server) {
        if ($All) { throw '-Server cannot be combined with -All (server is one Prod host).' }
        if ($Environment -and $Environment -ne 'Prod') { throw '-Server only applies to Prod.' }
        $Environment = 'Prod'
        Ensure-EnvFile -EnvFile 'docker/.env.public.prod' -Example 'docker/.env.public.prod.example'
        Assert-ServerProdEnv -EnvFile 'docker/.env.public.prod'
        Write-Host 'Server mode: CADDY_SITE + :80/:443 + secrets look set. Starting Prod…'
    }

    if ($All) {
        foreach ($row in $script:PublicEnvMatrix) {
            Start-PublicEnv -Name $row.Name -EnvFile $row.EnvFile -Example $row.Example
        }
        Write-Host ''
        Write-Host 'All public envs (local HTTP):'
        Write-Host '  Dev  http://localhost:8080'
        Write-Host '  Test http://localhost:8081'
        Write-Host '  Prod http://localhost:8082'
        Write-Host 'Stop: ./deploy/scripts/stop-local.ps1 -Public'
        return
    }

    if (-not $Environment) { $Environment = 'Dev' }
    $row = $script:PublicEnvMatrix | Where-Object { $_.Name -eq $Environment } | Select-Object -First 1
    if (-not $row) { throw "Unknown environment: $Environment" }

    Start-PublicEnv -Name $row.Name -EnvFile $row.EnvFile -Example $row.Example
    if ($Server) {
        $vars = Read-DotEnv $row.EnvFile
        $site = $vars['CADDY_SITE']
        Write-Host "Public Prod (server): https://$site/  Stop: ./deploy/scripts/stop-local.ps1 -Public -Environment Prod"
    } else {
        $stopHint = "./deploy/scripts/stop-local.ps1 -Public -Environment $Environment"
        Write-Host "Public $Environment : http://localhost:$($row.Port) (Caddy). Stop: $stopHint"
    }
} finally { Pop-Location }
