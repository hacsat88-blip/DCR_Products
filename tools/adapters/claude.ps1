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

function Get-DeprecationInfo($file) {
    $text = Get-Content $file.FullName -Raw
    if ($text -match '(?ms)^---(.*?)^---') {
        $fm = $Matches[1]
        if ($fm -match '(?m)^\s*deprecated\s*:\s*true\s*$') {
            $succ = $null
            if ($fm -match '(?m)^\s*successor\s*:\s*(\S+)') { $succ = $Matches[1].Trim() }
            return @{ Deprecated = $true; Successor = $succ }
        }
    }
    return @{ Deprecated = $false; Successor = $null }
}

function Get-RoutingCategory($file) {
    $text = Get-Content $file.FullName -Raw
    if ($text -match '(?ms)^---(.*?)^---') {
        $fm = $Matches[1]
        if ($fm -match '(?m)^\s*routing_category\s*:\s*(\S+)') { return $Matches[1].Trim() }
    }
    return $null
}

# Group rule names by routing_category for 3-group display
function Group-RulesByCategory($ruleNames, $rulesDir) {
    $groups = @{
        'governance' = @()  # Core governance & stewards (highest priority)
        'role' = @()         # Domain roles (developers, designers, engineers)
        'specialist' = @()   # Topic specialists (growth, ui-ux, devops, documents)
    }
    foreach ($name in $ruleNames) {
        $f = Get-Item (Join-Path $rulesDir "$name.md") -ErrorAction SilentlyContinue
        if (-not $f) { continue }
        $cat = Get-RoutingCategory $f
        if ($cat -eq 'governance') {
            $groups['governance'] += $name
        } elseif ($cat -in @('devops', 'ui-ux')) {
            $groups['role'] += $name
        } else {
            $groups['specialist'] += $name
        }
    }
    return $groups
}

$rules = @()
$skills = @()
$agents = @()
$deprecatedRules = @()
$deprecatedSkills = @()
$deprecatedAgents = @()

# Collect claude-targeted items (separate active vs deprecated)
foreach ($f in Get-ChildItem $rulesDir -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("vscode", "cursor", "claude", "codex") }
    if ($targets -contains "claude") {
        $dep = Get-DeprecationInfo $f
        if ($dep.Deprecated) {
            $deprecatedRules += [pscustomobject]@{ Name = $f.BaseName; Successor = $dep.Successor }
        } else {
            $rules += $f.BaseName
        }
    }
}

foreach ($dir in Get-ChildItem $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $sf) {
        $sfItem = Get-Item $sf
        $targets = Get-Targets $sfItem
        if (-not $targets) { $targets = @("vscode", "cursor", "claude", "codex") }
        if ($targets -contains "claude") {
            $dep = Get-DeprecationInfo $sfItem
            if ($dep.Deprecated) {
                $deprecatedSkills += [pscustomobject]@{ Name = $dir.Name; Successor = $dep.Successor }
            } else {
                $skills += $dir.Name
            }
        }
    }
}

foreach ($f in Get-ChildItem $agentsDir -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("codex", "claude") }
    if ($targets -contains "claude") {
        $dep = Get-DeprecationInfo $f
        if ($dep.Deprecated) {
            $deprecatedAgents += [pscustomobject]@{ Name = $f.BaseName; Successor = $dep.Successor }
        } else {
            $agents += $f.BaseName
        }
    }
}

if ($rules) {
    $rg = Group-RulesByCategory $rules $rulesDir
    $sections = @()
    if ($rg['governance'].Count -gt 0) {
        $sections += "### Governance & Core (境界・統制)"
        $sections += ""
        foreach ($n in ($rg['governance'] | Sort-Object)) { $sections += "- [$n](.ai/catalog/rules/$n.md)" }
        $sections += ""
    }
    if ($rg['role'].Count -gt 0) {
        $sections += "### Roles (実装ロール: devops / ui-ux)"
        $sections += ""
        foreach ($n in ($rg['role'] | Sort-Object)) { $sections += "- [$n](.ai/catalog/rules/$n.md)" }
        $sections += ""
    }
    if ($rg['specialist'].Count -gt 0) {
        $sections += "### Specialists (専門領域: growth / documents / その他)"
        $sections += ""
        foreach ($n in ($rg['specialist'] | Sort-Object)) { $sections += "- [$n](.ai/catalog/rules/$n.md)" }
    }
    $ruleList = ($sections -join "`n").TrimEnd()
} else {
    $ruleList = "(none)"
}
$skillList = if ($skills) { (($skills | ForEach-Object { "- [$_](.ai/catalog/skills/$_/SKILL.md)" }) -join "`n") } else { "(none)" }
$agentList = if ($agents) { (($agents | ForEach-Object { "- [$_](.ai/catalog/agents-source/$_.md)" }) -join "`n") } else { "(none)" }

$deprecatedSection = ""
$totalDep = $deprecatedRules.Count + $deprecatedSkills.Count + $deprecatedAgents.Count
if ($totalDep -gt 0) {
    $lines = @("", "## Deprecated Aliases", "", "These names are kept as aliases that route to their successor (Phase A/B/C consolidation):", "")
    foreach ($e in $deprecatedRules) { $lines += "- ~~$($e.Name)~~ → [$($e.Successor)](.ai/catalog/rules/$($e.Successor).md) _(rule)_" }
    foreach ($e in $deprecatedSkills) { $lines += "- ~~$($e.Name)~~ → [$($e.Successor)](.ai/catalog/skills/$($e.Successor)/SKILL.md) _(skill)_" }
    foreach ($e in $deprecatedAgents) { $lines += "- ~~$($e.Name)~~ → [$($e.Successor)](.ai/catalog/agents-source/$($e.Successor).md) _(agent)_" }
    $deprecatedSection = ($lines -join "`n") + "`n"
}

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
$deprecatedSection
---

## Unified Coordinator

全タスクの単一入口は **pied-piper** agent。
Rule/Skill/Agent の選定は [.ai/module/unified-router.md](.ai/module/unified-router.md) の決定木に従い、
採用前に必ず3行報告（採用名・理由・期待効果）を出す。

詳細：
- [.ai/module/unified-coordinator.md](.ai/module/unified-coordinator.md)
- [.ai/module/unified-router.md](.ai/module/unified-router.md)
- [.ai/module/unified-integration.md](.ai/module/unified-integration.md)
"@

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$RepoRoot/CLAUDE.md", ($content.TrimEnd() + [Environment]::NewLine), $utf8)

Write-Host "  [OK] CLAUDE.md" -ForegroundColor Green
Write-Host ""
