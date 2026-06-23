param(
    [ValidateSet("all", "vscode", "claude", "codex", "cursor", "agents")]
    [string]$Target = "all",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$ManifestRoot = Join-Path $RepoRoot ".ai\distribution\manifests"

Write-Host ""
Write-Host "=== Unified Deployment Orchestrator ===" -ForegroundColor Cyan
Write-Host ""

$defaultAdapters = @("vscode", "claude", "codex", "cursor", "agents")
$adapterManifestIds = @{
    vscode = "vscode-copilot"
    claude = "claude-code"
    codex = "codex"
    cursor = "cursor"
    agents = "codex"
}
$allAdapters = $defaultAdapters
$requestedAdapters = @(
    if ($Target -eq "all") {
        $defaultAdapters
    }
    else {
        $allAdapters | Where-Object { $Target -eq $_ }
    }
)
$total = $requestedAdapters.Count
$count = 0
$missingAdapters = @()

foreach ($adapter in $requestedAdapters) {
    $count++
    Write-Host "[$count/$total] Running $adapter adapter..." -ForegroundColor Yellow

    if ($adapterManifestIds.ContainsKey($adapter)) {
        $manifestPath = Join-Path $ManifestRoot "$($adapterManifestIds[$adapter]).json"
        if (-not (Test-Path -LiteralPath $manifestPath)) {
            Write-Error "Control-plane manifest not found for adapter '$adapter': $manifestPath"
            continue
        }
    }

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
