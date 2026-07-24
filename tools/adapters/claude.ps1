param(
    [string]$RepoRoot = ".",
    [string]$OutputPath = "",
    [switch]$Quiet
)

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $RepoRoot "CLAUDE.md"
}

function Write-ClaudeStatus {
    param([string]$Message, [string]$Color = "Green")
    if (-not $Quiet) { Write-Host $Message -ForegroundColor $Color }
}

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths
$DeprecatedAliases = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\deprecated-aliases.ps1"
. $DeprecatedAliases

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"
$agentsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"

Write-ClaudeStatus -Message "[claude] Generating CLAUDE.md..." -Color "Cyan"

function Get-Targets($file) {
    $text = Get-Content $file.FullName -Raw
    if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
        return [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | % { $_.Groups[1].Value }
    }
    return @()
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
$deprecatedAliasRows = @(Get-DcrDeprecatedAliases -RepoRoot $RepoRoot)
$deprecatedAliasByKey = @{}
foreach ($alias in $deprecatedAliasRows) {
    $deprecatedAliasByKey["$($alias.kind):$($alias.name)"] = $alias
}

function Get-DeprecationInfo($kind, $name) {
    $key = "$kind`:$name"
    if ($deprecatedAliasByKey.ContainsKey($key)) {
        return @{ Deprecated = $true; Successor = $deprecatedAliasByKey[$key].successor; State = $deprecatedAliasByKey[$key].state }
    }
    return @{ Deprecated = $false; Successor = $null; State = $null }
}

# Collect claude-targeted items (separate active vs deprecated)
foreach ($f in Get-ChildItem -Path $rulesDir -Force -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("claude", "codex", "cursor") }
    if ($targets -contains "claude") {
        $dep = Get-DeprecationInfo "rule" $f.BaseName
        if ($dep.Deprecated) {
            $deprecatedRules += [pscustomobject]@{ Name = $f.BaseName; Successor = $dep.Successor }
        } else {
            $activeRules += $f.BaseName
        }
    }
}

foreach ($dir in Get-ChildItem -Path $skillsDir -Force -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $sf) {
        $sfItem = Get-Item -LiteralPath $sf -Force
        $targets = Get-Targets $sfItem
        if (-not $targets) { $targets = @("claude", "codex", "cursor") }
        if ($targets -contains "claude") {
            $dep = Get-DeprecationInfo "skill" $dir.Name
            if ($dep.Deprecated) {
                $deprecatedSkills += [pscustomobject]@{ Name = $dir.Name; Successor = $dep.Successor }
            } else {
                $activeSkills += $dir.Name
            }
        }
    }
}

foreach ($f in Get-ChildItem -Path $agentsDir -Force -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("codex", "claude") }
    if ($targets -contains "claude") {
        $dep = Get-DeprecationInfo "agent" $f.BaseName
        if ($dep.Deprecated) {
            $deprecatedAgents += [pscustomobject]@{ Name = $f.BaseName; Successor = $dep.Successor }
        } else {
            $activeAgents += $f.BaseName
        }
    }
}
foreach ($alias in $deprecatedAliasRows | Where-Object { $_.state -eq "removed" }) {
    if ($alias.kind -eq "rule") { $deprecatedRules += [pscustomobject]@{ Name = $alias.name; Successor = $alias.successor } }
    if ($alias.kind -eq "skill") { $deprecatedSkills += [pscustomobject]@{ Name = $alias.name; Successor = $alias.successor } }
    if ($alias.kind -eq "agent") { $deprecatedAgents += [pscustomobject]@{ Name = $alias.name; Successor = $alias.successor } }
}
$activeRuleCount = $activeRules.Count
$activeSkillCount = $activeSkills.Count
$activeAgentCount = $activeAgents.Count
$deprecatedRuleCount = $deprecatedRules.Count
$deprecatedSkillCount = $deprecatedSkills.Count
$deprecatedAgentCount = $deprecatedAgents.Count
$MarkdownTick = [char]96

$content = @"
<!-- AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
Generated from: .ai/core + .ai/routing + .ai/catalog/rules/ + .ai/catalog/skills/ + .ai/catalog/agents-source/
To regenerate: Run pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 or .\tools\deploy-all.ps1
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
- Core: [.ai/core/](.ai/core/)
- Routing: [.ai/routing/](.ai/routing/)
- Environment diff (Claude Code): [.ai/adapters/claude-code/kernel.md](.ai/adapters/claude-code/kernel.md)
---

