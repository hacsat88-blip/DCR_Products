# DCR Target Repo Layout Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** サトシ開発の repo 構成を、DCR core / Product workspace / generated output / historical docs の 4 層で運用しやすくする。

**Architecture:** 既存の deploy / validate / docs 保存先契約は維持し、まず docs と template で target layout を固定する。active path はそのまま残し、history は archive subdir へ逃がす。Product 固有資産は local-first に寄せ、shared 化が必要なものだけ root 正本へ昇格する。

**Tech Stack:** Markdown, PowerShell validation/deploy scripts, VS Code workspace settings

---

## File Structure

- Create: `docs/dcr/specs/archive/.gitkeep`
- Create: `docs/dcr/plans/archive/.gitkeep`
- Create: `docs/dcr/reference/repo-layout.md`
- Create: `Product/_template/README.md`
- Create: `Product/_template/docs/README.md`
- Create: `Product/_template/.ai/README.md`
- Create: `Product/_template/.vscode/settings.json`
- Modify: `README.md`
- Modify: `docs/dcr/instruction-governance.md`
- Modify: `docs/dcr/development-workflow.md`
- Optional Move: `docs/dcr/specs/*.md` の一部 -> `docs/dcr/specs/archive/`
- Optional Move: `docs/dcr/plans/*.md` の一部 -> `docs/dcr/plans/archive/`

## Task 1: Add archive lanes without changing active save paths

**Files:**

- Create: `docs/dcr/specs/archive/.gitkeep`
- Create: `docs/dcr/plans/archive/.gitkeep`
- Modify: `docs/dcr/instruction-governance.md`

- [ ] **Step 1: Create archive directories**

Add `docs/dcr/specs/archive/` and `docs/dcr/plans/archive/` as explicit destinations for historical documents.

- [ ] **Step 2: Document the rule**

State that new active specs and plans still land in `docs/dcr/specs/` and `docs/dcr/plans/`, and only completed or low-frequency docs are moved into `archive/`.

- [ ] **Step 3: Run validation**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

Expected: exit 0.

## Task 2: Add a stable repo layout reference

**Files:**

- Create: `docs/dcr/reference/repo-layout.md`
- Modify: `README.md`
- Modify: `docs/dcr/development-workflow.md`

- [ ] **Step 1: Write the one-page layout reference**

Document the four conceptual layers, the real directories that implement them, and the main do-not-edit generated paths.

- [ ] **Step 2: Link from README**

Add a short pointer so contributors can find the stable layout explanation without reading multiple specs.

- [ ] **Step 3: Link from development workflow**

Add one short note in `docs/dcr/development-workflow.md` that points to the stable repo layout reference when contributors are unsure whether a file belongs in root DCR core or a Product workspace.

- [ ] **Step 4: Verify links**

Run:

```powershell
Test-Path .\docs\dcr\reference\repo-layout.md
Select-String -Path .\README.md -Pattern "docs/dcr/reference/repo-layout.md" -SimpleMatch
Select-String -Path .\docs\dcr\development-workflow.md -Pattern "docs/dcr/reference/repo-layout.md" -SimpleMatch
```

Expected: the reference file exists, and both README plus development workflow point to it directly.

## Task 3: Standardize Product workspace bootstrap

**Files:**

- Create: `Product/_template/README.md`
- Create: `Product/_template/docs/README.md`
- Create: `Product/_template/.ai/README.md`
- Create: `Product/_template/.vscode/settings.json`
- Modify: `docs/dcr/instruction-governance.md`

- [ ] **Step 1: Add a minimal Product template**

Create a template that shows the smallest acceptable local structure for a new Product workspace.

- [ ] **Step 2: Document local-first overlay policy**

Clarify that Product-local `.ai/` and `.vscode/` live with the Product, while root shared assets remain in DCR core.

- [ ] **Step 3: Verify the template is discoverable**

Run:

```powershell
Select-String -Path .\docs\dcr\instruction-governance.md -Pattern "Product/_template" -SimpleMatch
Select-String -Path .\docs\dcr\instruction-governance.md -Pattern "product-local overlay|local-first"
```

Expected: the template path and local-first overlay policy are explicitly documented in `docs/dcr/instruction-governance.md`.

