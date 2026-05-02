#Requires -Version 5.1
<#
.SYNOPSIS
  Validate the DCR shared book and thin environment capability declarations.

.DESCRIPTION
  Ensures .ai/book contains the shared runtime chapters and that
  .ai/environments/*/kernel.md files do not redefine shared behavior.
#>

param(
    [string]$RepoRoot = ".",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path $RepoRoot).Path
$BookRoot = Join-Path $resolvedRoot ".ai\book"
$EnvironmentRoot = Join-Path $resolvedRoot ".ai\environments"
$KernelBase = Join-Path $resolvedRoot ".ai\kernel\_base.md"
$RuntimeKernel = Join-Path $resolvedRoot ".ai\kernel\dcr-kernel.md"

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

$requiredBookFiles = @(
    "README.md",
    "runtime.md",
    "routing.md",
    "gates.md",
    "permissions.md",
    "tool-contract.md"
)

foreach ($name in $requiredBookFiles) {
    $path = Join-Path $BookRoot $name
    if (-not (Test-Path $path)) {
        Write-Fail ".ai/book/$name — missing"
        continue
    }

    $content = Get-Content -Path $path -Raw -Encoding utf8
    if ($content -notmatch '(?m)^# .+') {
        Write-Fail ".ai/book/$name — H1 missing"
    }
    else {
        Write-Ok ".ai/book/$name — H1 found"
    }
}

$runtimePath = Join-Path $BookRoot "runtime.md"
$toolContractPath = Join-Path $BookRoot "tool-contract.md"

if (Test-Path $runtimePath) {
    $runtime = Get-Content -Path $runtimePath -Raw -Encoding utf8
    foreach ($required in @("Freshness And External Confirmation", "Reasoning Escalation", "Trigger Parsing", "Execution Modes", "Tool Routing")) {
        if ($runtime -notmatch [regex]::Escape($required)) {
            Write-Fail ".ai/book/runtime.md — required section missing: $required"
        }
        else {
            Write-Ok ".ai/book/runtime.md — required section present: $required"
        }
    }
}

if (Test-Path $toolContractPath) {
    $toolContract = Get-Content -Path $toolContractPath -Raw -Encoding utf8
    foreach ($operation in @("Read", "Search", "Edit", "Run", "Test", "Fetch", "Browse", "Delegate", "Commit", "Deploy")) {
        if ($toolContract -notmatch "\|\s*``?$operation``?\s*\|") {
            Write-Fail ".ai/book/tool-contract.md — operation missing: $operation"
        }
        else {
            Write-Ok ".ai/book/tool-contract.md — operation present: $operation"
        }
    }
}

if (Test-Path $EnvironmentRoot) {
    $envKernelFiles = Get-ChildItem -Path $EnvironmentRoot -File -Filter "kernel.md" -Recurse | Sort-Object FullName
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
        '(?m)^\u5224\u65AD\u306E\u512A\u5148\u9806\u4F4D'
    )

    foreach ($file in $envKernelFiles) {
        $relative = $file.FullName.Replace($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, "")
        $content = Get-Content -Path $file.FullName -Raw -Encoding utf8

        if ($content -notmatch '\.\./\.\./book/runtime\.md') {
            Write-Fail "$relative — missing shared book runtime reference"
        }
        else {
            Write-Ok "$relative — shared book runtime reference found"
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

foreach ($compatFile in @($KernelBase, $RuntimeKernel)) {
    if (-not (Test-Path $compatFile)) {
        Write-Fail "$($compatFile.Replace($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, '')) — missing"
        continue
    }

    $content = Get-Content -Path $compatFile -Raw -Encoding utf8
    if ($content -notmatch '\.ai/book|book/') {
        Write-Fail "$($compatFile.Replace($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, '')) — missing .ai/book reference"
    }
    else {
        Write-Ok "$($compatFile.Replace($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, '')) — .ai/book reference found"
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

