param(
    [ValidateSet('Dev', 'Test', 'Prod')]
    [string]$Environment,
    [switch]$Public,
    [switch]$All
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $root
try {
    $publicProjects = @('element-dev', 'element-test', 'element-prod')
    if ($Environment) {
        $Public = $true
        $publicProjects = @("element-$($Environment.ToLowerInvariant())")
    }
    if ($All) { $Public = $true }

    if ($Public -or $All -or $Environment) {
        foreach ($project in $publicProjects) {
            $envFile = "docker/.env.public.$($project.Substring('element-'.Length))"
            $envArgs = @()
            if (Test-Path -LiteralPath $envFile) { $envArgs = @('--env-file', $envFile) }
            docker compose -p $project @envArgs -f docker-compose.yml -f docker-compose.public.yml stop 2>$null
        }
        Write-Host "Public project(s) stopped: $($publicProjects -join ', '). Volumes preserved."
    } else {
        $envArgs = @()
        if (Test-Path -LiteralPath 'docker/.env') { $envArgs = @('--env-file', 'docker/.env') }
        # Local platform (no public overlay) + leftover public + science.
        docker compose @envArgs -f docker-compose.yml stop 2>$null
        foreach ($project in $publicProjects) {
            $envFile = "docker/.env.public.$($project.Substring('element-'.Length))"
            $pEnv = @()
            if (Test-Path -LiteralPath $envFile) { $pEnv = @('--env-file', $envFile) }
            docker compose -p $project @pEnv -f docker-compose.yml -f docker-compose.public.yml stop 2>$null
        }
        docker compose -f docker-compose.science.yml stop 2>$null
        Write-Host 'Containers stopped. Volumes preserved. Remove public: docker compose -p element-dev --env-file docker/.env.public.dev -f docker-compose.yml -f docker-compose.public.yml down'
    }
} finally { Pop-Location }
