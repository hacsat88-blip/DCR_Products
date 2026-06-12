#Requires -Version 5.1
<#
.SYNOPSIS
  Validate active DCR skill capability metadata.

.DESCRIPTION
  Read-only check for higher-level skill contracts:
    - active skills with absorbs must point at deprecated aliases when tombstones are active
    - OpenAI baseline overlays must declare role=overlay and local_delta
    - contract/composable/runtime_targets blocks are required for every active skill
    - exact OpenAI overlaps stay small enough to behave as overlays
#>

param(
    [string]$RepoRoot = (Join-Path $PSScriptRoot ".."),
    [int]$OverlayMaxNonFrontmatterLines = 90
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
. (Join-Path $resolvedRoot "tools\lib\catalog-paths.ps1")
. (Join-Path $resolvedRoot "tools\lib\deprecated-aliases.ps1")

$skillsDir = Resolve-DcrSourcePath -RepoRoot $resolvedRoot -AssetType "skills"
$deprecatedAliases = @(Get-DcrDeprecatedAliases -RepoRoot $resolvedRoot)
$deprecatedSkillByName = @{}
foreach ($alias in $deprecatedAliases | Where-Object { $_.kind -eq "skill" }) {
    $deprecatedSkillByName[$alias.name] = $alias
}

function Get-FrontmatterText {
    param([string]$Path)
    $raw = Get-Content -Path $Path -Raw -Encoding utf8
    $match = [regex]::Match($raw, '(?s)^---\r?\n(.*?)\r?\n---')
    if ($match.Success) { return $match.Groups[1].Value }
    return ""
}

function Test-FrontmatterFlag {
    param([string]$Frontmatter, [string]$Key, [string]$Value)
    return ($Frontmatter -match "(?m)^\s*$([regex]::Escape($Key))\s*:\s*$([regex]::Escape($Value))\s*$")
}

function Get-ListValues {
    param([string]$Frontmatter, [string]$Key)
    $values = @()
    $lines = $Frontmatter -split "\r?\n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^(\s*)$([regex]::Escape($Key))\s*:\s*$") {
            $baseIndent = $Matches[1].Length
            $i++
            while ($i -lt $lines.Count) {
                $line = $lines[$i]
                if ($line -match '^(\s*)[a-zA-Z_][a-zA-Z0-9_-]*\s*:') {
                    if ($Matches[1].Length -le $baseIndent) { break }
                }
                if ($line -match '^\s*-\s*(.+)\s*$') { $values += $Matches[1].Trim().Trim('"').Trim("'") }
                $i++
            }
            break
        }
    }
    return $values
}

function Test-RequiredChildKey {
    param([string]$Frontmatter, [string]$Block, [string]$Child)
    $lines = $Frontmatter -split "\r?\n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*$([regex]::Escape($Block))\s*:\s*$") {
            $i++
            while ($i -lt $lines.Count) {
                $line = $lines[$i]
                if ($line -match '^[a-zA-Z_][a-zA-Z0-9_-]*\s*:') { break }
                if ($line -match "^\s+$([regex]::Escape($Child))\s*:") { return $true }
                $i++
            }
            return $false
        }
    }
    return $false
}

$failures = @()
$activeCount = 0
$contractCount = 0
$composableCount = 0
$packageCount = 0
$absorbsCount = 0
$baselineOverlayCount = 0
$runtimeTargetCount = 0
$requiredRuntimeTargets = @("codex", "claude", "copilot", "cursor", "gemini-cli")

