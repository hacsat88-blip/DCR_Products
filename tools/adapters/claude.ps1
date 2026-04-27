param([string]$RepoRoot = ".")

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"
$agentsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"

Write-Host "[claude] Generating CLAUDE.md..." -ForegroundColor Cyan

function Get-Targets($file) {
    $text = Get-Content $file.FullName -Raw
    if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
        return [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | % { $_.Groups[1].Value }
    }
    return @()
}

$rules = @()
$skills = @()
$agents = @()

# Collect claude-targeted items
foreach ($f in Get-ChildItem $rulesDir -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("vscode", "cursor", "claude", "codex") }
    if ($targets -contains "claude") { $rules += $f.BaseName }
}

foreach ($dir in Get-ChildItem $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $sf) {
        $targets = Get-Targets (Get-Item $sf)
        if (-not $targets) { $targets = @("vscode", "cursor", "claude", "codex") }
        if ($targets -contains "claude") { $skills += $dir.Name }
    }
}

foreach ($f in Get-ChildItem $agentsDir -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("codex", "claude") }
    if ($targets -contains "claude") { $agents += $f.BaseName }
}

$ruleList = if ($rules) { (($rules | ForEach-Object { "- [$_](.ai/catalog/rules/$_.md)" }) -join "`n") } else { "(none)" }
$skillList = if ($skills) { (($skills | ForEach-Object { "- [$_](.ai/catalog/skills/$_/SKILL.md)" }) -join "`n") } else { "(none)" }
$agentList = if ($agents) { (($agents | ForEach-Object { "- [$_](.ai/catalog/agents-source/$_.md)" }) -join "`n") } else { "(none)" }

$content = @"
<!-- ⚠️ AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY ⚠️
Generated from: .ai/kernel + .ai/catalog/rules/ + .ai/catalog/skills/ + .ai/catalog/agents-source/
To regenerate: Run .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# Claude Code Entrypoint

Unified entry point for Claude Code environment.

## Included Rules

$ruleList

## Included Skills

$skillList

## Included Agents

$agentList

---

For architecture details, see [.ai/module/unified-integration.md](.ai/module/unified-integration.md)
"@

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$RepoRoot/CLAUDE.md", ($content.TrimEnd() + [Environment]::NewLine), $utf8)

Write-Host "  [OK] CLAUDE.md" -ForegroundColor Green
Write-Host ""
