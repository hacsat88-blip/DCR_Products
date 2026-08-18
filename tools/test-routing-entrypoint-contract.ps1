#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for Routing Entrypoint Contract V6.

.DESCRIPTION
  Verifies that generated CLI/IDE entrypoints expose the same low-cognitive-load
  proposal reply contract and shared work_unit routing lens as the canonical
  unified-router docs.
#>

param(
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function New-Text {
    param([Parameter(Mandatory)][int[]]$Codepoints)
    return -join ($Codepoints | ForEach-Object { [char]$_ })
}

function Assert-Contains {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][string]$Needle
    )

    if (-not $Text.Contains($Needle)) {
        throw "$Label missing required contract text: $Needle"
    }
}

function Assert-MappingLine {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][string]$Kind,
        [Parameter(Mandatory)][string[]]$RequiredTargets
    )

    $kindLines = @($Text -split "`r?`n" | Where-Object { $_.Contains($Kind) })
    foreach ($line in $kindLines) {
        $matchesAll = $true
        foreach ($target in $RequiredTargets) {
            if (-not $line.Contains($target)) {
                $matchesAll = $false
                break
            }
        }
        if ($matchesAll) {
            return
        }
    }

    throw "$Label has no mapping line from '$Kind' to: $($RequiredTargets -join ', ')"
}

function Assert-FilesEqual {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$LeftPath,
        [Parameter(Mandatory)][string]$RightPath
    )

    foreach ($path in @($LeftPath, $RightPath)) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "$Label comparison file not found: $path"
        }
    }

    $leftHash = (Get-FileHash -LiteralPath $LeftPath -Algorithm SHA256).Hash
    $rightHash = (Get-FileHash -LiteralPath $RightPath -Algorithm SHA256).Hash
    if (-not [string]::Equals($leftHash, $rightHash, [System.StringComparison]::Ordinal)) {
        throw "$Label source and generated mirror differ"
    }
}

function Assert-CanonicalSection {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][string]$Expected
    )

    $sectionPattern = '(?ms)^## Shared Operating Principles[ \t]*\r?\n.*?(?=^#{1,2}[ \t]+|\z)'
    $sectionMatches = [regex]::Matches($Text, $sectionPattern)
    if ($sectionMatches.Count -ne 1) {
        throw "$Label must contain exactly one Shared Operating Principles section; found $($sectionMatches.Count)"
    }

    $actualNormalized = $sectionMatches[0].Value.Trim().Replace("`r`n", "`n")
    $expectedNormalized = $Expected.Trim().Replace("`r`n", "`n")
    if (-not [string]::Equals($actualNormalized, $expectedNormalized, [System.StringComparison]::Ordinal)) {
        throw "$Label Shared Operating Principles section differs from the canonical source"
    }
}

$canonicalOperatingPrinciplesPath = Join-Path $RepoRoot ".ai\core\operating-principles.md"
if (-not (Test-Path -LiteralPath $canonicalOperatingPrinciplesPath -PathType Leaf)) {
    throw "Shared operating principles not found: $canonicalOperatingPrinciplesPath"
}
$canonicalOperatingPrinciples = (Get-Content -LiteralPath $canonicalOperatingPrinciplesPath -Raw -Encoding UTF8).Trim()
if (-not $canonicalOperatingPrinciples.StartsWith("# Shared Operating Principles")) {
    throw "Shared operating principles must start with '# Shared Operating Principles': $canonicalOperatingPrinciplesPath"
}
$expectedOperatingPrinciplesBlock = "#$canonicalOperatingPrinciples"

$files = @(
    @{ label = "Codex entrypoint"; path = "AGENTS.md" },
    @{ label = "Claude entrypoint"; path = "CLAUDE.md" },
    @{ label = "Cursor entrypoint"; path = ".cursor\rules\dcr-kernel.mdc" },
    @{ label = "unified-router skill"; path = ".ai\catalog\skills\unified-router\SKILL.md" }
)

$requiredAscii = @(
    "pied-piper",
    "unified-router",
    "work_unit",
    "proposal_state.status = proposed|refined",
    "tools/lib/gate-state.ps1",
    "OK"
)

$requiredTerms = @(
    (New-Text @(0x304a,0x3059,0x3059,0x3081,0x3067)), # osusume-de
    (New-Text @(0x63a8,0x5968,0x3067)),               # suisho-de
    (New-Text @(0x304a,0x307e,0x304b,0x305b)),        # omakase
    (New-Text @(0x30ad,0x30e3,0x30f3,0x30bb,0x30eb)), # cancel
    (New-Text @(0x5225,0x6848)),                      # betsuan
    (New-Text @(0x8efd,0x304f))                       # karuku
)

