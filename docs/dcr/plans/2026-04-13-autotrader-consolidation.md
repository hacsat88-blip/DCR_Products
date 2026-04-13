# AutoTrader Consolidation Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AutoTrader backend、dashboard、VBA text source を 1 つの親フォルダ配下へ安全に集約し、旧 path の即時削除なしで移行可能な状態を作る。

**Architecture:** 新しい親フォルダを `Product/autotrader-suite/` とし、その配下へ `backend/`、`ui/`、`vba/` を集約する。repo root の `autotrader.xlsm` は runtime artifact のまま維持し、まずは path 参照更新と検証を先に完了し、旧 path の除去は follow-up に分離する。

**Tech Stack:** PowerShell, FastAPI, pytest, Next.js 14, Vitest, Excel VBA, repo docs

---

## File Structure Map

| Path | Responsibility |
| --- | --- |
| `Product/autotrader-suite/backend/` | 現行 `Product/autotrader/` の backend 正本 |
| `Product/autotrader-suite/ui/` | 現行 `Product/autotrader-ui/` の frontend 正本 |
| `Product/autotrader-suite/vba/` | 現行 `Product/autotrader-vba/` の VBA text source と generator 正本 |
| `autotrader.xlsm` | repo root に残す local runtime workbook artifact |
| `.vscode/tasks.json` | frontend build/install などの path literal |
| `docs/superpowers/plans/2026-04-12-autotrader-sp1-python-server.md` | backend path literal |
| `docs/superpowers/plans/2026-04-12-autotrader-sp2-excel-vba.md` | VBA path literal と generator command |
| `docs/superpowers/plans/2026-04-12-autotrader-sp3-nextjs-dashboard.md` | UI path literal と verify command |
| `docs/superpowers/specs/2026-04-12-autotrading-design.md` | backend/ui/vba の配置説明 |
| `docs/superpowers/specs/2026-04-12-autotrader-sp3-dashboard-design.md` | UI root path 説明 |
| `docs/dcr/plans/2026-04-12-autotrader-gemini-jquants.md` | backend/ui path literal |
| `docs/dcr/plans/2026-04-13-autotrader-paper-ops.md` | backend/ui/vba path literal |
| `Product/autotrader-vba/new-autotrader-workbook.ps1` | repo root 解決ロジックと source path literal |
| `Product/autotrader-vba/README.md` | VBA source と generator path literal |
| `Product/autotrader-vba/workbook-layout.md` | generator command と workbook path guidance |
| `Product/autotrader-ui/README.md` | backend 起動 path literal |

## Migration Rules

- 旧 path は first pass では削除しない。
- runtime workbook の場所は変えない。
- generator の repo root 解決は `..\..` 前提を廃止し、移設後 path でも壊れない実装に直す。
- shell file association に依存した smoke は避け、Excel workbook smoke は `EXCEL.EXE /x` と full workbook path attach を前提にする。

### Task 1: Freeze Target Structure And Compatibility Contract

**Files:**

- Create: `docs/dcr/specs/2026-04-13-autotrader-consolidation-design.md`
- Modify: `docs/dcr/plans/2026-04-13-autotrader-consolidation.md`

- [ ] **Step 1: Confirm the target parent path**

Use `Product/autotrader-suite/` as the new parent so the existing `Product/autotrader/` backend can be migrated without an in-place directory-name collision.

- [ ] **Step 2: Freeze what will not move in phase 1**

Keep these paths unchanged during consolidation:

```text
autotrader.xlsm
/.gitignore entries for autotrader.xlsm
127.0.0.1:8000 as the default local backend endpoint
```

- [ ] **Step 3: Write the compatibility rules**

Document that phase 1 ends when all commands, docs, tests, and generators run from the new parent path and old paths are no longer required by day-to-day workflow, even if legacy directories still exist.

### Task 2: Make The VBA Generator Move-Safe Before Any Directory Move

**Files:**

- Modify: `Product/autotrader-vba/new-autotrader-workbook.ps1`
- Modify: `Product/autotrader-vba/README.md`
- Modify: `Product/autotrader-vba/workbook-layout.md`

- [ ] **Step 1: Remove the hard-coded repo-root assumption**

Replace the current `Join-Path $PSScriptRoot "..\.."` root resolution with a move-safe strategy such as walking upward until `.gitignore` or `README.md` at repo root is found.

- [ ] **Step 2: Add a path smoke for the generator**

Run the generator from both the repo root and the future parent path assumption.

```powershell
powershell -ExecutionPolicy Bypass -File ./Product/autotrader-vba/new-autotrader-workbook.ps1 -Force
```

Expected: `VbaImported=True` and `autotrader.xlsm` regenerated at repo root.

- [ ] **Step 3: Update docs to reference the future parent path intentionally**

Prepare wording so `README.md` and `workbook-layout.md` can be updated in the same commit as the move.

### Task 3: Move VBA Source Into The New Parent

**Files:**

