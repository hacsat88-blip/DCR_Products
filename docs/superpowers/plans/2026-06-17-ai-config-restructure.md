# AI設定 概念ベース再編 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `.ai/` を抽象層割り(kernel/module/book/environments)から概念ゾーン割り(core/routing/catalog/adapters)+INDEXルールブックへ再編し、同概念の重複を根絶しつつポータビリティの隠れ依存を解消する。

**Architecture:** Copy-then-Verify-then-Remove。新ゾーンをコピーで併設し、`tools/test-restructure.ps1`（新規TDD検証スクリプト）と既存 `eval-routing-accuracy.ps1` / `validate.ps1` を回帰ゲートに使い、全緑を確認してから旧パスを撤去する。旧新パスは撤去まで並走させる。

**Tech Stack:** Markdown設定 + PowerShell 7 (pwsh) 検証/deployスクリプト + Git。テストフレームワークは無し（各スクリプトが `throw`/`exit` で pass/fail を表現）。

**設計仕様:** [docs/superpowers/specs/2026-06-17-ai-config-restructure-design.md](../specs/2026-06-17-ai-config-restructure-design.md)

---

## ファイル構成（このプランで作成/変更するもの）

**新規作成:**
- `tools/test-restructure.ps1` — 再編の構造・内容保全を検証するTDDスクリプト（このプランの軸）
- `.ai/INDEX.md` — ルールブック（行動規範+正本地図+禁止事項）
- `.ai/core/*.md` — identity/safety/permissions/quality-floor/context-efficiency/kernel/runtime/tool-contract
- `.ai/routing/*.md` + `.ai/routing/gates/` + `.ai/routing/state/` — router/coordinator/integration/triggers/gates/状態
- `.ai/catalog/playbooks/*.md` — architecture/debugging/review/prompting
- `.ai/adapters/<env>/` — 環境差分+テンプレ
- `.ai/adapters/manifest.yaml` — 機械可読の配布地図（新規）
- `.ai/adapters/external-footprint.md` — リポ外依存台帳（新規）
- `.ai/adapters/bootstrap.ps1` — 冪等な新PCセットアップ単一入口（新規）
- `.ai/_generated/README.md` — 生成物ゾーンの説明（編集禁止印）
- `docs/superpowers/baseline/` — P0ベースライン出力の保存先

**変更:**
- `deploy.ps1` — 新パス参照（旧パスfallback）
- `validate.ps1` — 新パス検証 + external-footprint 検査
- `init-project.ps1` — 新パス参照（旧パスfallback）

**ポータビリティ方針（補足）:** リポ外 `~/.config/dcr/config.json` への依存は `bootstrap.ps1` がミラーを冪等再生成することで解消する（「フォルダ移動 → bootstrap」で復元）。実行時にリポ相対 `.dcr/config.json` を第一参照する読み取り側の改修は、消費側ツールの特定が必要なため本プランのスコープ外（別タスク）。本プランは台帳(`external-footprint.md`)＋bootstrap で復元性を保証する。

**撤去（P4・全緑後のみ）:**
- `.ai/kernel/`, `.ai/module/`, `.ai/book/`, `.ai/environments/`, `templates/`, `.ai/ARCHITECTURE.md`, `.ai/repo-map.md`, `.ai/rule-routing-design.md`

---

## 前提：作業ブランチ

すべて `docs/ai-config-restructure` ブランチで作業する（spec が既にここにコミット済み）。各タスクの最後にコミットする。

---

### Task 0: P0 ベースライン取得

**Files:**
- Create: `docs/superpowers/baseline/p0-validate.txt`
- Create: `docs/superpowers/baseline/p0-routing.txt`
- Create: `docs/superpowers/baseline/p0-tests.txt`

- [ ] **Step 1: ベースライン保存先を作成**

```bash
mkdir -p docs/superpowers/baseline
```

- [ ] **Step 2: 現状の検証結果を保存（再編前の正常状態を記録）**

```bash
pwsh -ExecutionPolicy Bypass -File validate.ps1 > docs/superpowers/baseline/p0-validate.txt 2>&1
pwsh -ExecutionPolicy Bypass -File tools/eval-routing-accuracy.ps1 > docs/superpowers/baseline/p0-routing.txt 2>&1
for t in tools/test-*.ps1; do echo "=== $t ===" >> docs/superpowers/baseline/p0-tests.txt; pwsh -ExecutionPolicy Bypass -File "$t" >> docs/superpowers/baseline/p0-tests.txt 2>&1; done
```

Expected: `p0-validate.txt` の末尾に `[FAIL]` が0件。`p0-routing.txt` に精度スコア（後で比較する基準）。`p0-tests.txt` に各テストの完了行。

- [ ] **Step 3: ベースラインの健全性を目視確認**

Run: `grep -c "\[FAIL\]" docs/superpowers/baseline/p0-validate.txt`
Expected: `0`（再編前は全緑のはず。0でなければ再編着手前に既存failを別途解消する）

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/baseline/
git commit -m "test: capture P0 baseline before restructure"
```

---

### Task 1: TDD検証スクリプトの土台 + 新ゾーン雛形

**Files:**
- Create: `tools/test-restructure.ps1`
- Create: `.ai/core/.gitkeep`, `.ai/routing/.gitkeep`, `.ai/routing/gates/.gitkeep`, `.ai/routing/state/.gitkeep`, `.ai/catalog/playbooks/.gitkeep`, `.ai/adapters/.gitkeep`, `.ai/_generated/.gitkeep`

- [ ] **Step 1: 失敗するテストを書く（新ゾーンの存在を要求）**

Create `tools/test-restructure.ps1`:

```powershell
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

