# Active Spec And Product Overlay Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** active spec のノイズをさらに減らし、cyber-stock-dashboard の product-local `.ai/` を現行 contract に沿った reserved overlay として明文化する。

**Architecture:** root README から参照されている target layout spec だけを active に残し、historical audit design は archive へ移す。Product local `.ai/` は自動 loader 未導入のため、現時点では future overlay lane として扱うことを Product docs に揃えて書く。

**Tech Stack:** Markdown, PowerShell file moves, validation/deploy scripts

---

## File Structure

- Create: `docs/dcr/plans/2026-04-22-active-spec-and-product-overlay-cleanup.md`
- Move: `docs/dcr/specs/2026-04-21-dcr-taxonomy-orchestration-audit-design.md` -> `docs/dcr/specs/archive/2026-04-21-dcr-taxonomy-orchestration-audit-design.md`
- Modify: `Product/README.md`
- Modify: `Product/cyber-stock-dashboard/README.md`
- Modify: `Product/cyber-stock-dashboard/.ai/README.md`

## Task 1: Archive the historical audit design

**Files:**

- Move: `docs/dcr/specs/2026-04-21-dcr-taxonomy-orchestration-audit-design.md` -> `docs/dcr/specs/archive/2026-04-21-dcr-taxonomy-orchestration-audit-design.md`

- [ ] **Step 1: Move the historical spec**

Move the audit design into `docs/dcr/specs/archive/` because its findings have already been landed and it is no longer a root discovery target.

- [ ] **Step 2: Verify no active docs still reference the old path**

Run:

```powershell
Select-String -Path (Get-ChildItem -Recurse -File -Include *.md | Where-Object { $_.FullName -notmatch '\\archive\\|node_modules|\.git' }).FullName -Pattern 'docs/dcr/specs/2026-04-21-dcr-taxonomy-orchestration-audit-design.md' -SimpleMatch
```

Expected: no matches.

## Task 2: Mark cyber-stock-dashboard local AI as reserved overlay

**Files:**

- Modify: `Product/README.md`
- Modify: `Product/cyber-stock-dashboard/README.md`
- Modify: `Product/cyber-stock-dashboard/.ai/README.md`

- [ ] **Step 1: Clarify Product index wording**

State that product-local `.ai/` may exist as source-of-truth, but is not assumed to be auto-loaded by root deploy unless a dedicated overlay flow exists.

- [ ] **Step 2: Clarify cyber-stock-dashboard README**

Mark `.ai/` as reserved for future product-local overlay work rather than current auto-loaded behavior.

- [ ] **Step 3: Clarify local overlay README**

State that the folder is a reserved lane until a product-local loader or explicit local workflow consumes it.

## Task 3: Validate repository state

**Files:**

- Verify only

- [ ] **Step 1: Run validation**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

Expected: `RESULT: ... passed, 0 failed`.

- [ ] **Step 2: Run deploy drift check**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```

Expected: all managed targets report `in sync`.