param(
    [ValidateSet("all", "vscode", "cursor", "claude", "codex")]
    [string]$Target = "all",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "=== Unified Deployment Orchestrator ===" -ForegroundColor Cyan
Write-Host ""

$adapters = @("vscode", "cursor", "claude", "codex")
$count = 0

foreach ($adapter in $adapters) {
    if ($Target -ne "all" -and $Target -ne $adapter) { continue }
    
    $count++
    Write-Host "[$count/4] Running $adapter adapter..." -ForegroundColor Yellow
    
    $adapterScript = Join-Path $PSScriptRoot "adapters\$adapter.ps1"
    if (-not (Test-Path $adapterScript)) {
        Write-Warning "  Adapter not found: $adapterScript"
        continue
    }
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would run: .\adapters\$adapter.ps1" -ForegroundColor DarkYellow
    } else {
        & $adapterScript -RepoRoot $RepoRoot
    }
}

Write-Host ""
Write-Host "✓ Deployment complete!" -ForegroundColor Green
Write-Host ""