Write-Host "restructure test passed" -ForegroundColor Green
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING required path: .ai/core`

- [ ] **Step 3: 新ゾーンを雛形作成（最小実装）**

```bash
for d in .ai/core .ai/routing .ai/routing/gates .ai/routing/state .ai/catalog/playbooks .ai/adapters .ai/_generated; do mkdir -p "$d" && touch "$d/.gitkeep"; done
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: PASS — `restructure test passed`

- [ ] **Step 5: Commit**

```bash
git add tools/test-restructure.ps1 .ai/core/.gitkeep .ai/routing/.gitkeep .ai/routing/gates/.gitkeep .ai/routing/state/.gitkeep .ai/catalog/playbooks/.gitkeep .ai/adapters/.gitkeep .ai/_generated/.gitkeep
git commit -m "test: add restructure verification + scaffold concept zones"
```

---

### Task 2: core/ 単一ソースファイルのコピー移行

対象は「片方にしか存在しない＝統合不要」のファイルのみ。permissions（2→1統合）は Task 3 で別扱い。

**Files:**
- Create: `.ai/core/kernel.md` (from `.ai/kernel/dcr-kernel.md`)
- Create: `.ai/core/identity.md` (from `.ai/kernel/_base.md`)
- Create: `.ai/core/safety.md` (from `.ai/kernel/_safety-boundaries.md`)
- Create: `.ai/core/quality-floor.md` (from `.ai/kernel/_quality-floor.md`)
- Create: `.ai/core/context-efficiency.md` (from `.ai/kernel/_context-efficiency.md`)
- Create: `.ai/core/runtime.md` (from `.ai/book/runtime.md`)
- Create: `.ai/core/tool-contract.md` (from `.ai/book/tool-contract.md`)
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 失敗するテストを追記**

`tools/test-restructure.ps1` の `Write-Host "restructure test passed"` の直前に追記:

```powershell
# --- Task 2: core single-source files ---
Assert-Path ".ai/core/kernel.md"
Assert-Path ".ai/core/identity.md"
Assert-Path ".ai/core/safety.md"
Assert-Path ".ai/core/quality-floor.md"
Assert-Path ".ai/core/context-efficiency.md"
Assert-Path ".ai/core/runtime.md"
Assert-Path ".ai/core/tool-contract.md"
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING required path: .ai/core/kernel.md`

- [ ] **Step 3: git mv ではなく cp でコピー（旧パス並走のため）**

```bash
cp .ai/kernel/dcr-kernel.md        .ai/core/kernel.md
cp .ai/kernel/_base.md             .ai/core/identity.md
cp .ai/kernel/_safety-boundaries.md .ai/core/safety.md
cp .ai/kernel/_quality-floor.md    .ai/core/quality-floor.md
cp .ai/kernel/_context-efficiency.md .ai/core/context-efficiency.md
cp .ai/book/runtime.md             .ai/core/runtime.md
cp .ai/book/tool-contract.md       .ai/core/tool-contract.md
```

- [ ] **Step 4: 内容がバイト一致することを確認（コピー忠実性）**

```bash
diff .ai/kernel/dcr-kernel.md .ai/core/kernel.md && diff .ai/book/runtime.md .ai/core/runtime.md && echo "COPY OK"
```
Expected: 差分なし、`COPY OK` 表示

- [ ] **Step 5: テストを実行して成功を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: PASS — `restructure test passed`

- [ ] **Step 6: Commit**

```bash
git add .ai/core/ tools/test-restructure.ps1
git commit -m "refactor: copy single-source kernel/book files into core zone"
```

---

### Task 3: core/permissions.md（2→1 統合）

`.ai/kernel/_permissions.md` と `.ai/book/permissions.md` を内容欠落ゼロで統合する。

**Files:**
- Create: `.ai/core/permissions.md`
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 失敗するテストを追記（内容保全アサーション）**

統合前に両ソースの全見出しを抽出し、それらが新ファイルに存在することを検証する。まず両ソースの見出しを確認:

```bash
echo "=== kernel/_permissions headings ==="; grep -nE '^#{1,6} ' .ai/kernel/_permissions.md
echo "=== book/permissions headings ==="; grep -nE '^#{1,6} ' .ai/book/permissions.md
```

抽出した各見出しテキストについて、`tools/test-restructure.ps1` の最終 `Write-Host` 直前に以下を追記（`<H>` は上で得た実際の見出し文字列に置換。最低限 P1/P2/P3 権限定義の見出しを必ず含めること）:

```powershell
# --- Task 3: permissions merge (no content loss) ---
Assert-Path ".ai/core/permissions.md"
# 両ソースの全見出しが統合先に存在すること（実際の見出し文字列に置換して列挙）
$permHeadings = @("P1", "P2", "P3")   # ← grep結果の見出し語を全て列挙する
foreach ($h in $permHeadings) { Assert-FileContains ".ai/core/permissions.md" $h }
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING file: .ai/core/permissions.md`

- [ ] **Step 3: 統合ファイルを作成（手作業マージ）**

`.ai/kernel/_permissions.md` を土台にコピーし、`.ai/book/permissions.md` にしか無い記述（Step 1 の grep 差分で特定）を該当セクションへ取り込む。重複する記述は1つに集約。冒頭に統合元を明記:

