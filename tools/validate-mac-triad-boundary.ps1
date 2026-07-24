#Requires -Version 5.1
<#
.SYNOPSIS
  Validate that the repository exposes only the Mac Codex / Claude Code / Cursor triad.
#>

param(
    [string]$RepoRoot = (Join-Path $PSScriptRoot "..")
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$failures = [System.Collections.Generic.List[string]]::new()

$retiredPaths = @(
    "Product",
    ".dcr",
    ".devin",
    ".windsurf",
    ".vscode",
    ".github/copilot-instructions.md",
    "reports",
    "docs/snapshots",
    "docs/superpowers",
    "templates/product",
    ".ai/adapters/copilot-cli",
    ".ai/adapters/vscode-copilot",
    "tools/adapters/vscode.ps1",
    "init-project.ps1",
    "sync-agents.ps1",
    "take-screenshot.js",
    "take_screenshot.py",
    "DESIGN.md",
    "docs/token-budget-baseline.json"
)

foreach ($relativePath in $retiredPaths) {
    if (Test-Path -LiteralPath (Join-Path $resolvedRoot $relativePath)) {
        $failures.Add("retired surface exists: $relativePath")
    }
}

$scanPaths = @(
    (Join-Path $resolvedRoot ".ai/core"),
    (Join-Path $resolvedRoot ".ai/routing"),
    (Join-Path $resolvedRoot ".ai/adapters"),
    (Join-Path $resolvedRoot ".ai/catalog"),
    (Join-Path $resolvedRoot "docs/dcr"),
    (Join-Path $resolvedRoot "CONTRIBUTING.md")
)

$activeFiles = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
foreach ($scanPath in $scanPaths) {
    if (-not (Test-Path -LiteralPath $scanPath)) { continue }
    $item = Get-Item -LiteralPath $scanPath -Force
    if ($item.PSIsContainer) {
        foreach ($file in Get-ChildItem -LiteralPath $item.FullName -Force -Recurse -File -ErrorAction SilentlyContinue) {
            $relative = $file.FullName.Substring($resolvedRoot.Length).TrimStart([char[]]@('\', '/')) -replace '\\', '/'
            if ($relative -match '(^|/)archive(/|$)') { continue }
            if ($file.Extension -notin @('.md', '.yaml', '.yml', '.ps1')) { continue }
            $activeFiles.Add($file)
        }
    }
    else {
        $activeFiles.Add($item)
    }
}

$retiredReferences = @(
    ".github/copilot-instructions.md",
    ".ai/adapters/copilot-cli",
    ".ai/adapters/vscode-copilot",
    "VS Code Copilot",
    "Copilot CLI",
    "GEMINI.local.md",
    "gemini-cli",
    ".dcr/config.json",
    "Product/README.md",
    "templates/product"
)

foreach ($file in $activeFiles) {
    $relative = $file.FullName.Substring($resolvedRoot.Length).TrimStart([char[]]@('\', '/')) -replace '\\', '/'
    foreach ($reference in $retiredReferences) {
        foreach ($match in Select-String -LiteralPath $file.FullName -SimpleMatch -Pattern $reference -ErrorAction SilentlyContinue) {
            $failures.Add("retired reference in " + $relative + ":" + $match.LineNumber + ": " + $reference)
        }
    }
}

Write-Host "== Mac Triad Boundary Validation ==" -ForegroundColor Cyan
Write-Host "Active files scanned: $($activeFiles.Count)"

if ($failures.Count -gt 0) {
    Write-Host "FAILURES:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "  - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "RESULT: passed" -ForegroundColor Green
