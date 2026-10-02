# Shortcut for deploy/scripts/test-all.ps1 with the Review configuration.
param(
    [switch]$Integration,
    [switch]$Live,
    [switch]$Browser
)
$ErrorActionPreference = 'Stop'
$testAllArgs = @('-Configuration', 'Review')
if ($Integration) { $testAllArgs += '-Integration' }
if ($Live) { $testAllArgs += '-Live' }
if ($Browser) { $testAllArgs += '-Browser' }
& "$PSScriptRoot/../deploy/scripts/test-all.ps1" @testAllArgs