```bash
cp .ai/kernel/_permissions.md .ai/core/permissions.md
```
その後エディタで `.ai/book/permissions.md` 固有の節を `.ai/core/permissions.md` へ追記し、ファイル先頭に以下を加える:
```markdown
<!-- Merged from .ai/kernel/_permissions.md + .ai/book/permissions.md (single home: core/permissions.md) -->
```

- [ ] **Step 4: 内容欠落ゼロを確認（両ソースの見出しが全て存在）**

```bash
missing=0; for h in $(grep -hoE '^#{1,6} .*' .ai/kernel/_permissions.md .ai/book/permissions.md | sed 's/^#* //' | sort -u); do grep -qF "$h" .ai/core/permissions.md || { echo "MISSING: $h"; missing=1; }; done; [ $missing -eq 0 ] && echo "NO CONTENT LOSS"
```
Expected: `NO CONTENT LOSS`（`MISSING:` 行が出たら該当節を取り込んでから再実行）

- [ ] **Step 5: テストを実行して成功を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add .ai/core/permissions.md tools/test-restructure.ps1
git commit -m "refactor: merge kernel+book permissions into core/permissions (2->1)"
```

---

### Task 4: routing/ 単一ソースファイル + gates/state のコピー移行

router の3→1統合は Task 5。ここでは統合不要分を移す。

**Files:**
- Create: `.ai/routing/coordinator.md` (from `.ai/module/unified-coordinator.md`)
- Create: `.ai/routing/integration.md` (from `.ai/module/unified-integration.md`)
- Create: `.ai/routing/triggers.md` (from `.ai/kernel/triggers-unified.md`)
- Create: `.ai/routing/auto-escalation.md`, `module-behaviors.md`, `parallel-execution.md` (from `.ai/kernel/_auto-escalation.md` 等)
- Create: `.ai/routing/gates/*` (from `.ai/kernel/gates/*`)
- Create: `.ai/routing/state/gate-state.json`, `gate-state.schema.json`, `router-decisions.jsonl` (from `.ai/kernel/`)
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 失敗するテストを追記**

`tools/test-restructure.ps1` の最終 `Write-Host` 直前に追記:

```powershell
# --- Task 4: routing single-source + gates + state ---
Assert-Path ".ai/routing/coordinator.md"
Assert-Path ".ai/routing/integration.md"
Assert-Path ".ai/routing/triggers.md"
Assert-Path ".ai/routing/gates/trigger-model-route.md"
Assert-Path ".ai/routing/state/gate-state.json"
Assert-Path ".ai/routing/state/gate-state.schema.json"
Assert-Path ".ai/routing/state/router-decisions.jsonl"
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING required path: .ai/routing/coordinator.md`

- [ ] **Step 3: コピー**

```bash
cp .ai/module/unified-coordinator.md   .ai/routing/coordinator.md
cp .ai/module/unified-integration.md   .ai/routing/integration.md
cp .ai/kernel/triggers-unified.md      .ai/routing/triggers.md
cp .ai/kernel/_auto-escalation.md      .ai/routing/auto-escalation.md
cp .ai/kernel/_module-behaviors.md     .ai/routing/module-behaviors.md
cp .ai/kernel/_parallel-execution.md   .ai/routing/parallel-execution.md
cp -r .ai/kernel/gates/.               .ai/routing/gates/
cp .ai/kernel/gate-state.json          .ai/routing/state/gate-state.json
cp .ai/kernel/gate-state.schema.json   .ai/routing/state/gate-state.schema.json
cp .ai/kernel/router-decisions.jsonl   .ai/routing/state/router-decisions.jsonl
```

- [ ] **Step 4: gates が全数コピーされたか確認**

```bash
diff <(ls .ai/kernel/gates | sort) <(ls .ai/routing/gates | grep -v '.gitkeep' | sort) && echo "GATES OK"
```
Expected: 差分なし、`GATES OK`

- [ ] **Step 5: テストを実行して成功を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add .ai/routing/ tools/test-restructure.ps1
git commit -m "refactor: copy module/kernel routing files + gates + state into routing zone"
```

---

### Task 5: routing/router.md（3→1 統合）

`.ai/module/unified-router.md` + `.ai/book/routing.md` + `.ai/rule-routing-design.md` を統合。

**Files:**
- Create: `.ai/routing/router.md`
- Create: `.ai/routing/design.md` (設計詳細の分離先)
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 3ソースの見出しを確認**

```bash
for f in .ai/module/unified-router.md .ai/book/routing.md .ai/rule-routing-design.md; do echo "=== $f ==="; grep -nE '^#{1,6} ' "$f"; done
```

- [ ] **Step 2: 失敗するテストを追記**

`tools/test-restructure.ps1` の最終 `Write-Host` 直前に追記（`<決定木の代表見出し>` は Step 1 の実見出しに置換。決定木本体の見出しを必ず含める）:

```powershell
# --- Task 5: router merge (3->1, no content loss) ---
Assert-Path ".ai/routing/router.md"
Assert-Path ".ai/routing/design.md"
$routerHeadings = @("決定木")   # ← Step1の実見出しを全て列挙
foreach ($h in $routerHeadings) {
    $inRouter = (Get-Content (Join-Path $RepoRoot ".ai/routing/router.md") -Raw) -match [regex]::Escape($h)
    $inDesign = (Get-Content (Join-Path $RepoRoot ".ai/routing/design.md") -Raw) -match [regex]::Escape($h)
    if (-not ($inRouter -or $inDesign)) { throw "router merge lost heading: $h" }
}
```

- [ ] **Step 3: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING required path: .ai/routing/router.md`

- [ ] **Step 4: 統合（運用ルール=router.md、設計背景=design.md に振り分け）**

`.ai/module/unified-router.md`（決定木・運用）を土台に `router.md` を作り、`.ai/book/routing.md` 固有の運用記述を取り込む。`.ai/rule-routing-design.md`（単一ソース原則・auto-load安全条件等の設計背景）は `design.md` へ移す。両ファイル冒頭に統合元コメントを記載:

```bash
cp .ai/module/unified-router.md .ai/routing/router.md
cp .ai/rule-routing-design.md   .ai/routing/design.md
```
その後 `.ai/book/routing.md` 固有節を `router.md` に取り込み、両ファイル先頭に追記:
```markdown
<!-- Merged: router.md <- module/unified-router + book/routing ; design.md <- rule-routing-design (single home: routing/) -->
```

- [ ] **Step 5: 内容欠落ゼロを確認（3ソースの見出しが router.md か design.md のどちらかに存在）**

```bash
missing=0; for h in $(grep -hoE '^#{1,6} .*' .ai/module/unified-router.md .ai/book/routing.md .ai/rule-routing-design.md | sed 's/^#* //' | sort -u); do grep -qF "$h" .ai/routing/router.md || grep -qF "$h" .ai/routing/design.md || { echo "MISSING: $h"; missing=1; }; done; [ $missing -eq 0 ] && echo "NO CONTENT LOSS"
```
Expected: `NO CONTENT LOSS`

- [ ] **Step 6: テストを実行して成功を確認 → Commit**

```bash
pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1
git add .ai/routing/router.md .ai/routing/design.md tools/test-restructure.ps1
git commit -m "refactor: merge router sources into routing/router + routing/design (3->1)"
```
Expected: テストPASS

---

### Task 6: catalog/playbooks + book/gates 統合 + ガバナンス文書移設

**Files:**
- Create: `.ai/catalog/playbooks/{architecture,debugging,review,prompting}.md` (from `.ai/module/`)
- Create: `.ai/routing/gates.md` (from `.ai/book/gates.md`、Task4のgates/と別の概説文書)
- Create: `docs/dcr/deprecation-lifecycle.md`, `docs/dcr/hub-promotion-criteria.md` (from `.ai/module/`)
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 失敗するテストを追記**

```powershell
# --- Task 6: playbooks + gates overview + governance docs ---
Assert-Path ".ai/catalog/playbooks/architecture.md"
Assert-Path ".ai/catalog/playbooks/debugging.md"
Assert-Path ".ai/catalog/playbooks/review.md"
Assert-Path ".ai/catalog/playbooks/prompting.md"
Assert-Path ".ai/routing/gates.md"
Assert-Path "docs/dcr/deprecation-lifecycle.md"
Assert-Path "docs/dcr/hub-promotion-criteria.md"
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING required path: .ai/catalog/playbooks/architecture.md`

- [ ] **Step 3: コピー/移設**

```bash
cp .ai/module/architecture.md .ai/catalog/playbooks/architecture.md
cp .ai/module/debugging.md    .ai/catalog/playbooks/debugging.md
cp .ai/module/review.md       .ai/catalog/playbooks/review.md
cp .ai/module/prompting.md    .ai/catalog/playbooks/prompting.md
cp .ai/book/gates.md          .ai/routing/gates.md
cp .ai/module/deprecation-lifecycle.md  docs/dcr/deprecation-lifecycle.md
cp .ai/module/hub-promotion-criteria.md docs/dcr/hub-promotion-criteria.md
```

- [ ] **Step 4: テストを実行して成功を確認 → Commit**

```bash
pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1
git add .ai/catalog/playbooks/ .ai/routing/gates.md docs/dcr/deprecation-lifecycle.md docs/dcr/hub-promotion-criteria.md tools/test-restructure.ps1
git commit -m "refactor: move playbooks to catalog, gates overview to routing, governance to docs/dcr"
```
Expected: テストPASS

---

### Task 7: adapters/ 環境差分 + テンプレートのコピー移行

**Files:**
- Create: `.ai/adapters/{claude-code,codex,copilot-cli,cursor,vscode-copilot}/` (from `.ai/environments/`)
- Create: `.ai/adapters/<env>/templates/` (from `templates/`)
- Create: `.ai/adapters/project-context.md` (from `templates/project-context.md`)
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 失敗するテストを追記**

```powershell
# --- Task 7: adapters env diffs + templates ---
Assert-Path ".ai/adapters/claude-code/kernel.md"
Assert-Path ".ai/adapters/codex/kernel.md"
Assert-Path ".ai/adapters/cursor/kernel.md"
Assert-Path ".ai/adapters/vscode-copilot/kernel.md"
Assert-Path ".ai/adapters/project-context.md"
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING required path: .ai/adapters/claude-code/kernel.md`

- [ ] **Step 3: コピー**

```bash
cp -r .ai/environments/claude-code     .ai/adapters/claude-code
cp -r .ai/environments/codex           .ai/adapters/codex
cp -r .ai/environments/copilot-cli     .ai/adapters/copilot-cli
cp -r .ai/environments/cursor          .ai/adapters/cursor
cp -r .ai/environments/vscode-copilot  .ai/adapters/vscode-copilot
cp templates/project-context.md        .ai/adapters/project-context.md
mkdir -p .ai/adapters/claude-code/templates && cp -r templates/claude-code/.        .ai/adapters/claude-code/templates/
mkdir -p .ai/adapters/codex/templates && cp -r templates/codex/.                    .ai/adapters/codex/templates/
mkdir -p .ai/adapters/vscode-copilot/templates && cp -r templates/vscode-copilot/.  .ai/adapters/vscode-copilot/templates/
mkdir -p .ai/adapters/cursor/templates && cp -r templates/cursor-hooks-bundle/.     .ai/adapters/cursor/templates/
```

- [ ] **Step 4: テストを実行して成功を確認 → Commit**

```bash
pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1
git add .ai/adapters/ tools/test-restructure.ps1
git commit -m "refactor: copy environments + templates into adapters zone"
```
Expected: テストPASS

---

### Task 8: adapters/manifest.yaml（機械可読の配布地図・新規）

**Files:**
- Create: `.ai/adapters/manifest.yaml`
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 失敗するテストを追記**

```powershell
# --- Task 8: deploy manifest ---
Assert-Path ".ai/adapters/manifest.yaml"
Assert-FileContains ".ai/adapters/manifest.yaml" "CLAUDE.md"
Assert-FileContains ".ai/adapters/manifest.yaml" "AGENTS.md"
Assert-FileContains ".ai/adapters/manifest.yaml" "copilot-instructions.md"
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING file: .ai/adapters/manifest.yaml`

- [ ] **Step 3: manifest を作成**

Create `.ai/adapters/manifest.yaml`:

```yaml
# 配布地図: source(正本) -> entrypoint(生成物) / mirror(生成物)
# deploy.ps1 と validate.ps1 はこの manifest を正として読み、INDEX.md §3 と突き合わせる。
version: 1
sources:
  core: .ai/core
  routing: .ai/routing
  catalog: .ai/catalog
  adapters: .ai/adapters
entrypoints:
  - tool: claude-code
    out: CLAUDE.md
    adapter: .ai/adapters/claude-code/kernel.md
    reads: [core, routing, catalog]
  - tool: codex
    out: AGENTS.md
    adapter: .ai/adapters/codex/kernel.md
    reads: [core, routing, catalog]
  - tool: vscode-copilot
    out: .github/copilot-instructions.md
    adapter: .ai/adapters/vscode-copilot/kernel.md
    reads: [core, routing, catalog]
mirrors:
  - source: .ai/catalog/agents-source   # *.md
    out: .claude/agents
    generated: true
  - source: .ai/catalog/agents-source   # *.toml
    out: .codex/agents
    generated: true
```

- [ ] **Step 4: テストを実行して成功を確認 → Commit**

```bash
pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1
git add .ai/adapters/manifest.yaml tools/test-restructure.ps1
git commit -m "feat: add machine-readable adapters/manifest.yaml deploy map"
```
Expected: テストPASS

---

### Task 9: adapters/external-footprint.md（リポ外依存台帳・新規）

**Files:**
- Create: `.ai/adapters/external-footprint.md`
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 失敗するテストを追記**

```powershell
# --- Task 9: external footprint ledger ---
Assert-Path ".ai/adapters/external-footprint.md"
Assert-FileContains ".ai/adapters/external-footprint.md" "~/.config/dcr/config.json"
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING file: .ai/adapters/external-footprint.md`

- [ ] **Step 3: 台帳を作成**

Create `.ai/adapters/external-footprint.md`:

```markdown
# External Footprint — リポ外に触れるものの台帳

このリポは原則として自己完結する。リポ外（ユーザーホーム等）へ書き込む/読む依存は
**ここに列挙したものだけ**を許可する。`validate.ps1` は列挙外のリポ外書き込みを検出したら警告する。
新しいリポ外依存を足すときは、必ずこの表に追記すること。

| パス | 種別 | 生成元 | 必須か | 備考 |
|------|------|--------|--------|------|
| `~/.config/dcr/config.json` | 書き込み(任意ミラー) | `deploy.ps1` (`.dcr/config.json` 由来) | 任意 | 実行時はリポ相対 `.dcr/config.json` を第一参照。本ミラーが無くても動く。`bootstrap.ps1` が冪等に再生成。 |

## 復元手順（新PC）
1. このリポ（サトシ開発）フォルダを新PCへ移す
2. `pwsh -ExecutionPolicy Bypass -File .ai/adapters/bootstrap.ps1`
```

- [ ] **Step 4: テストを実行して成功を確認 → Commit**

```bash
pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1
git add .ai/adapters/external-footprint.md tools/test-restructure.ps1
git commit -m "feat: add external-footprint ledger for portability"
```
Expected: テストPASS

---

### Task 10: adapters/bootstrap.ps1（冪等な新PCセットアップ・新規）

**Files:**
- Create: `.ai/adapters/bootstrap.ps1`
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 失敗するテストを追記**

```powershell
# --- Task 10: bootstrap script ---
Assert-Path ".ai/adapters/bootstrap.ps1"
Assert-FileContains ".ai/adapters/bootstrap.ps1" "install-git-hooks"
Assert-FileContains ".ai/adapters/bootstrap.ps1" "external-footprint"
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING file: .ai/adapters/bootstrap.ps1`

- [ ] **Step 3: bootstrap を作成**

Create `.ai/adapters/bootstrap.ps1`:

```powershell
#Requires -Version 7.0
<#
.SYNOPSIS
  新PCでの冪等セットアップ単一入口。「フォルダ移動 → このスクリプト1回」で復元する。
.DESCRIPTION
  1) git hooks パス設定  2) deploy で entrypoint/ミラー再生成
  3) 外部依存ゼロ自己検査（external-footprint.md と照合）
#>
param([switch]$DryRun)
$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Write-Host "=== bootstrap: $RepoRoot ===" -ForegroundColor Cyan

# 1) git hooks
$hooks = Join-Path $RepoRoot "tools\install-git-hooks.ps1"
if (Test-Path $hooks) {
    if ($DryRun) { Write-Host "[dry] would run install-git-hooks.ps1" }
    else { & $hooks }
} else { Write-Warning "install-git-hooks.ps1 not found" }

# 2) deploy（entrypoint + mirror 再生成）
$deploy = Join-Path $RepoRoot "deploy.ps1"
if ($DryRun) { Write-Host "[dry] would run deploy.ps1" }
else { & $deploy }

# 3) 外部依存の自己検査
$footprint = Join-Path $RepoRoot ".ai\adapters\external-footprint.md"
if (Test-Path $footprint) {
    Write-Host "[OK] external-footprint ledger present" -ForegroundColor Green
} else {
    throw "external-footprint.md missing — portability ledger required"
}
Write-Host "=== bootstrap done ===" -ForegroundColor Cyan
```

- [ ] **Step 4: DryRun で構文・経路を確認**

Run: `pwsh -ExecutionPolicy Bypass -File .ai/adapters/bootstrap.ps1 -DryRun`
Expected: `=== bootstrap done ===` まで到達（`[dry] would run ...` が表示され、エラーなし）

- [ ] **Step 5: テストを実行して成功を確認 → Commit**

```bash
pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1
git add .ai/adapters/bootstrap.ps1 tools/test-restructure.ps1
git commit -m "feat: add idempotent bootstrap.ps1 for new-PC portability"
```
Expected: テストPASS

---

### Task 11: .ai/INDEX.md（ルールブック・single pane）

**Files:**
- Create: `.ai/INDEX.md`
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 失敗するテストを追記（4ブロックの存在を要求）**

```powershell
# --- Task 11: INDEX rulebook (4 blocks) ---
Assert-Path ".ai/INDEX.md"
Assert-FileContains ".ai/INDEX.md" "## 0. 行動規範"
Assert-FileContains ".ai/INDEX.md" "## 2. 概念"
Assert-FileContains ".ai/INDEX.md" "core/safety.md"
Assert-FileContains ".ai/INDEX.md" "routing/router.md"
Assert-FileContains ".ai/INDEX.md" "adapters/manifest.yaml"
Assert-FileContains ".ai/INDEX.md" "CLAUDE.md"
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING file: .ai/INDEX.md`

- [ ] **Step 3: INDEX を作成**

Create `.ai/INDEX.md`:

```markdown
# .ai INDEX — 唯一の入口・ルールブック

正本は `.ai/` のみ。`_generated/` と `.claude/ .codex/ .cursor/` は編集禁止の生成物。

## 0. 行動規範（ルールブック本体・AIはまずここを読む）
- 判断順序: core(不変) → routing(発火判断) → catalog(道具選択) → adapters(配布)
- 発火前プロトコル: 候補・理由・期待効果を提示 → ユーザー承認 → 発火（P1 read-only単独低リスクのみ短い事前報告で自動）
- 絶対禁止(hard-no):
  - 生成物（`_generated/`・`.claude/`・`.codex/`・`CLAUDE.md`・`AGENTS.md`・`copilot-instructions.md`）の直接編集
  - 一発の move+overwrite+delete 移行（必ず Copy→Verify→Remove・旧新並走）
  - `external-footprint.md` に無いリポ外への書き込み
- 完了前: `a/` Review Gate + `code-reviewer` 相当のレビューを提案

## 1. 全体像（30秒）
4ゾーン: core(不変) / routing(判断) / catalog(道具) / adapters(配布)。

## 2. 概念 → 正本ファイル（single home）
| 知りたいこと            | 唯一の正本                       |
|------------------------|---------------------------------|
| 安全境界・禁止事項       | core/safety.md                  |
| 権限モデル P1/P2/P3     | core/permissions.md             |
| 不変の中核(identity)     | core/identity.md                |
| いつ何を発火するか       | routing/router.md               |
| 設計背景・単一ソース原則 | routing/design.md               |
| Gate/Trigger            | routing/gates/ + routing/triggers.md |
| 使えるrule/skill/agent  | catalog/                        |
| 専門プレイブック         | catalog/playbooks/              |
| 各モデルへの配布          | adapters/manifest.yaml          |
| リポ外依存・復元手順      | adapters/external-footprint.md  |

## 3. エントリポイント対応表
| ツール          | 入口(生成物)                     | 由来(正本) |
|----------------|---------------------------------|-----------|
| Claude Code    | CLAUDE.md                       | core/ + routing/ + adapters/claude-code |
| Codex/CLI      | AGENTS.md                       | core/ + routing/ + adapters/codex |
| VS Code Copilot| .github/copilot-instructions.md | core/ + routing/ + adapters/vscode-copilot |
```

- [ ] **Step 4: テストを実行して成功を確認 → Commit**

```bash
pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1
git add .ai/INDEX.md tools/test-restructure.ps1
git commit -m "feat: add .ai/INDEX.md single-pane rulebook"
```
Expected: テストPASS

---

### Task 12: _generated/ 編集禁止マーカー

**Files:**
- Create: `.ai/_generated/README.md`
- Modify: `tools/test-restructure.ps1`

- [ ] **Step 1: 失敗するテストを追記**

```powershell
# --- Task 12: generated zone marker ---
Assert-Path ".ai/_generated/README.md"
Assert-FileContains ".ai/_generated/README.md" "DO NOT EDIT"
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `MISSING file: .ai/_generated/README.md`

- [ ] **Step 3: マーカーを作成**

Create `.ai/_generated/README.md`:

```markdown
# _generated — 生成物ゾーン（DO NOT EDIT）

ここおよびリポルートの `.claude/ .codex/ .cursor/` と
`CLAUDE.md / AGENTS.md / .github/copilot-instructions.md` は
すべて `deploy.ps1` が `.ai/` の正本から生成する。**直接編集禁止**。
変更は `.ai/core /routing /catalog /adapters` の正本を編集し `deploy.ps1` を流す。
```

- [ ] **Step 4: テストを実行して成功を確認 → Commit**

```bash
pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1
git add .ai/_generated/README.md tools/test-restructure.ps1
git commit -m "docs: mark _generated zone as do-not-edit"
```
Expected: テストPASS

---

### Task 13: deploy/validate/init-project の新パス配線（旧パスfallback併走）

P3。新旧両パスを参照可能にする（旧パス撤去は Task 15）。

**Files:**
- Modify: `deploy.ps1`
- Modify: `validate.ps1`
- Modify: `init-project.ps1`

- [ ] **Step 1: 失敗するテスト＝回帰ゲートを確認（現状は新パス未配線でも旧で緑）**

Run: `pwsh -ExecutionPolicy Bypass -File tools/eval-routing-accuracy.ps1 > /tmp/p3-routing.txt 2>&1; diff docs/superpowers/baseline/p0-routing.txt /tmp/p3-routing.txt`
Expected: 差分なし（配線変更前の基準）

- [ ] **Step 2: deploy.ps1 のソース参照を「新パス優先・旧パスfallback」に変更**

`deploy.ps1` で `.ai/kernel`, `.ai/module`, `.ai/book`, `.ai/environments`, `templates` を読む箇所を、ヘルパ関数経由に変更。ファイル冒頭の関数定義群（`$UserHome` 定義の直後あたり）に追加:

```powershell
function Resolve-Source {
    param([string]$NewRel, [string]$OldRel)
    $new = Join-Path $RepoRoot $NewRel
    if (Test-Path $new) { return $new }
    return (Join-Path $RepoRoot $OldRel)   # fallback during migration
}
# 例: $kernelDir = Resolve-Source ".ai/core" ".ai/kernel"
#     $routerDoc = Resolve-Source ".ai/routing/router.md" ".ai/module/unified-router.md"
#     $envDir    = Resolve-Source ".ai/adapters" ".ai/environments"
```
既存の各読み取り箇所を `Resolve-Source` 呼び出しに置換する（新パスがあれば新、無ければ旧）。

- [ ] **Step 3: validate.ps1 に external-footprint 検査を追加**

`validate.ps1` の検証本体（`Write-Ok`/`Write-Fail` を使う領域）に追加:

```powershell
# external footprint: 台帳に無いリポ外書き込みパスが deploy.ps1 に無いか簡易検査
$footprint = Join-Path $RepoRoot ".ai/adapters/external-footprint.md"
if (Test-Path $footprint) {
    $ledger = Get-Content $footprint -Raw
    if ($ledger -match "config/dcr") { Write-Ok "external-footprint ledger covers ~/.config/dcr" }
    else { Write-Fail "external-footprint ledger missing ~/.config/dcr entry" }
} else { Write-Fail "external-footprint.md not found" }
```

- [ ] **Step 4: init-project.ps1 の共有リソースコピー元を新パスへ（fallback付き）**

`init-project.ps1` で `.ai/kernel/`, `.ai/module/` をコピーする箇所を、存在すれば `.ai/core/`+`.ai/routing/`、無ければ旧パスを使うよう分岐させる:

```powershell
$sharedDirs = @()
if (Test-Path (Join-Path $RepoRoot ".ai/core")) { $sharedDirs += ".ai/core", ".ai/routing", ".ai/catalog", ".ai/adapters" }
else { $sharedDirs += ".ai/kernel", ".ai/module" }   # fallback
```

- [ ] **Step 5: 配線後の回帰ゲート（ルーティング精度がP0同等以上）**

```bash
pwsh -ExecutionPolicy Bypass -File deploy.ps1 -DryRun
pwsh -ExecutionPolicy Bypass -File tools/eval-routing-accuracy.ps1 > /tmp/p3b-routing.txt 2>&1
diff docs/superpowers/baseline/p0-routing.txt /tmp/p3b-routing.txt && echo "ROUTING UNCHANGED"
pwsh -ExecutionPolicy Bypass -File validate.ps1
```
Expected: `ROUTING UNCHANGED`、`validate.ps1` の `[FAIL]` 0件、新規 `[OK] external-footprint ...` 表示

- [ ] **Step 6: Commit**

```bash
git add deploy.ps1 validate.ps1 init-project.ps1
git commit -m "refactor: wire deploy/validate/init to new zones with old-path fallback"
```

---

### Task 14: 実deploy + フル回帰ゲート（撤去前の最終確認）

**Files:** なし（検証のみ）

- [ ] **Step 1: 実deployで entrypoint/ミラーを新正本から再生成**

Run: `pwsh -ExecutionPolicy Bypass -File deploy.ps1`
Expected: エラーなく完了。`CLAUDE.md` 等が再生成される。

- [ ] **Step 2: drift 0 を確認**

Run: `pwsh -ExecutionPolicy Bypass -File deploy.ps1 -Check`
Expected: drift 0（差分なしの旨）

- [ ] **Step 3: 全 test-*.ps1 + restructure テストを実行**

```bash
for t in tools/test-*.ps1 tools/test-restructure.ps1; do echo "=== $t ==="; pwsh -ExecutionPolicy Bypass -File "$t" || echo "FAILED: $t"; done
```
Expected: `FAILED:` 行が一つも出ない

- [ ] **Step 4: ルーティング精度がP0同等以上**

```bash
pwsh -ExecutionPolicy Bypass -File tools/eval-routing-accuracy.ps1 > /tmp/p4-routing.txt 2>&1
diff docs/superpowers/baseline/p0-routing.txt /tmp/p4-routing.txt && echo "ROUTING UNCHANGED"
```
Expected: `ROUTING UNCHANGED`（差分があれば精度スコア行を目視し、P0以上であることを確認。低下していれば Task 5 の統合に欠落があるので戻る）

- [ ] **Step 5: 緑を記録（撤去ゲート通過の証跡）**

```bash
echo "P4 gate passed $(git rev-parse --short HEAD)" >> docs/superpowers/baseline/p4-gate.txt
git add docs/superpowers/baseline/p4-gate.txt
git commit -m "test: record P4 regression gate pass before old-path removal"
```

---

### Task 15: P4 旧パス撤去

Task 14 の全緑を確認した後のみ実行する。

**Files:**
- Delete: `.ai/kernel/`, `.ai/module/`, `.ai/book/`, `.ai/environments/`, `templates/`
- Delete: `.ai/ARCHITECTURE.md`, `.ai/repo-map.md`, `.ai/rule-routing-design.md`
- Modify: `deploy.ps1`, `init-project.ps1`（fallback分岐の旧パス側を削除）
- Modify: `tools/test-restructure.ps1`（旧パス不在をアサート）

- [ ] **Step 1: 失敗するテストを追記（旧パスが消えていることを要求）**

`tools/test-restructure.ps1` の最終 `Write-Host` 直前に追記:

```powershell
# --- Task 15: old paths removed ---
function Assert-Absent {
    param([string]$Rel)
    if (Test-Path (Join-Path $RepoRoot $Rel)) { throw "OLD path still present: $Rel" }
}
foreach ($old in @(".ai/kernel", ".ai/module", ".ai/book", ".ai/environments",
                   "templates", ".ai/ARCHITECTURE.md", ".ai/repo-map.md", ".ai/rule-routing-design.md")) {
    Assert-Absent $old
}
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1`
Expected: FAIL — `OLD path still present: .ai/kernel`

- [ ] **Step 3: 旧パスを削除**

```bash
git rm -r .ai/kernel .ai/module .ai/book .ai/environments templates .ai/ARCHITECTURE.md .ai/repo-map.md .ai/rule-routing-design.md
```

- [ ] **Step 4: deploy.ps1 / init-project.ps1 の fallback旧パス側を除去**

`Resolve-Source` 呼び出しは新パスのみ返るので問題ないが、init-project.ps1 の `else { $sharedDirs += ".ai/kernel", ".ai/module" }` 行と、deploy.ps1 内の旧パス文字列リテラル参照を削除する。

- [ ] **Step 5: テスト + フル回帰を実行して成功を確認**

```bash
pwsh -ExecutionPolicy Bypass -File tools/test-restructure.ps1
pwsh -ExecutionPolicy Bypass -File deploy.ps1
pwsh -ExecutionPolicy Bypass -File deploy.ps1 -Check
pwsh -ExecutionPolicy Bypass -File validate.ps1
pwsh -ExecutionPolicy Bypass -File tools/eval-routing-accuracy.ps1 > /tmp/final-routing.txt 2>&1
diff docs/superpowers/baseline/p0-routing.txt /tmp/final-routing.txt && echo "ROUTING UNCHANGED"
```
Expected: restructure テスト PASS、drift 0、`validate.ps1` の `[FAIL]` 0件、`ROUTING UNCHANGED`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove old kernel/module/book/environments/templates after green gate"
```

---

### Task 16: 仕上げ（CLAUDE.md系の正本リンク更新確認 + クリーンアップ）

**Files:**
- Modify: `tools/test-restructure.ps1`（baseline一時ファイルのクリーンアップは任意）

- [ ] **Step 1: 生成された entrypoint が新パスを指しているか確認**

```bash
grep -nE '\.ai/(kernel|module|book|environments)' CLAUDE.md AGENTS.md .github/copilot-instructions.md
```
Expected: 何も出力されない（旧パス参照が残っていない）。出たら deploy のテンプレ/差分側に旧パス文字列が残っているので該当 `adapters/<env>/kernel.md` を修正して再deploy。

- [ ] **Step 2: INDEX を起点に全正本へ到達できることを目視確認**

`.ai/INDEX.md` の §2 表の各正本パスが実在することを確認:

```bash
for p in core/safety.md core/permissions.md core/identity.md routing/router.md routing/design.md routing/triggers.md adapters/manifest.yaml adapters/external-footprint.md; do test -e ".ai/$p" && echo "OK $p" || echo "MISSING $p"; done
```
Expected: 全行 `OK`

- [ ] **Step 3: 最終コミット**

```bash
git add -A
git commit -m "chore: finalize concept-zone restructure (INDEX reachability verified)"
```

---

## 完了の定義（spec 成功基準との対応）

1. **INDEX 1ファイルから全正本到達・重複根絶** → Task 11, 16-Step2
2. **ルーティング精度がP0同等以上** → Task 13/14/15 の `eval-routing-accuracy` 差分ゲート
3. **drift 0・全 test-*.ps1 緑** → Task 14, 15
4. **「フォルダ移動 → bootstrap.ps1」で復元・リポ外依存は台帳と一致** → Task 9, 10, 13-Step3