- [ ] **Step 4: Verify the template shape**

Run:

```powershell
Test-Path .\Product\_template\README.md
Test-Path .\Product\_template\docs\README.md
Test-Path .\Product\_template\.ai\README.md
Test-Path .\Product\_template\.vscode\settings.json
```

Expected: all four paths return `True`, proving the minimum Product template explicitly includes README, docs, `.ai`, and `.vscode`.

## Task 4: Perform the first active/archive sweep

**Files:**

- Optional Move: `docs/dcr/specs/*.md`
- Optional Move: `docs/dcr/plans/*.md`
- Modify: `README.md`

- [ ] **Step 1: Define active criteria**

Classify each doc as active if it is still a current source-of-truth for ongoing decisions, otherwise classify it as archive candidate.

- [ ] **Step 2: Move only low-risk historical docs**

Start with documents whose value is historical context rather than active operating contract.
Record the exact old relative path for every moved file. Use that list in the next step instead of guessing from memory.

- [ ] **Step 3: Sweep for stale references**

Run:

```powershell
$movedDocs = @(
	# Required: fill with the old relative paths that were moved in Step 2.
	# Example: "docs/dcr/specs/2026-04-01-some-historical-spec.md"
)
if ($movedDocs.Count -eq 0) {
	throw "Populate movedDocs with at least one moved old path before running stale-reference verification."
}
$allowedMatches = @(
	# Optional: add exact "path:line:text" entries for intentional historical mentions.
)
$activeDocs = @()
$activeDocs += Get-ChildItem -Path . -Recurse -File -Filter *.md |
	Where-Object { $_.FullName -notmatch "\\archive\\|\\node_modules\\|\\.git\\" } |
	ForEach-Object { $_.FullName }
$activeDocs += Get-ChildItem -Path . -Recurse -File -Filter *.mdc |
	Where-Object { $_.FullName -notmatch "\\archive\\|\\node_modules\\|\\.git\\" } |
	ForEach-Object { $_.FullName }
$failures = @()
foreach ($path in $movedDocs) {
	$matches = Select-String -Path $activeDocs -Pattern $path -SimpleMatch
	foreach ($match in $matches) {
		$descriptor = "{0}:{1}:{2}" -f $match.Path, $match.LineNumber, $match.Line.Trim()
		if ($allowedMatches -notcontains $descriptor) {
			$failures += $descriptor
		}
	}
}
if ($failures.Count -gt 0) {
	$failures | ForEach-Object { Write-Error $_ }
	throw "Stale references remain in active markdown files. Resolve them or allowlist intentional historical mentions."
}
```

Expected: the command exits cleanly only when no stale references to moved old paths remain anywhere in active text artifacts, including markdown and generated `.mdc` mirrors, except entries explicitly allowlisted as intentional historical mentions.

- [ ] **Step 4: Re-run validation and deploy check**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```

Expected: validation and drift check remain clean.

## Deferred Follow-Up

Product overlay loading is intentionally out of scope for this initial migration plan.

Create a separate follow-up plan only when all of the following are true:

- a real `Product/<product>/` consumer exists
- that Product has its own `.ai/` source-of-truth assets
- the team sees repeated manual merge or deploy friction

Until then, keep this effort docs-first and layout-first.

## Verification Commands

```powershell
Test-Path .\docs\dcr\specs\archive
Test-Path .\docs\dcr\plans\archive
Test-Path .\docs\dcr\reference\repo-layout.md
powershell -ExecutionPolicy Bypass -File .\validate.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
Select-String -Path .\README.md, .\docs\dcr\development-workflow.md -Pattern "docs/dcr/reference/repo-layout.md" -SimpleMatch
Select-String -Path .\README.md, .\docs\dcr\instruction-governance.md, .\docs\dcr\reference\repo-layout.md -Pattern "Product/_template" -SimpleMatch
# Re-run the movedDocs loop from Task 4 when archive moves were part of the change set.
```

## Success Criteria

- active spec / plan save paths remain unchanged
- archive lanes exist and are documented
- a stable repo layout reference exists
- new Product workspaces have a minimal template
- docs cleanup can happen without guessing what is still active