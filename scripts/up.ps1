# Shortcut: builds and starts the full platform with docker/.env (docker/.env must already exist).
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
docker compose --env-file docker/.env up -d --build
