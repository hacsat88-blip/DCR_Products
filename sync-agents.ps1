<#
.SYNOPSIS
    Legacy agent sync shim

.DESCRIPTION
    Backward-compatible entrypoint retained for existing habits and external references.
    The canonical path is now deploy.ps1 -Target agents.

.PARAMETER RepoRoot
    Repository root that contains deploy.ps1.

.PARAMETER DryRun
    Show what would be synced without writing files.

.PARAMETER Check
    Run drift check instead of syncing.
#>

param(
    [string]$RepoRoot = $PSScriptRoot,
    [switch]$DryRun,
    [switch]$Check
)

$ErrorActionPreference = 'Stop'

$deployScript = Join-Path $RepoRoot 'deploy.ps1'
if (-not (Test-Path $deployScript)) {
    throw "deploy.ps1 not found under RepoRoot: $RepoRoot"
}

Write-Host "sync-agents.ps1 is legacy. Delegating to deploy.ps1 -Target agents." -ForegroundColor Yellow
& $deployScript -Target agents -DryRun:$DryRun -Check:$Check
