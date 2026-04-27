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
$requestedAdapters = @(
    $adapters | Where-Object { $Target -eq "all" -or $Target -eq $_ }
)
$total = $requestedAdapters.Count
$count = 0
$missingAdapters = @()

foreach ($adapter in $requestedAdapters) {
    $count++
    Write-Host "[$count/$total] Running $adapter adapter..." -ForegroundColor Yellow

    $adapterScript = Join-Path $PSScriptRoot "adapters\$adapter.ps1"
    if (-not (Test-Path $adapterScript)) {
        $missingAdapters += $adapter
        Write-Error "Adapter not found: $adapterScript"
        continue
    }

    if ($DryRun) {
        Write-Host "  [DRY RUN] Would run: .\adapters\$adapter.ps1" -ForegroundColor DarkYellow
    }
    else {
        & $adapterScript -RepoRoot $RepoRoot
    }
}

if ($missingAdapters.Count -gt 0) {
    throw "Missing deployment adapter script(s): $($missingAdapters -join ', ')"
}

Write-Host ""
Write-Host "[OK] Deployment complete!" -ForegroundColor Green
Write-Host ""
