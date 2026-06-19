#Requires -Version 5.1
<#
.SYNOPSIS
  Validate the DCR shared book and thin environment capability declarations.

.DESCRIPTION
  Ensures .ai/core and .ai/routing contain the shared runtime chapters and that
  .ai/adapters/*/kernel.md files do not redefine shared behavior.
  (Updated for the concept-zone restructure: now checks core/routing chapters and adapter kernels.)
#>

param(
    [string]$RepoRoot = ".",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path $RepoRoot).Path
$CoreRoot     = Join-Path $resolvedRoot ".ai\core"
$RoutingRoot  = Join-Path $resolvedRoot ".ai\routing"
$AdapterRoot  = Join-Path $resolvedRoot ".ai\adapters"
$KernelFile   = Join-Path $resolvedRoot ".ai\core\kernel.md"

$passed = 0
$failed = 0
$errors = @()

function Write-Ok {
    param([string]$Message)
    if ($Verbose) { Write-Host "[OK]   $Message" -ForegroundColor Green }
    $script:passed++
}

function Write-Fail {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    $script:failed++
    $script:errors += $Message
}

Write-Host "== Validate: shared book contract ==" -ForegroundColor Cyan
Write-Host ""

# --- Check core chapter files (.ai/core) ---
$requiredCoreFiles = @(
    @{ Rel = "core\README.md";         Fallback = "core\kernel.md" },
    @{ Rel = "core\runtime.md";        Fallback = $null },
    @{ Rel = "routing\router.md";      Fallback = $null },
    @{ Rel = "routing\gates.md";       Fallback = $null },
    @{ Rel = "core\permissions.md";    Fallback = $null },
    @{ Rel = "core\tool-contract.md";  Fallback = $null }
)

foreach ($entry in $requiredCoreFiles) {
    $rel  = $entry.Rel
    $path = Join-Path $resolvedRoot (".ai\" + $rel)
    # Use fallback if primary is a README that doesn't exist
    if (-not (Test-Path $path) -and $entry.Fallback) {
        $rel  = $entry.Fallback
        $path = Join-Path $resolvedRoot (".ai\" + $rel)
    }
    if (-not (Test-Path $path)) {
        Write-Fail ".ai/$($rel.Replace('\','/')) — missing"
        continue
    }

    $content = Get-Content -Path $path -Raw -Encoding utf8
    if ($content -notmatch '(?m)^# .+') {
        Write-Fail ".ai/$($rel.Replace('\','/')) — H1 missing"
    }
    else {
        Write-Ok ".ai/$($rel.Replace('\','/')) — H1 found"
    }
}

# --- runtime.md section check (now in .ai/core/runtime.md) ---
$runtimePath     = Join-Path $CoreRoot "runtime.md"
$toolContractPath = Join-Path $CoreRoot "tool-contract.md"

if (Test-Path $runtimePath) {
    $runtime = Get-Content -Path $runtimePath -Raw -Encoding utf8
    foreach ($required in @("Freshness And External Confirmation", "Reasoning Escalation", "Trigger Parsing", "Execution Modes", "Tool Routing")) {
        if ($runtime -notmatch [regex]::Escape($required)) {
            Write-Fail ".ai/core/runtime.md — required section missing: $required"
        }
        else {
            Write-Ok ".ai/core/runtime.md — required section present: $required"
        }
    }
}

if (Test-Path $toolContractPath) {
    $toolContract = Get-Content -Path $toolContractPath -Raw -Encoding utf8
    foreach ($operation in @("Read", "Search", "Edit", "Run", "Test", "Fetch", "Browse", "Delegate", "Commit", "Deploy")) {
        if ($toolContract -notmatch "\|\s*``?$operation``?\s*\|") {
            Write-Fail ".ai/core/tool-contract.md — operation missing: $operation"
        }
        else {
            Write-Ok ".ai/core/tool-contract.md — operation present: $operation"
        }
    }
}

# --- adapter kernel thin-environment check (.ai/adapters) ---
if (Test-Path $AdapterRoot) {
    $adapterKernelFiles = Get-ChildItem -Path $AdapterRoot -File -Filter "kernel.md" -Recurse | Sort-Object FullName
    $bannedPatterns = @(
        '(?im)^##\s+Signal protocol\b',
        '(?im)^##\s+Response behavior\b',
        '(?im)^##\s+Freshness and external confirmation\b',
        '(?im)^##\s+Reasoning escalation\b',
        '(?im)^##\s+Triggers\b',
        '(?im)^##\s+Execution Modes\b',
        '(?im)^##\s+Routing priority\b',
        '(?im)^##\s+Tool routing priority\b',
        '(?im)^##\s+Pipeline gate chain\b',
        '(?im)^##\s+Permission model\b',
        '(?im)^##\s+Safety boundaries\b',
        # ASCII-only pattern for PS 5.1 without BOM (matches 判断の優先順位)
        '(?m)^判断の優先順位'
    )

    foreach ($file in $adapterKernelFiles) {
        $relative = $file.FullName.Replace($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, "")
        $content = Get-Content -Path $file.FullName -Raw -Encoding utf8

        if ($content -notmatch '\.\./\.\./core/runtime\.md') {
            Write-Fail "$relative — missing shared core runtime reference"
        }
        else {
            Write-Ok "$relative — shared core runtime reference found"
        }

        if ($content -notmatch 'tool-contract\.md') {
            Write-Fail "$relative — missing tool-contract reference"
        }
        else {
            Write-Ok "$relative — tool-contract reference found"
        }

        foreach ($pattern in $bannedPatterns) {
            if ($content -match $pattern) {
                Write-Fail "$relative — appears to redefine shared behavior: $pattern"
            }
            else {
                Write-Ok "$relative — no redefinition for $pattern"
            }
        }
    }
}

# --- kernel.md compat check (.ai/core) ---
foreach ($compatFile in @($KernelFile)) {
    if (-not (Test-Path $compatFile)) {
        Write-Fail "$($compatFile.Replace($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, '')) — missing"
        continue
    }

    $content = Get-Content -Path $compatFile -Raw -Encoding utf8
    if ($content -notmatch '\.ai/core|core/') {
        Write-Fail "$($compatFile.Replace($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, '')) — missing .ai/core reference"
    }
    else {
        Write-Ok "$($compatFile.Replace($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, '')) — .ai/core reference found"
    }
}

Write-Host ""
Write-Host "=========================================="
Write-Host "RESULT: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "FAILURES:" -ForegroundColor Red
    foreach ($errorMessage in $errors) {
        Write-Host "  - $errorMessage" -ForegroundColor Red
    }
}
Write-Host "=========================================="

if ($failed -gt 0) { exit 1 } else { exit 0 }
