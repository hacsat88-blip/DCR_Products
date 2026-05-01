param([string]$RepoRoot = ".")

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"
$agentsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"

Write-Host "[codex] Generating AGENTS.md..." -ForegroundColor Cyan

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

$activeRules = @()
$activeSkills = @()
$activeAgents = @()
$deprecatedRules = @()
$deprecatedSkills = @()
$deprecatedAgents = @()

# Collect codex-targeted items
foreach ($f in Get-ChildItem $rulesDir -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("vscode", "claude", "codex") }
    if ($targets -contains "codex") {
        $dep = Get-DeprecationInfo $f
        if ($dep.Deprecated) { $deprecatedRules += [pscustomobject]@{ Name = $f.BaseName; Successor = $dep.Successor } } else { $activeRules += $f.BaseName }
    }
}

foreach ($dir in Get-ChildItem $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $sf) {
        $sfItem = Get-Item $sf
        $targets = Get-Targets $sfItem
        if (-not $targets) { $targets = @("vscode", "claude", "codex") }
        if ($targets -contains "codex") {
            $dep = Get-DeprecationInfo $sfItem
            if ($dep.Deprecated) { $deprecatedSkills += [pscustomobject]@{ Name = $dir.Name; Successor = $dep.Successor } } else { $activeSkills += $dir.Name }
        }
    }
}

foreach ($f in Get-ChildItem $agentsDir -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("codex", "claude") }
    if ($targets -contains "codex") {
        $dep = Get-DeprecationInfo $f
        if ($dep.Deprecated) { $deprecatedAgents += [pscustomobject]@{ Name = $f.BaseName; Successor = $dep.Successor } } else { $activeAgents += $f.BaseName }
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

# Codex / GitHub Copilot CLI / Warp Entrypoint

Unified entry point for Codex, GitHub Copilot CLI, and Warp Project Rules environments.

GitHub Copilot CLI specific behavior lives in [.ai/environments/copilot-cli/kernel.md](.ai/environments/copilot-cli/kernel.md).
Warp-specific behavior lives in [.ai/environments/warp/kernel.md](.ai/environments/warp/kernel.md).

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
- Environment diff (Codex): [.ai/environments/codex/kernel.md](.ai/environments/codex/kernel.md)
- Environment diff (Warp): [.ai/environments/warp/kernel.md](.ai/environments/warp/kernel.md)

---

## Unified Coordinator

全タスクの単一入口は **pied-piper** agent。Rule/Skill/Agent 選定は決定木に従い、採用前に3行報告（採用名・理由・期待効果）を出す。

詳細：
- [.ai/module/unified-coordinator.md](.ai/module/unified-coordinator.md)
- [.ai/module/unified-router.md](.ai/module/unified-router.md)
- [.ai/module/unified-integration.md](.ai/module/unified-integration.md)

---

## Response Language

ユーザーへの回答、説明、CLI 出力の要約、エラー原因・影響・修正案は、ユーザーが別言語を明示しない限り日本語で行う。

## Warp Project Rules

Warp はこの `AGENTS.md` を Project Rules として読む。Warp 本体の設定はアプリ内 Settings とローカルデータベースで管理されるため、このリポジトリでは `settings.json` を正本化しない。
"@

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$RepoRoot/AGENTS.md", ($content.TrimEnd() + [Environment]::NewLine), $utf8)

Write-Host "  [OK] AGENTS.md" -ForegroundColor Green
Write-Host ""
