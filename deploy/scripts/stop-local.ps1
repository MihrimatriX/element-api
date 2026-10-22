# Stops the Docker stacks started by the present-*.ps1 scripts. Volumes (data) are always kept.
#   (no switch)          local platform + every public project + science atlas
#   -Public / -All       only the public projects (element-dev, element-test, element-prod)
#   -Environment <name>  only that one public project
param(
    [ValidateSet('Dev', 'Test', 'Prod')]
    [string]$Environment,
    [switch]$Public,
    [switch]$All
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path

# Stops one public compose project, passing its env file when it exists so compose can resolve variables.
function Stop-PublicProject([string]$Project) {
    $environmentName = $Project.Substring('element-'.Length)
    $envFile = "docker/.env.public.$environmentName"
    $envArgs = @()
    if (Test-Path -LiteralPath $envFile) { $envArgs = @('--env-file', $envFile) }
    docker compose -p $Project @envArgs -f docker-compose.yml -f docker-compose.public.yml stop 2>$null
}

Push-Location $root
try {
    $publicProjects = @('element-dev', 'element-test', 'element-prod')
    if ($Environment) {
        $Public = $true
        $publicProjects = @("element-$($Environment.ToLowerInvariant())")
    }
    if ($All) { $Public = $true }

    if ($Public) {
        foreach ($project in $publicProjects) { Stop-PublicProject $project }
        Write-Host "Public project(s) stopped: $($publicProjects -join ', '). Volumes preserved."
        return
    }

    # Default: local platform (no public overlay), leftover public projects and the science atlas.
    $envArgs = @()
    if (Test-Path -LiteralPath 'docker/.env') { $envArgs = @('--env-file', 'docker/.env') }
    docker compose @envArgs -f docker-compose.yml stop 2>$null
    foreach ($project in $publicProjects) { Stop-PublicProject $project }
    docker compose -f docker-compose.science.yml stop 2>$null
    Write-Host 'Containers stopped. Volumes preserved. Remove public: docker compose -p element-dev --env-file docker/.env.public.dev -f docker-compose.yml -f docker-compose.public.yml down'
} finally { Pop-Location }