## Unified Coordinator

全タスクの単一入口は **pied-piper** agent。
Rule/Skill/Agent の選定は [.ai/routing/router.md](.ai/routing/router.md) の決定木と **unified-router** skill に従い、
候補を増やさず必要十分な候補へ圧縮し、発火前に候補・理由・期待効果を報告する。

Skill、Agent、サブエージェント、並列 orchestration、外部 MCP/API、P2/P3 操作が関わる場合は、原則として **候補提示 → ユーザー承認 → 発火** の順に進める。P1 read-only の単独低リスク探索のみ、短い事前報告後に自動実行できる。

自然言語の承認は柔らかく拾うが、一意でない場合は再確認する。${MarkdownTick}おすすめで${MarkdownTick} / ${MarkdownTick}推奨で${MarkdownTick} / ${MarkdownTick}Aで${MarkdownTick} / ${MarkdownTick}1で${MarkdownTick} は対象が一意の直前候補に結びつく場合のみ承認扱い。${MarkdownTick}それで${MarkdownTick} / ${MarkdownTick}進めて${MarkdownTick} / ${MarkdownTick}承認${MarkdownTick} / ${MarkdownTick}OK${MarkdownTick} は単独候補の場合のみ承認扱い。

${MarkdownTick}いい感じに${MarkdownTick} / ${MarkdownTick}任せる${MarkdownTick} / ${MarkdownTick}おまかせ${MarkdownTick} / ${MarkdownTick}よさそう${MarkdownTick} / ${MarkdownTick}よさげ${MarkdownTick} / ${MarkdownTick}たぶん${MarkdownTick} / ${MarkdownTick}多分${MarkdownTick} は承認にせず、候補提示または再確認に戻す。${MarkdownTick}キャンセル${MarkdownTick} / ${MarkdownTick}中止${MarkdownTick} は却下、${MarkdownTick}別案${MarkdownTick} / ${MarkdownTick}別の案${MarkdownTick} / ${MarkdownTick}軽く${MarkdownTick} は再提案として扱う。

${MarkdownTick}.ai/routing/state/gate-state.json${MarkdownTick} に ${MarkdownTick}proposal_state.status = proposed|refined${MarkdownTick} がある場合、短い次発話は通常ルーティングより先に直前提案への返答として解釈する。承認・却下・修正・曖昧の分類は ${MarkdownTick}tools/lib/gate-state.ps1${MarkdownTick} の proposal state machine に従う。

## Completion Review Proposal

実装・修正・生成物・設定変更・MCP/API 変更・source-of-truth 変更などの完成物がある場合、完了報告前に ${MarkdownTick}a/${MarkdownTick} Review Gate + ${MarkdownTick}code-reviewer${MarkdownTick} 相当のレビュー実行を提案する。レビューは自動実行せず、採用候補・理由・期待効果・承認が必要な理由を示し、ユーザー承認後に発火する。trivial docs/typo、read-only 調査、またはユーザーがレビュー不要を明示した場合は省略できる。

## Runtime Memory Preflight

「これどう？」「サトシ開発目線で」「前と同じ観点で」「入れる価値ある？」「導入して」「置き換える必要ある？」「また同じエラー」「過去判断も踏まえて」など、過去判断が品質に影響する相談では、利用可能な runtime memory を着手前に確認する。

agentmemory 互換 backend が使える場合は、同種タスク、関連ファイルの過去判断、採用/非採用ポリシー、検証済みコマンドを短く検索する。使えない場合は通常の repo 探索へフォールバックする。memory recall は正本ではなく、${MarkdownTick}.ai/catalog${MarkdownTick} / ${MarkdownTick}.ai/core${MarkdownTick} / repo artifact / 現在の git 状態を優先する。

詳細：
- [.ai/routing/coordinator.md](.ai/routing/coordinator.md)
- [.ai/routing/router.md](.ai/routing/router.md)
- [.ai/routing/integration.md](.ai/routing/integration.md)
"@

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($OutputPath, ($content.TrimEnd() + [Environment]::NewLine), $utf8)

Write-ClaudeStatus -Message "  [OK] CLAUDE.md"
Write-ClaudeStatus -Message ""
