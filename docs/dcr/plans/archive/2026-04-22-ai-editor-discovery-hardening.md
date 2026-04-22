# AI Editor Discovery Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** サトシ開発を、複数の AI エディタが正本・生成物・Product 境界を迷わず辿れる workspace に寄せる。

**Architecture:** 既存の entrypoint と deploy 契約は維持し、discovery 導線と search boundary だけを強化する。共有正本の入口は `.ai/catalog/`、Product 側の入口は `Product/` に明示し、generated mirror と archive は workspace 検索から既定で外す。

**Tech Stack:** Markdown, VS Code workspace settings, PowerShell validation/deploy scripts

---

## File Structure

- Create: `.ai/catalog/README.md`
- Create: `Product/README.md`
- Modify: `.vscode/settings.json`
- Modify: `README.md`
- Modify: `docs/dcr/reference/repo-layout.md`
- Optional Modify: `CONTRIBUTING.md`

## Task 1: Add shared discovery anchors

**Files:**

- Create: `.ai/catalog/README.md`
- Create: `Product/README.md`

- [ ] **Step 1: Add catalog entry README**

Explain that `.ai/catalog/` is the parent folder that AI editors should inspect first for shared rules, skills, and agent sources.

- [ ] **Step 2: Add Product index README**

Explain the difference between real products, `Product/_template/`, and external or ignored clones.

- [ ] **Step 3: Verify presence**

Run:

```powershell
Test-Path .\.ai\catalog\README.md
Test-Path .\Product\README.md
```

Expected: both return `True`.

## Task 2: Reduce default search noise

**Files:**

- Modify: `.vscode/settings.json`

- [ ] **Step 1: Add search excludes**

Exclude generated mirrors, archive docs, ignored external clones, and runtime/session directories from default workspace search.

- [ ] **Step 2: Add file visibility excludes**

Hide the same non-source paths from the Explorer when they are not useful as editing targets, while keeping canonical source folders visible.

- [ ] **Step 3: Verify JSON shape**

Run:

```powershell
powershell -NoProfile -Command "Get-Content .\.vscode\settings.json | ConvertFrom-Json | Out-Null"
```

Expected: JSON parses without error.

## Task 3: Sync discovery docs

**Files:**

- Modify: `README.md`
- Modify: `docs/dcr/reference/repo-layout.md`
- Optional Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Add AI discovery order to README**

Document the first files and folders an AI editor should inspect in order.

- [ ] **Step 2: Add the same guidance to the stable repo layout reference**

Keep the operational placement rules and discovery order aligned.

- [ ] **Step 3: Align contributor wording if needed**

If `CONTRIBUTING.md` uses weaker or conflicting wording, update it to match the same source-of-truth and search-boundary terminology.

- [ ] **Step 4: Verify references**

Run:

```powershell
Select-String -Path .\README.md, .\docs\dcr\reference\repo-layout.md, .\CONTRIBUTING.md -Pattern "AI editor|discovery|.ai/catalog" -SimpleMatch
```

Expected: the docs explicitly point contributors toward `.ai/catalog/` as the shared starting point.

## Task 4: Validate repository state

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

## Success Criteria

- `.ai/catalog/` has an explicit shared discovery anchor
- `Product/` has an explicit placement and bootstrap index
- generated and archival noise is excluded from default workspace discovery
- README and stable reference tell AI editors where to inspect first
- validation and deploy drift check stay green