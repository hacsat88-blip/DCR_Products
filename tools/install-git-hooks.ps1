#Requires -Version 5.1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$hooksPath = Join-Path $repoRoot ".githooks"

if (-not (Test-Path -LiteralPath $hooksPath)) {
    throw "Hooks directory not found: $hooksPath"
}

git config core.hooksPath .githooks
Write-Host "[OK] Git hooks enabled: core.hooksPath=.githooks" -ForegroundColor Green