foreach ($dir in Get-ChildItem -Path $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") } | Sort-Object Name) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path -LiteralPath $skillFile)) { continue }

    $frontmatter = Get-FrontmatterText -Path $skillFile
    if ([string]::IsNullOrWhiteSpace($frontmatter)) {
        $failures += "$($dir.Name): missing frontmatter"
        continue
    }
    if (Test-FrontmatterFlag -Frontmatter $frontmatter -Key "deprecated" -Value "true") {
        continue
    }

    $activeCount++
    if ($frontmatter -match '(?m)^\s*contract:\s*$') {
        $contractCount++
        foreach ($child in @("preconditions", "postconditions", "invariants")) {
            if (-not (Test-RequiredChildKey -Frontmatter $frontmatter -Block "contract" -Child $child)) {
                $failures += "$($dir.Name): contract missing $child"
            }
        }
    }
    else {
        $failures += "$($dir.Name): missing contract block"
    }
    if ($frontmatter -match '(?m)^\s*composable:\s*$') {
        $composableCount++
        foreach ($child in @("input_type", "output_type", "chains_with")) {
            if (-not (Test-RequiredChildKey -Frontmatter $frontmatter -Block "composable" -Child $child)) {
                $failures += "$($dir.Name): composable missing $child"
            }
        }
    }
    else {
        $failures += "$($dir.Name): missing composable block"
    }
    $runtimeTargets = @(Get-ListValues -Frontmatter $frontmatter -Key "runtime_targets")
    if ($runtimeTargets.Count -gt 0) {
        $runtimeTargetCount++
        foreach ($target in $requiredRuntimeTargets) {
            if ($target -notin $runtimeTargets) {
                $failures += "$($dir.Name): runtime_targets missing $target"
            }
        }
    }
    else {
        $failures += "$($dir.Name): missing runtime_targets block"
    }
    if ($frontmatter -match '(?m)^package:\s*$') { $packageCount++ }

    $absorbs = @(Get-ListValues -Frontmatter $frontmatter -Key "absorbs")
    if ($absorbs.Count -gt 0) {
        $absorbsCount++
        foreach ($absorbed in $absorbs) {
            if (-not $deprecatedSkillByName.ContainsKey($absorbed)) {
                # Removed alias tombstones may be expired from the active registry.
                # Keep validating the successor only while a tombstone is present.
                continue
            }
            elseif ($deprecatedSkillByName[$absorbed].successor -ne $dir.Name) {
                $failures += "$($dir.Name): absorbs '$absorbed' but successor is '$($deprecatedSkillByName[$absorbed].successor)'"
            }
        }
    }

    if ($frontmatter -match '(?m)^baseline:\s*$') {
        $baselineOverlayCount++
        if ($frontmatter -notmatch '(?m)^\s+upstream\s*:\s*"?openai/skills"?\s*$') {
            $failures += "$($dir.Name): baseline missing upstream=openai/skills"
        }
        if ($frontmatter -notmatch '(?m)^\s+role\s*:\s*overlay\s*$') {
            $failures += "$($dir.Name): baseline missing role=overlay"
        }
        if ($frontmatter -notmatch '(?m)^\s+local_delta\s*:\s*$') {
            $failures += "$($dir.Name): baseline missing local_delta"
        }

        $raw = Get-Content -Path $skillFile -Raw -Encoding utf8
        $body = [regex]::Replace($raw, '(?s)^---\r?\n.*?\r?\n---\r?\n', '')
        $nonEmptyLines = @($body -split "\r?\n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        if ($nonEmptyLines.Count -gt $OverlayMaxNonFrontmatterLines) {
            $failures += "$($dir.Name): overlay body has $($nonEmptyLines.Count) non-empty lines, max $OverlayMaxNonFrontmatterLines"
        }
    }
}

Write-Host "== Skill Capability Validation ==" -ForegroundColor Cyan
Write-Host "Active skills: $activeCount"
Write-Host "Contract blocks: $contractCount"
Write-Host "Composable blocks: $composableCount"
Write-Host "Runtime target blocks: $runtimeTargetCount"
Write-Host "Package blocks: $packageCount"
Write-Host "Absorbing skills: $absorbsCount"
Write-Host "OpenAI baseline overlays: $baselineOverlayCount"

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "FAILURES:" -ForegroundColor Red
    foreach ($failure in $failures) { Write-Host "  - $failure" -ForegroundColor Red }
    exit 1
}

Write-Host "RESULT: passed" -ForegroundColor Green
