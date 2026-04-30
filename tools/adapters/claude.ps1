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

$activeRules = @()
$activeSkills = @()
$activeAgents = @()
$deprecatedRules = @()
$deprecatedSkills = @()
$deprecatedAgents = @()

# Collect claude-targeted items (separate active vs deprecated)
foreach ($f in Get-ChildItem $rulesDir -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("vscode", "claude", "codex") }
    if ($targets -contains "claude") {
        $dep = Get-DeprecationInfo $f
        if ($dep.Deprecated) {
            $deprecatedRules += [pscustomobject]@{ Name = $f.BaseName; Successor = $dep.Successor }
        } else {
            $activeRules += $f.BaseName
        }
    }
}

foreach ($dir in Get-ChildItem $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $sf) {
        $sfItem = Get-Item $sf
        $targets = Get-Targets $sfItem
        if (-not $targets) { $targets = @("vscode", "claude", "codex") }
        if ($targets -contains "claude") {
            $dep = Get-DeprecationInfo $sfItem
            if ($dep.Deprecated) {
                $deprecatedSkills += [pscustomobject]@{ Name = $dir.Name; Successor = $dep.Successor }
            } else {
                $activeSkills += $dir.Name
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
            $activeAgents += $f.BaseName
        }
    }
}
$activeRuleCount = $activeRules.Count
$activeSkillCount = $activeSkills.Count
$activeAgentCount = $activeAgents.Count
$deprecatedRuleCount = $deprecatedRules.Count
$deprecatedSkillCount = $deprecatedSkills.Count
$deprecatedAgentCount = $deprecatedAgents.Count

$content = @"
<!-- ⚠️ AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY ⚠️
Generated from: .ai/book + .ai/kernel + .ai/catalog/rules/ + .ai/catalog/skills/ + .ai/catalog/agents-source/
To regenerate: Run .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# Claude Code Entrypoint

Unified entry point for Claude Code environment.

## Scope Summary

- Active rules: $activeRuleCount
- Active skills: $activeSkillCount
- Active agents: $activeAgentCount
- Deprecated aliases (rules/skills/agents): $deprecatedRuleCount / $deprecatedSkillCount / $deprecatedAgentCount

## Source of Truth

- Rules: [.ai/catalog/rules/](.ai/catalog/rules/)
- Skills: [.ai/catalog/skills/](.ai/catalog/skills/)
- Agents: [.ai/catalog/agents-source/](.ai/catalog/agents-source/)
- Shared Book: [.ai/book/](.ai/book/)
- Kernel: [.ai/kernel/](.ai/kernel/)
- Environment diff (Claude Code): [.ai/environments/claude-code/kernel.md](.ai/environments/claude-code/kernel.md)
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