- Create: `Product/autotrader-suite/vba/`
- Move: `Product/autotrader-vba/*` -> `Product/autotrader-suite/vba/`
- Modify: `docs/superpowers/plans/2026-04-12-autotrader-sp2-excel-vba.md`
- Modify: `docs/superpowers/specs/2026-04-12-autotrading-design.md`
- Modify: `docs/dcr/plans/2026-04-13-autotrader-paper-ops.md`

- [ ] **Step 1: Copy or git-move the VBA subtree into the new parent**

Keep source contents unchanged while moving; only path references should change in the same commit.

- [ ] **Step 2: Update generator commands and source paths**

Replace these literals everywhere they appear:

```text
Product/autotrader-vba/new-autotrader-workbook.ps1
Product/autotrader-vba/src/
Product/autotrader-vba/workbook-layout.md
```

- [ ] **Step 3: Re-run workbook verification**

```powershell
powershell -ExecutionPolicy Bypass -File ./Product/autotrader-suite/vba/new-autotrader-workbook.ps1 -Force
```

Then verify with isolated Excel smoke:

```text
EXCEL.EXE /x <repo-root>\autotrader.xlsm
```

### Task 4: Move UI Into The New Parent

**Files:**

- Create: `Product/autotrader-suite/ui/`
- Move: `Product/autotrader-ui/*` -> `Product/autotrader-suite/ui/`
- Modify: `.vscode/tasks.json`
- Modify: `Product/autotrader-ui/README.md`
- Modify: `docs/superpowers/plans/2026-04-12-autotrader-sp3-nextjs-dashboard.md`
- Modify: `docs/superpowers/specs/2026-04-12-autotrader-sp3-dashboard-design.md`
- Modify: `docs/dcr/plans/2026-04-12-autotrader-gemini-jquants.md`
- Modify: `docs/dcr/plans/2026-04-13-autotrader-paper-ops.md`

- [ ] **Step 1: Update task and script path literals**

At minimum update `.vscode/tasks.json` commands that `Push-Location` into `Product/autotrader-ui`.

- [ ] **Step 2: Update the frontend setup docs**

Replace `Product/autotrader-ui` references with `Product/autotrader-suite/ui` in repo docs and plans.

- [ ] **Step 3: Re-run frontend verification from the new path**

```powershell
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npm.cmd install --no-audit --no-fund --progress=false
npm run test -- tests/DashboardShell.test.tsx tests/useTraderHealth.test.ts tests/useTraderSocket.test.ts
npm run build
Pop-Location
```

### Task 5: Move Backend Into The New Parent

**Files:**

- Create: `Product/autotrader-suite/backend/`
- Move: `Product/autotrader/*` -> `Product/autotrader-suite/backend/`
- Modify: `Product/autotrader-ui/README.md` or moved equivalent
- Modify: `docs/superpowers/plans/2026-04-12-autotrader-sp1-python-server.md`
- Modify: `docs/superpowers/plans/2026-04-12-autotrader-sp3-nextjs-dashboard.md`
- Modify: `docs/superpowers/specs/2026-04-12-autotrading-design.md`
- Modify: `docs/dcr/plans/2026-04-12-autotrader-gemini-jquants.md`
- Modify: `docs/dcr/plans/2026-04-13-autotrader-paper-ops.md`

- [ ] **Step 1: Move the backend subtree only after UI and VBA are move-safe**

This avoids breaking the existing frontend and generator commands before their path updates are merged.

- [ ] **Step 2: Update backend launch commands and docs**

Replace `Product/autotrader` path literals in docs, local commands, and any helper scripts that activate `.venv` or run `uvicorn`.

- [ ] **Step 3: Re-run backend verification from the new path**

```powershell
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/backend"
pytest tests -q
Pop-Location
```

### Task 6: Sweep Remaining Path References And Stabilize The New Workflow

**Files:**

- Modify: `.vscode/tasks.json`
- Modify: `docs/**/*.md` files returned by `rg`
- Modify: any remaining `README.md` or helper scripts that reference old paths

- [ ] **Step 1: Run a repo-wide literal search**

```powershell
rg "Product/autotrader-ui|Product/autotrader-vba|Product/autotrader" -n
```

Expected: only intentional historical references remain.

- [ ] **Step 2: Run repository verification**

```powershell
powershell -ExecutionPolicy Bypass -File ./validate.ps1
powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
```

- [ ] **Step 3: Record residual blockers before any deletion pass**

If any old-path dependency remains, keep the legacy directories and stop before cleanup.

### Task 7: Optional Follow-Up Cleanup After Approval

**Files:**

- Delete later with explicit approval: `Product/autotrader/`, `Product/autotrader-ui/`, `Product/autotrader-vba/`

- [ ] **Step 1: Only start after a separate approval**

This phase is destructive and should happen only after the consolidated layout has been used and verified.

- [ ] **Step 2: Re-run the same verification suite after cleanup**

```powershell
powershell -ExecutionPolicy Bypass -File ./validate.ps1
powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
```

- [ ] **Step 3: Close with a final `rg` sweep**

No operational doc, task, or smoke command should still point to the legacy directories.
