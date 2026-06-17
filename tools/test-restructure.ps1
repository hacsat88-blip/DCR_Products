#Requires -Version 5.1
<#
.SYNOPSIS
  Concept-zone restructure verification (structure + content preservation).
.DESCRIPTION
  新ゾーンの存在・移行ファイルの存在・統合ファイルの内容保全を検証する。
  各タスクでアサーションを追記していく。throw で fail を表現。
#>
param([string]$RepoRoot = "")
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) { $RepoRoot = Split-Path $PSScriptRoot -Parent }

function Assert-Path {
    param([string]$Rel)
    $full = Join-Path $RepoRoot $Rel
    if (-not (Test-Path $full)) { throw "MISSING required path: $Rel" }
}
function Assert-FileContains {
    param([string]$Rel, [string]$Needle)
    $full = Join-Path $RepoRoot $Rel
    if (-not (Test-Path $full)) { throw "MISSING file: $Rel" }
    $text = Get-Content $full -Raw
    if ($text -notmatch [regex]::Escape($Needle)) { throw "$Rel missing required text: $Needle" }
}

# --- Task 1: zones exist ---
$zones = @(".ai/core", ".ai/routing", ".ai/routing/gates", ".ai/routing/state",
           ".ai/catalog/playbooks", ".ai/adapters", ".ai/_generated")
foreach ($z in $zones) { Assert-Path $z }

# --- Task 2: core single-source files ---
Assert-Path ".ai/core/kernel.md"
Assert-Path ".ai/core/identity.md"
Assert-Path ".ai/core/safety.md"
Assert-Path ".ai/core/quality-floor.md"
Assert-Path ".ai/core/context-efficiency.md"
Assert-Path ".ai/core/runtime.md"
Assert-Path ".ai/core/tool-contract.md"

# --- Task 3: permissions merge (no content loss) ---
Assert-Path ".ai/core/permissions.md"
$permHeadings = @("P1", "P2", "P3", "Mechanical P3", "Safety Boundaries", "Routing approval overlay", "Priority", "Notes", "References")
foreach ($h in $permHeadings) { Assert-FileContains ".ai/core/permissions.md" $h }

# --- Task 4: routing single-source + gates + state ---
Assert-Path ".ai/routing/coordinator.md"
Assert-Path ".ai/routing/integration.md"
Assert-Path ".ai/routing/triggers.md"
Assert-Path ".ai/routing/gates/trigger-model-route.md"
Assert-Path ".ai/routing/state/gate-state.json"
Assert-Path ".ai/routing/state/gate-state.schema.json"
Assert-Path ".ai/routing/state/router-decisions.jsonl"

# --- Task 5: router merge (3->1, no content loss) ---
Assert-Path ".ai/routing/router.md"
Assert-Path ".ai/routing/design.md"
$routerHeadings = @(
    "決定木（優先順位順）",
    "confidence 計算",
    "発火モード",
    "Cognitive Load Contract",
    "Proposal State Machine",
    "V5 自然語フィードバックループ",
    "V6 CLI/IDE 統合仕上げ",
    "発火前提案テンプレート",
    "親ハブ優先ルール",
    "後継の自動転送（alias）",
    "親 → 子の階層解決",
    "同一 phase での並列ルーティング",
    "前後工程 agent の挿入",
    "ルーティング結果のスキーマ",
    "ユーザー個人設定（CLAUDE.local.md / AGENTS.local.md）の優先関係",
    "関係ファイル",
    "決定ログ書き込み義務（Mandatory）",
    "Migration Note",
    "Priority",
    "Alias Resolution",
    "Confidence Bands",
    "Agent Design Lens",
    "Proposal State",
    "Parent Hubs",
    "Cross-Environment Consistency",
    "Fixture Evaluation",
    "結論",
    "現状の事実",
    "制約",
    "設計方針",
    "単一ソース原則",
    "自動参照の安全条件",
    "参照優先順位",
    "ルーティング規則",
    "高一致の判定軸",
    "ルーティング例",
    "エディタ別マッピング",
    "推奨する運用",
    "品質ガード",
    "実装フェーズ",
    "この設計で避けられる事故",
    "未解決事項",
    "推奨決定"
)
foreach ($h in $routerHeadings) {
    $inRouter = (Get-Content (Join-Path $RepoRoot ".ai/routing/router.md") -Raw) -match [regex]::Escape($h)
    $inDesign = (Get-Content (Join-Path $RepoRoot ".ai/routing/design.md") -Raw) -match [regex]::Escape($h)
    if (-not ($inRouter -or $inDesign)) { throw "router merge lost heading: $h" }
}

# --- Task 6: playbooks + gates overview + governance docs ---
Assert-Path ".ai/catalog/playbooks/architecture.md"
Assert-Path ".ai/catalog/playbooks/debugging.md"
Assert-Path ".ai/catalog/playbooks/review.md"
Assert-Path ".ai/catalog/playbooks/prompting.md"
Assert-Path ".ai/routing/gates.md"
Assert-Path "docs/dcr/deprecation-lifecycle.md"
Assert-Path "docs/dcr/hub-promotion-criteria.md"

# --- Task 7: adapters env diffs + templates ---
Assert-Path ".ai/adapters/claude-code/kernel.md"
Assert-Path ".ai/adapters/codex/kernel.md"
Assert-Path ".ai/adapters/cursor/kernel.md"
Assert-Path ".ai/adapters/vscode-copilot/kernel.md"
Assert-Path ".ai/adapters/project-context.md"

# --- Task 8: deploy manifest ---
Assert-Path ".ai/adapters/manifest.yaml"
Assert-FileContains ".ai/adapters/manifest.yaml" "CLAUDE.md"
Assert-FileContains ".ai/adapters/manifest.yaml" "AGENTS.md"
Assert-FileContains ".ai/adapters/manifest.yaml" "copilot-instructions.md"

# --- Task 9: external footprint ledger ---
Assert-Path ".ai/adapters/external-footprint.md"
Assert-FileContains ".ai/adapters/external-footprint.md" "~/.config/dcr/config.json"

# --- Task 10: bootstrap script ---
Assert-Path ".ai/adapters/bootstrap.ps1"
Assert-FileContains ".ai/adapters/bootstrap.ps1" "install-git-hooks"
Assert-FileContains ".ai/adapters/bootstrap.ps1" "external-footprint"

Write-Host "restructure test passed" -ForegroundColor Green
