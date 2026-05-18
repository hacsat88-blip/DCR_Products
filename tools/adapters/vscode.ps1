param([string]$RepoRoot = ".")

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"

Write-Host "[vscode] Generating .github/copilot-instructions.md..." -ForegroundColor Cyan

function Test-Deprecated($text) {
    if ($text -match '(?ms)^---(.*?)^---') {
        $fm = $Matches[1]
        if ($fm -match '(?m)^\s*deprecated\s*:\s*true\s*$') { return $true }
    }
    return $false
}

# Collect vscode-targeted rules and skills
$rules = @()
$skills = @()

# Check rules
foreach ($f in Get-ChildItem $rulesDir -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $text = Get-Content $f.FullName -Raw
    if (Test-Deprecated $text) { continue }
    if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
        $targets = [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | % { $_.Groups[1].Value }
    } else {
        $targets = @("vscode", "claude", "codex")
    }
    if ($targets -contains "vscode") {
        $rules += $f.BaseName
    }
}

# Check skills
foreach ($dir in Get-ChildItem $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $sf) {
        $text = Get-Content $sf -Raw
        if (Test-Deprecated $text) { continue }
        if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
            $targets = [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | % { $_.Groups[1].Value }
        } else {
            $targets = @("vscode", "claude", "codex")
        }
        if ($targets -contains "vscode") {
            $skills += $dir.Name
        }
    }
}

# Generate file
$ruleList = if ($rules) { (($rules | ForEach-Object { "- [$_](../../.ai/catalog/rules/$_.md)" }) -join "`n") } else { "(none)" }
$skillList = if ($skills) { (($skills | ForEach-Object { "- [$_](../../.ai/catalog/skills/$_/SKILL.md)" }) -join "`n") } else { "(none)" }
$MarkdownTick = [char]96

$content = @"
<!-- AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
Generated from: .ai/book + .ai/kernel + .ai/catalog/rules/ + .ai/catalog/skills/
To regenerate: Run pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# GitHub Copilot Instructions

Entrypoint for VS Code Copilot environment.

## Included Rules

$ruleList

## Included Skills

$skillList

---

## Unified Coordinator

全タスクの単一入口は **pied-piper** agent。Rule/Skill/Agent 選定は [.ai/module/unified-router.md](../../.ai/module/unified-router.md) の決定木に従い、候補を増やさず必要十分な候補へ圧縮し、発火前に候補・理由・期待効果を報告する。

Skill、Agent、サブエージェント、並列 orchestration、外部 MCP/API、P2/P3 操作が関わる場合は、原則として **候補提示 → ユーザー承認 → 発火** の順に進める。P1 read-only の単独低リスク探索のみ、短い事前報告後に自動実行できる。

自然言語の承認は柔らかく拾うが、一意でない場合は再確認する。${MarkdownTick}おすすめで${MarkdownTick} / ${MarkdownTick}推奨で${MarkdownTick} / ${MarkdownTick}Aで${MarkdownTick} / ${MarkdownTick}1で${MarkdownTick} は対象が一意の直前候補に結びつく場合のみ承認扱い。${MarkdownTick}それで${MarkdownTick} / ${MarkdownTick}進めて${MarkdownTick} / ${MarkdownTick}承認${MarkdownTick} / ${MarkdownTick}OK${MarkdownTick} は単独候補の場合のみ承認扱い。

${MarkdownTick}いい感じに${MarkdownTick} / ${MarkdownTick}任せる${MarkdownTick} / ${MarkdownTick}おまかせ${MarkdownTick} / ${MarkdownTick}よさそう${MarkdownTick} / ${MarkdownTick}よさげ${MarkdownTick} / ${MarkdownTick}たぶん${MarkdownTick} / ${MarkdownTick}多分${MarkdownTick} は承認にせず、候補提示または再確認に戻す。${MarkdownTick}キャンセル${MarkdownTick} / ${MarkdownTick}中止${MarkdownTick} は却下、${MarkdownTick}別案${MarkdownTick} / ${MarkdownTick}別の案${MarkdownTick} / ${MarkdownTick}軽く${MarkdownTick} は再提案として扱う。

${MarkdownTick}.ai/kernel/gate-state.json${MarkdownTick} に ${MarkdownTick}proposal_state.status = proposed|refined${MarkdownTick} がある場合、短い次発話は通常ルーティングより先に直前提案への返答として解釈する。承認・却下・修正・曖昧の分類は ${MarkdownTick}tools/lib/gate-state.ps1${MarkdownTick} の proposal state machine に従う。

---

## Runtime Memory Preflight

「これどう？」「サトシ開発目線で」「前と同じ観点で」「入れる価値ある？」「導入して」「置き換える必要ある？」「また同じエラー」「過去判断も踏まえて」など、過去判断が品質に影響する相談では、利用可能な runtime memory を着手前に確認する。

agentmemory 互換 backend が使える場合は、同種タスク、関連ファイルの過去判断、採用/非採用ポリシー、検証済みコマンドを短く検索する。使えない場合は通常の repo 探索へフォールバックする。memory recall は正本ではなく、`.ai/catalog` / `.ai/book` / repo artifact / 現在の git 状態を優先する。

---

Load priority: .ai/book/ > .ai/kernel/ > .ai/catalog/rules/ > .ai/catalog/skills/

For architecture details, see [docs/dcr/architecture/unified-adapter-system.md](../../docs/dcr/architecture/unified-adapter-system.md)
"@

$outDir = Join-Path $RepoRoot ".github"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$outPath = Join-Path $outDir "copilot-instructions.md"
$utf8 = New-Object System.Text.UTF8Encoding $false
$newline = "`n"
if (Test-Path $outPath) {
    $existingContent = [System.IO.File]::ReadAllText($outPath, [System.Text.Encoding]::UTF8)
    if ($existingContent -match "`r`n") { $newline = "`r`n" }
}
$normalizedContent = (($content -replace "`r`n?", "`n").TrimEnd() -replace "`n", $newline) + $newline
[System.IO.File]::WriteAllText($outPath, $normalizedContent, $utf8)

Write-Host "  [OK] .github/copilot-instructions.md" -ForegroundColor Green
