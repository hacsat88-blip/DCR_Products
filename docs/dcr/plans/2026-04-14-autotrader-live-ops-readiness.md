# AutoTrader Live Ops Readiness Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 現在の復旧済み AutoTrader を、少額の live 運用に入る前提で迷わず起動・判定・停止できる状態まで仕上げる。

**Architecture:** 実行系は引き続き Excel workbook と MarketSpeed II RSS を正本にし、FastAPI は判断と shared health、Next.js は監視 UI を担当する。追加するのは operator 向けの canonical runbook と local readiness checker に絞り、既存の売買ロジックや workbook 挙動は変えない。

**Tech Stack:** Markdown, PowerShell, FastAPI, Next.js, Excel VBA, validate.ps1, deploy.ps1 -Check

---

## File Structure Map

| パス | 役割 |
| --- | --- |
| `Product/autotrader-suite/RUNBOOK.md` | 起動順、停止順、go/no-go、paper smoke、live smoke、障害時の切り分けを集約する canonical runbook |
| `Product/autotrader-suite/check-live-readiness.ps1` | local 環境で workbook / RSS / backend / UI の事前条件を確認する preflight script |
| `Product/autotrader-suite/README.md` | AutoTrader suite 全体の入口。runbook と readiness checker への導線を持つ |
| `Product/autotrader-suite/ui/README.md` | dashboard 特有の確認項目と UI 解釈を簡潔に保持する |
| `Product/autotrader-suite/vba/README.md` | workbook 特有の確認項目と live enablement を簡潔に保持する |
| `docs/dcr/plans/2026-04-14-autotrader-live-ops-readiness.md` | この実装計画 |

## Task 1: Add A Canonical Operator Runbook

**Files:**
- Create: `Product/autotrader-suite/RUNBOOK.md`
- Modify: `Product/autotrader-suite/README.md`
- Modify: `Product/autotrader-suite/ui/README.md`
- Modify: `Product/autotrader-suite/vba/README.md`

- [ ] **Step 1: Draft the runbook skeleton**

Create sections for: overview, startup order, pre-open readiness, paper smoke, live go/no-go, live smoke, shutdown order, incident triage.

- [ ] **Step 2: Fill in exact operator checks**

Document concrete checks using the current product behavior:

- workbook: `Control!B10/B11/B13/B14/B15/B16/B18:B21`
- UI: health summary, `live` / `broker auto` / `armed`, stale/waiting interpretation
- backend health: `status`, `ai_status`, `reference_status`, `last_warning`
- backend: health/settings reachability and verification commands
- MarketSpeed II: login / RSS connection / order-enabled state

The runbook must include a go/no-go table that explicitly distinguishes live-blocking states from warning-only states.

- [ ] **Step 3: Link the runbook from existing entry docs**

Update the suite, UI, and VBA README files so a new operator reaches the runbook without searching.
Replace duplicated ordered startup/shutdown/live-enablement procedures in those README files with short summaries that point back to the canonical runbook.

- [ ] **Step 4: Verify the docs are internally consistent**

Run: `rg "RUNBOOK|Live Enablement|Broker Preflight" Product/autotrader-suite`

Expected: README, UI README, VBA README, and RUNBOOK all point to the same startup/go-no-go flow.

- [ ] **Step 5: Run repository validation**

Run: `powershell -ExecutionPolicy Bypass -File ./validate.ps1`

Expected: pass with no new documentation structure issues.

## Task 2: Add A Local Live Readiness Checker

**Files:**
- Create: `Product/autotrader-suite/check-live-readiness.ps1`
- Modify: `Product/autotrader-suite/RUNBOOK.md`
- Modify: `Product/autotrader-suite/README.md`

- [ ] **Step 1: Define the checker contract**

The script should print a compact checklist object summarizing:

- repo root resolved by walking upward from `$PSScriptRoot` until repo markers such as `deploy.ps1`, `Product`, and `docs` are found together
- repo-root resolution failure treated as `blocked` and returned with non-zero exit code
- workbook existence (`autotrader.xlsm`)
- lock file absence (`~$autotrader.xlsm`)
- backend venv presence
- UI workspace presence
- RSS add-in directory presence (`%LOCALAPPDATA%\MarketSpeed2\Bin\rss`)
- backend env presence (`Product/autotrader-suite/backend/.env`) as warning-only when absent
- UI env presence (`Product/autotrader-suite/ui/.env.local`) as warning-only when absent
- optional env/config warnings without printing secrets

- [ ] **Step 2: Implement the minimal checker**

Return exit code `0` for `ok` and `warning`, and non-zero only for `blocked`.
Distinguish `ok`, `warning`, and `blocked` states in both human-readable output and machine-readable summary.

- [ ] **Step 3: Run the checker locally**

Run: `powershell -ExecutionPolicy Bypass -File ./Product/autotrader-suite/check-live-readiness.ps1`

Expected: human-readable checklist plus machine-readable summary showing which items are ready and which remain warnings.

Then verify at least three cases:

- all-green path with current workspace
- warning-only path by temporarily simulating missing `.env.local` or `.env`
- blocked path by temporarily simulating missing workbook path input or lock-file presence

For each case, verify both summary state and exit code.

- [ ] **Step 4: Wire the checker into the runbook**

Add the exact command and interpretation table to `Product/autotrader-suite/RUNBOOK.md` and the suite README.

## Task 3: Final Live-Ops Verification Pass

**Files:**
- Modify: `Product/autotrader-suite/RUNBOOK.md`

- [ ] **Step 1: Run backend verification**

Run: `Push-Location ./Product/autotrader-suite/backend; ./.venv/Scripts/python.exe -m pytest tests -q; Pop-Location`

Expected: backend suite passes.

- [ ] **Step 2: Run frontend verification**

Run: `Push-Location ./Product/autotrader-suite/ui; npm run test; npm run build; Pop-Location`

Expected: dashboard tests and production build pass.

- [ ] **Step 3: Run repo-level verification**

Run: `powershell -ExecutionPolicy Bypass -File ./validate.ps1`

Run: `powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -Check`

Expected: validation and drift check both pass.

- [ ] **Step 4: Capture final operator checklist in the runbook**

Record the exact sequence for:

- paper smoke before market
- live go/no-go decision
- first small live order smoke
- normal shutdown and emergency stop

The final checklist must explicitly encode how to treat:

- workbook `Control!B10`
- workbook `Control!B11`
- workbook `Control!B13`
- workbook `Control!B14`
- `status=degraded`
- workbook `Control!B16`
- `ai_status=degraded`
- `reference_status=degraded`
- `last_warning` present
- UI `waiting-first-tick`
- UI `stale`
- workbook `Control!B15`
- workbook `Control!B18:B21`

- [ ] **Step 5: Commit**

```bash
git add docs/dcr/plans/2026-04-14-autotrader-live-ops-readiness.md Product/autotrader-suite/RUNBOOK.md Product/autotrader-suite/check-live-readiness.ps1 Product/autotrader-suite/README.md Product/autotrader-suite/ui/README.md Product/autotrader-suite/vba/README.md
git commit -m "docs: add autotrader live ops runbook"
```