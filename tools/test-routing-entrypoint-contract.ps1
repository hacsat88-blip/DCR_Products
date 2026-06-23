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

$CatalogPaths = Join-Path $RepoRoot "tools\lib\catalog-paths.ps1"
. $CatalogPaths
$skillsRelativePath = Get-DcrResolvedSourceRelativePath -RepoRoot $RepoRoot -AssetType "skills"

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

function Assert-LocalMarkdownLinksResolve {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Text
    )

    $baseDir = Split-Path -Parent $Path
    $matches = [regex]::Matches($Text, '\[[^\]]+\]\(([^)]+)\)')
    foreach ($match in $matches) {
        $target = $match.Groups[1].Value
        if ($target -match '^[a-zA-Z][a-zA-Z0-9+.-]*:' -or $target.StartsWith("#")) {
            continue
        }

        $targetPath = ($target -split '#', 2)[0]
        if ([string]::IsNullOrWhiteSpace($targetPath)) {
            continue
        }

        $resolved = [System.IO.Path]::GetFullPath((Join-Path $baseDir $targetPath))
        if (-not (Test-Path -LiteralPath $resolved)) {
            throw "$Label has unresolved local markdown link: $target"
        }
    }
}

$files = @(
    @{ label = "Codex entrypoint"; path = "AGENTS.md" },
    @{ label = "Claude entrypoint"; path = "CLAUDE.md" },
    @{ label = "VS Code Copilot entrypoint"; path = ".github\copilot-instructions.md" },
    @{ label = "unified-router skill"; path = "$($skillsRelativePath.Replace('/', '\'))\unified-router\SKILL.md" }
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

    if ($entry.label -eq "VS Code Copilot entrypoint") {
        Assert-LocalMarkdownLinksResolve -Label $entry.label -Path $fullPath -Text $text
    }
}

Write-Host "routing entrypoint contract V6 smoke passed"
