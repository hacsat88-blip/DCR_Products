#Requires -Version 5.1
<#
.SYNOPSIS
  Add missing capability metadata blocks to active DCR skills.

.DESCRIPTION
  This is an idempotent source-of-truth normalizer. It does not change
  deprecated skills. Existing hand-written contract, composable, package,
  baseline, and absorbs blocks are preserved. runtime_targets is normalized
  to the supported Mac triad.
#>

param(
    [string]$RepoRoot = (Join-Path $PSScriptRoot ".."),
    [switch]$Check
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
. (Join-Path $resolvedRoot "tools\lib\catalog-paths.ps1")

$skillsDir = Resolve-DcrSourcePath -RepoRoot $resolvedRoot -AssetType "skills"
$runtimeTargets = @("codex", "claude", "cursor")
$changed = New-Object System.Collections.Generic.List[string]

function Get-FrontmatterMatch {
    param([string]$Content)
    return [regex]::Match($Content, '(?s)^---\r?\n(.*?)\r?\n---\r?\n?')
}

function Test-FrontmatterBlock {
    param([string]$Frontmatter, [string]$Name)
    return [bool]($Frontmatter -match "(?m)^\s*$([regex]::Escape($Name))\s*:\s*$")
}

function New-ContractBlock {
    return @(
        "contract:",
        "  preconditions:",
        "    - ""The request matches this skill's description or routing category.""",
        "  postconditions:",
        "    - ""The response names the result, reasoning, and verification or handoff path.""",
        "  invariants:",
        "    - ""Do not treat generated mirrors or runtime caches as DCR source of truth."""
    ) -join "`n"
}

function New-ComposableBlock {
    return @(
        "composable:",
        "  input_type: task",
        "  output_type: artifact-or-decision",
        "  chains_with:",
        "    - verification-before-completion"
    ) -join "`n"
}

function New-RuntimeTargetsBlock {
    param([string[]]$Targets)
    $lines = @("runtime_targets:")
    foreach ($target in $Targets) {
        $lines += "  - $target"
    }
    return ($lines -join "`n")
}

function Set-RuntimeTargetsBlock {
    param(
        [string]$Frontmatter,
        [string[]]$Targets
    )

    $pattern = '(?m)^([ \t]*)runtime_targets:\r?\n(?:\1[ \t]+-[^\r\n]*(?:\r?\n|\z))+'
    $match = [regex]::Match($Frontmatter, $pattern)
    if (-not $match.Success) { return $Frontmatter }

    $indent = $match.Groups[1].Value
    $lines = @("${indent}runtime_targets:")
    foreach ($target in $Targets) {
        $lines += "${indent}  - $target"
    }
    $replacement = ($lines -join "`n") + "`n"
    return $Frontmatter.Substring(0, $match.Index) + $replacement + $Frontmatter.Substring($match.Index + $match.Length)
}

foreach ($dir in Get-ChildItem -Path $skillsDir -Force -Directory | Where-Object { -not $_.Name.StartsWith("_") } | Sort-Object Name) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path -LiteralPath $skillFile)) { continue }

    $raw = Get-Content -Path $skillFile -Raw -Encoding utf8
    $match = Get-FrontmatterMatch -Content $raw
    if (-not $match.Success) { continue }

    $frontmatter = $match.Groups[1].Value
    if ($frontmatter -match '(?m)^\s*deprecated\s*:\s*true\s*$') { continue }

    $normalizedFrontmatter = Set-RuntimeTargetsBlock -Frontmatter $frontmatter -Targets $runtimeTargets
    $blocks = @()
    if (-not (Test-FrontmatterBlock -Frontmatter $frontmatter -Name "contract")) {
        $blocks += New-ContractBlock
    }
    if (-not (Test-FrontmatterBlock -Frontmatter $frontmatter -Name "composable")) {
        $blocks += New-ComposableBlock
    }
    if (-not (Test-FrontmatterBlock -Frontmatter $frontmatter -Name "runtime_targets")) {
        $blocks += New-RuntimeTargetsBlock -Targets $runtimeTargets
    }

    if ($blocks.Count -eq 0 -and $normalizedFrontmatter.TrimEnd() -ceq $frontmatter.TrimEnd()) { continue }

    $newFrontmatter = $normalizedFrontmatter.TrimEnd()
    if ($blocks.Count -gt 0) {
        $newFrontmatter += "`n" + ($blocks -join "`n")
    }
    $newFrontmatter += "`n"
    $body = $raw.Substring($match.Length)
    $newRaw = "---`n$newFrontmatter---`n$body"
    $changed.Add($dir.Name) | Out-Null

    if (-not $Check) {
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $skillFile).Path, $newRaw, $utf8)
    }
}

Write-Host "== Normalize Skill Capabilities ==" -ForegroundColor Cyan
Write-Host "Changed skills: $($changed.Count)"
if ($changed.Count -gt 0) {
    foreach ($name in $changed) {
        Write-Host "  - $name"
    }
}

if ($Check -and $changed.Count -gt 0) {
    exit 1
}
