#Requires -Version 5.1
<#
.SYNOPSIS
  Validate the Mac triad adapter manifest against deploy implementation paths.
#>

param(
    [string]$RepoRoot = (Join-Path $PSScriptRoot "..")
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$manifestPath = Join-Path $resolvedRoot ".ai/adapters/manifest.yaml"
$failures = [System.Collections.Generic.List[string]]::new()

if (-not (Test-Path -LiteralPath $manifestPath)) {
    Write-Host "[FAIL] adapter manifest not found: $manifestPath" -ForegroundColor Red
    exit 1
}

$manifestLines = @(Get-Content -LiteralPath $manifestPath -Encoding utf8)

function Get-ManifestSectionItems {
    param(
        [string[]]$Lines,
        [string]$Section
    )

    $items = [System.Collections.Generic.List[hashtable]]::new()
    $inSection = $false
    $currentItem = $null

    foreach ($line in $Lines) {
        if ($line -match '^([a-zA-Z][a-zA-Z0-9_-]*):\s*$') {
            if ($inSection) { break }
            if ($Matches[1] -eq $Section) { $inSection = $true }
            continue
        }
        if (-not $inSection) { continue }

        if ($line -match '^\s{2}-\s+([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*?)\s*$') {
            $currentItem = @{}
            $currentItem[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
            $items.Add($currentItem)
            continue
        }
        if ($null -ne $currentItem -and $line -match '^\s{4}([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*?)\s*$') {
            $currentItem[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
        }
    }

    return $items.ToArray()
}

function Get-QuotedValues {
    param([string]$Text)

    $values = @()
    foreach ($match in [regex]::Matches($Text, '"([^"]+)"')) {
        $values += $match.Groups[1].Value
    }
    return $values
}

function Assert-ExactSet {
    param(
        [string[]]$Actual,
        [string[]]$Expected,
        [string]$Label
    )

    $actualSorted = @($Actual | Sort-Object -Unique)
    $expectedSorted = @($Expected | Sort-Object -Unique)
    if (($actualSorted -join "|") -cne ($expectedSorted -join "|")) {
        $failures.Add($Label + " mismatch: actual=[" + ($actualSorted -join ", ") + "] expected=[" + ($expectedSorted -join ", ") + "]")
    }
}

$entrypoints = @(Get-ManifestSectionItems -Lines $manifestLines -Section "entrypoints")
$expectedEntrypoints = @(
    @{ tool = "claude-code"; out = "CLAUDE.md"; adapter = ".ai/adapters/claude-code/kernel.md" },
    @{ tool = "codex"; out = "AGENTS.md"; adapter = ".ai/adapters/codex/kernel.md" },
    @{ tool = "cursor"; out = ".cursor/rules/dcr-kernel.mdc"; adapter = ".ai/adapters/cursor/kernel.md" }
)

Assert-ExactSet -Actual @($entrypoints | ForEach-Object { $_["tool"] }) -Expected @($expectedEntrypoints | ForEach-Object { $_.tool }) -Label "manifest entrypoint tools"

foreach ($expected in $expectedEntrypoints) {
    $matches = @($entrypoints | Where-Object { $_["tool"] -eq $expected.tool })
    if ($matches.Count -ne 1) {
        $failures.Add("manifest must contain exactly one entrypoint for " + $expected.tool)
        continue
    }
    $actual = $matches[0]
    foreach ($field in @("out", "adapter")) {
        if ($actual[$field] -cne $expected[$field]) {
            $failures.Add("manifest " + $expected.tool + " " + $field + " mismatch: " + $actual[$field])
        }
        elseif (-not (Test-Path -LiteralPath (Join-Path $resolvedRoot $actual[$field]))) {
            $failures.Add("manifest " + $expected.tool + " " + $field + " path missing: " + $actual[$field])
        }
    }
}

$mirrors = @(Get-ManifestSectionItems -Lines $manifestLines -Section "mirrors")
$expectedMirrors = @(
    @{ source = ".ai/catalog/agents-source"; out = ".claude/agents"; generated = "true" },
    @{ source = ".ai/catalog/agents-source"; out = ".codex/agents"; generated = "true" }
)

Assert-ExactSet -Actual @($mirrors | ForEach-Object { $_["out"] }) -Expected @($expectedMirrors | ForEach-Object { $_.out }) -Label "manifest mirror outputs"

foreach ($expected in $expectedMirrors) {
    $matches = @($mirrors | Where-Object { $_["out"] -eq $expected.out })
    if ($matches.Count -ne 1) {
        $failures.Add("manifest must contain exactly one mirror for " + $expected.out)
        continue
    }
    $actual = $matches[0]
    foreach ($field in @("source", "generated")) {
        if ($actual[$field] -cne $expected[$field]) {
            $failures.Add("manifest mirror " + $expected.out + " " + $field + " mismatch: " + $actual[$field])
        }
    }
    foreach ($field in @("source", "out")) {
        if (-not (Test-Path -LiteralPath (Join-Path $resolvedRoot $actual[$field]))) {
            $failures.Add("manifest mirror path missing: " + $actual[$field])
        }
    }
}

$deployText = Get-Content -LiteralPath (Join-Path $resolvedRoot "deploy.ps1") -Raw -Encoding utf8
$deployAllText = Get-Content -LiteralPath (Join-Path $resolvedRoot "tools/deploy-all.ps1") -Raw -Encoding utf8
$expectedTargets = @("all", "codex", "claude", "cursor", "agents")

$deployValidateSet = [regex]::Match($deployText, '\[ValidateSet\(([^)]+)\)\]')
if (-not $deployValidateSet.Success) {
    $failures.Add("deploy.ps1 target ValidateSet not found")
}
else {
    Assert-ExactSet -Actual (Get-QuotedValues -Text $deployValidateSet.Groups[1].Value) -Expected $expectedTargets -Label "deploy.ps1 targets"
}

$deployAllValidateSet = [regex]::Match($deployAllText, '\[ValidateSet\(([^)]+)\)\]')
if (-not $deployAllValidateSet.Success) {
    $failures.Add("tools/deploy-all.ps1 target ValidateSet not found")
}
else {
    Assert-ExactSet -Actual (Get-QuotedValues -Text $deployAllValidateSet.Groups[1].Value) -Expected $expectedTargets -Label "deploy-all targets"
}

$defaultAdaptersMatch = [regex]::Match($deployAllText, '\$defaultAdapters\s*=\s*@\(([^)]+)\)')
if (-not $defaultAdaptersMatch.Success) {
    $failures.Add("tools/deploy-all.ps1 defaultAdapters not found")
}
else {
    Assert-ExactSet -Actual (Get-QuotedValues -Text $defaultAdaptersMatch.Groups[1].Value) -Expected @("codex", "claude", "cursor", "agents") -Label "deploy-all default adapters"
}

Write-Host "== Adapter Manifest Validation ==" -ForegroundColor Cyan
Write-Host "Entrypoints: $($entrypoints.Count)"
Write-Host "Mirrors: $($mirrors.Count)"

if ($failures.Count -gt 0) {
    Write-Host "FAILURES:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "  - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "RESULT: passed" -ForegroundColor Green
