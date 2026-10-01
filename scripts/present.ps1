# Shortcut for deploy/scripts/present-platform.ps1; every argument (e.g. -NoBuild) is passed through.
$ErrorActionPreference = 'Stop'
& "$PSScriptRoot/../deploy/scripts/present-platform.ps1" @args
