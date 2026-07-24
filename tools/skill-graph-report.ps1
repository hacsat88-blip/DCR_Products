#Requires -Version 5.1
<#
.SYNOPSIS
  Report active skills, absorbed aliases, tombstones, and OpenAI overlays.
#>

param(
    [string]$RepoRoot = (Join-Path $PSScriptRoot ".."),
    [string]$OutputJson = "",
    [string]$OutputMarkdown = ""
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
. (Join-Path $resolvedRoot "tools\lib\catalog-paths.ps1")
. (Join-Path $resolvedRoot "tools\lib\deprecated-aliases.ps1")

$skillsDir = Resolve-DcrSourcePath -RepoRoot $resolvedRoot -AssetType "skills"
$aliases = @(Get-DcrDeprecatedAliases -RepoRoot $resolvedRoot)

function Get-FrontmatterText {
    param([string]$Path)
    $raw = Get-Content -Path $Path -Raw -Encoding utf8
    $match = [regex]::Match($raw, '(?s)^---\r?\n(.*?)\r?\n---')
    if ($match.Success) { return $match.Groups[1].Value }
    return ""
}

$activeSkills = @()
foreach ($dir in Get-ChildItem -Path $skillsDir -Force -Directory | Where-Object { -not $_.Name.StartsWith("_") } | Sort-Object Name) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path -LiteralPath $skillFile)) { continue }
    $fm = Get-FrontmatterText -Path $skillFile
    if ($fm -match '(?m)^\s*deprecated\s*:\s*true\s*$') { continue }

    $activeSkills += [pscustomobject]@{
        name = $dir.Name
        category = if ($fm -match '(?m)^routing_category\s*:\s*(.+)\s*$') { $Matches[1].Trim().Trim('"').Trim("'") } else { "" }
        has_baseline = ($fm -match '(?m)^baseline:\s*$')
        has_absorbs = ($fm -match '(?m)^absorbs:\s*$')
    }
}

$summary = [pscustomobject]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    active_skill_count = $activeSkills.Count
    deprecated_alias_count = $aliases.Count
    removed_tombstone_count = @($aliases | Where-Object { $_.state -eq "removed" }).Count
    live_alias_count = @($aliases | Where-Object { $_.state -eq "live" }).Count
    openai_overlay_count = @($activeSkills | Where-Object { $_.has_baseline }).Count
    absorbing_skill_count = @($activeSkills | Where-Object { $_.has_absorbs }).Count
    active_skills = $activeSkills
    aliases = $aliases
}

Write-Host "== Skill Graph Report ==" -ForegroundColor Cyan
Write-Host "Active skills: $($summary.active_skill_count)"
Write-Host "Deprecated aliases: $($summary.deprecated_alias_count)"
Write-Host "Live aliases: $($summary.live_alias_count)"
Write-Host "Removed tombstones: $($summary.removed_tombstone_count)"
Write-Host "OpenAI overlays: $($summary.openai_overlay_count)"
Write-Host "Absorbing skills: $($summary.absorbing_skill_count)"

if (-not [string]::IsNullOrWhiteSpace($OutputJson)) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($OutputJson, ($summary | ConvertTo-Json -Depth 8), $utf8)
    Write-Host "JSON: $OutputJson" -ForegroundColor Green
}

if (-not [string]::IsNullOrWhiteSpace($OutputMarkdown)) {
    $lines = @(
        "# Skill Graph Report",
        "",
        "- Generated at: $($summary.generated_at)",
        "- Active skills: $($summary.active_skill_count)",
        "- Deprecated aliases: $($summary.deprecated_alias_count)",
        "- Live aliases: $($summary.live_alias_count)",
        "- Removed tombstones: $($summary.removed_tombstone_count)",
        "- OpenAI overlays: $($summary.openai_overlay_count)",
        "- Absorbing skills: $($summary.absorbing_skill_count)",
        ""
    )
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($OutputMarkdown, ($lines -join [Environment]::NewLine), $utf8)
    Write-Host "Markdown: $OutputMarkdown" -ForegroundColor Green
}
