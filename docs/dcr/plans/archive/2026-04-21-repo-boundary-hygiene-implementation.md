# Repo Boundary Hygiene Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** spec 化した repo boundary hygiene の判断基準を、再利用可能な skill と rule として source-of-truth に追加する。

**Architecture:** reusable workflow は skill に、常時守るべき invariant は rule に分離する。routing index は生成物として script で更新し、構造検証と deploy check を通して repo 正本と配布先の整合を確認する。

**Tech Stack:** Markdown, YAML frontmatter, PowerShell validation/deploy scripts

---

## File Structure

- Create: `docs/dcr/plans/2026-04-21-repo-boundary-hygiene-implementation.md`
- Create: `skills/repo-boundary-hygiene/SKILL.md`
- Create: `rules/repo-boundary-steward.md`
- Modify (generated): `rules/_ROUTING_INDEX.md`

### Task 1: Add the implementation plan

**Files:**

- Create: `docs/dcr/plans/2026-04-21-repo-boundary-hygiene-implementation.md`

- [ ] **Step 1: Write the plan header and file map**

Add the standard plan header, goal, architecture, tech stack, and exact files to be created.

- [ ] **Step 2: Record verification steps**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\generate-routing-index.ps1
powershell -ExecutionPolicy Bypass -File .\validate.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```

Expected:

- routing index regeneration completes without error
- validate exits 0
- deploy exits 0
- deploy check exits 0

### Task 2: Create the skill

**Files:**

- Create: `skills/repo-boundary-hygiene/SKILL.md`

- [ ] **Step 1: Add frontmatter**

Define `name`, `description`, `contract`, `composable`, and `package` blocks.

- [ ] **Step 2: Add the workflow body**

Document purpose, use cases, primary classes, secondary tags, workflow, decision table, anti-patterns, and output template.

- [ ] **Step 3: Verify structural expectations**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

Expected: `repo-boundary-hygiene/SKILL.md` passes frontmatter/body validation.

### Task 3: Create the rule

**Files:**

- Create: `rules/repo-boundary-steward.md`

- [ ] **Step 1: Add routing metadata**

Define `description`, `domain`, `routing_category`, `risk`, `artifacts`, and `keywords`.

- [ ] **Step 2: Add role guidance**

Document mission, critical rules, decision criteria, and deliverable expectations for cleanup and boundary work.

- [ ] **Step 3: Verify routing index compatibility**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\generate-routing-index.ps1
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

Expected:

- `rules/_ROUTING_INDEX.md` is regenerated
- validate reports the routing index is up to date

### Task 4: Verify and sync generated outputs

**Files:**

- Modify (generated): `rules/_ROUTING_INDEX.md`

- [ ] **Step 1: Regenerate the routing index**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\generate-routing-index.ps1
```

Expected: `rules/_ROUTING_INDEX.md` includes `repo-boundary-steward.md`.

- [ ] **Step 2: Run repository validation**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

Expected: exit 0.

- [ ] **Step 3: Sync deploy targets**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

Expected: user-level skill/rule mirrors are updated without error.

- [ ] **Step 4: Run deploy check**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```

Expected: exit 0.
*** Delete File: c:\Users\hacsa\Desktop\サトシ開発\docs\dcr\specs\2026-04-21-repo-boundary-hygiene-skill-rule-design.md
*** Delete File: c:\Users\hacsa\Desktop\サトシ開発\docs\dcr\plans\2026-04-21-repo-boundary-hygiene-implementation.md