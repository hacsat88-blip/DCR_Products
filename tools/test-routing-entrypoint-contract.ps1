#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for Routing Entrypoint Contract V6.

.DESCRIPTION
  Verifies that generated CLI/IDE entrypoints expose the same low-cognitive-load
  proposal reply contract as the canonical unified-router docs.
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

Write-Host "routing entrypoint contract V6 smoke passed"
