param(
    [switch]$Integration,
    [switch]$Live,
    [switch]$Browser
)
$ErrorActionPreference = 'Stop'
$args = @('-Configuration', 'Review')
if ($Integration) { $args += '-Integration' }
if ($Live) { $args += '-Live' }
if ($Browser) { $args += '-Browser' }
& "$PSScriptRoot/../deploy/scripts/test-all.ps1" @args