foreach ($entry in $files) {
    $fullPath = Join-Path $RepoRoot $entry.path
    if (-not (Test-Path $fullPath)) {
        throw "$($entry.label) not found: $fullPath"
    }

    $text = Get-Content -Path $fullPath -Raw -Encoding UTF8
    foreach ($needle in $requiredAscii) {
        Assert-Contains -Label $entry.label -Text $text -Needle $needle
    }
    foreach ($term in $requiredTerms) {
        Assert-Contains -Label $entry.label -Text $text -Needle $term
    }
}

$generatedEntrypoints = @($files | Where-Object { $_.label -ne "unified-router skill" })
foreach ($entry in $generatedEntrypoints) {
    $fullPath = Join-Path $RepoRoot $entry.path
    $text = Get-Content -Path $fullPath -Raw -Encoding UTF8
    Assert-CanonicalSection -Label $entry.label -Text $text -Expected $expectedOperatingPrinciplesBlock
}

$workUnitFiles = @(
    @{ label = "canonical router"; path = ".ai\routing\router.md" },
    @{ label = "unified-router skill"; path = ".ai\catalog\skills\unified-router\SKILL.md" },
    @{ label = "Claude coordinator source"; path = ".ai\catalog\agents-source\pied-piper.md" },
    @{ label = "Codex coordinator source"; path = ".ai\catalog\agents-source\pied-piper.toml" },
    @{ label = "Claude coordinator mirror"; path = ".claude\agents\pied-piper.md" },
    @{ label = "Codex coordinator mirror"; path = ".codex\agents\pied-piper.toml" }
)
$workUnitMappings = @(
    @{ kind = "repeatable-job"; targets = @("script", "automation") },
    @{ kind = "reusable-judgment"; targets = @("Skill", "rule") },
    @{ kind = "specialist-responsibility"; targets = @("Agent") },
    @{ kind = "outcome-bundle"; targets = @("plan", "pipeline") },
    @{ kind = "enforcement-guard"; targets = @("permission", "gate", "hook") },
    @{ kind = "external-connection"; targets = @("tool", "connector", "MCP") }
)
foreach ($entry in $workUnitFiles) {
    $fullPath = Join-Path $RepoRoot $entry.path
    if (-not (Test-Path $fullPath)) {
        throw "$($entry.label) not found: $fullPath"
    }
    $text = Get-Content -Path $fullPath -Raw -Encoding UTF8
    Assert-Contains -Label $entry.label -Text $text -Needle "work_unit"
    foreach ($mapping in $workUnitMappings) {
        Assert-MappingLine -Label $entry.label -Text $text -Kind $mapping.kind -RequiredTargets $mapping.targets
    }
    Assert-MappingLine -Label $entry.label -Text $text -Kind "primary_work_unit: none" -RequiredTargets @("secondary_work_unit: null")
    Assert-MappingLine -Label $entry.label -Text $text -Kind "primary_work_unit: mixed" -RequiredTargets @("secondary_work_unit: null")
    Assert-MappingLine -Label $entry.label -Text $text -Kind "ralph:" -RequiredTargets @("repeatable-job", "team-fix")
    Assert-MappingLine -Label $entry.label -Text $text -Kind "P1" -RequiredTargets @("P2", "P3")
}

$canonicalRouterText = Get-Content -LiteralPath (Join-Path $RepoRoot ".ai\routing\router.md") -Raw -Encoding UTF8
Assert-Contains -Label "canonical router" -Text $canonicalRouterText -Needle '"primary_work_unit"'
Assert-Contains -Label "canonical router" -Text $canonicalRouterText -Needle '"secondary_work_unit"'

$cursorText = Get-Content -LiteralPath (Join-Path $RepoRoot ".cursor\rules\dcr-kernel.mdc") -Raw -Encoding UTF8
Assert-Contains -Label "Cursor entrypoint" -Text $cursorText -Needle ".ai/routing/router.md"

Assert-FilesEqual `
    -Label "Claude coordinator" `
    -LeftPath (Join-Path $RepoRoot ".ai\catalog\agents-source\pied-piper.md") `
    -RightPath (Join-Path $RepoRoot ".claude\agents\pied-piper.md")
Assert-FilesEqual `
    -Label "Codex coordinator" `
    -LeftPath (Join-Path $RepoRoot ".ai\catalog\agents-source\pied-piper.toml") `
    -RightPath (Join-Path $RepoRoot ".codex\agents\pied-piper.toml")

Write-Host "routing entrypoint contract V6 smoke passed"
