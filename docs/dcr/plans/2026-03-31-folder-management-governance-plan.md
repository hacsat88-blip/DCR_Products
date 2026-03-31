# Folder Management Governance Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify and stabilize the repository folder model so source assets, generated editor artifacts, runtime entrypoints, and project-init templates each have one unambiguous home without breaking deploy.ps1, validate.ps1, or init-project.ps1.

**Architecture:** Keep the current single-source-of-truth model for rules, skills, and templates at the repository root, and treat editor-specific folders as runtime or generated targets. Formalize the boundary in docs first, then only consider compatibility-based migration after all scripts support dual paths.

**Tech Stack:** Markdown, PowerShell, repository structure conventions

---

## File Structure Map

### Source Layer (authoritative)
```text
.ai/                  Shared kernel and architecture docs
.ai/kernel/gates/     Trigger gate definitions (consolidated from .commands/)
rules/                Agent rule source of truth
skills/               Skill source of truth
templates/            init-project input templates
```

### Runtime / Generated Layer
```text
.github/              VS Code Copilot runtime entrypoint
AGENTS.md             Codex / Copilot CLI entrypoint
CLAUDE.md             Claude Code runtime entrypoint
COPILOT_CLI.md        Copilot CLI expanded rule set
.cursor/rules/        Cursor generated mirror (.mdc)
.claude/agents/       Claude generated mirror
.codex/agents/        Codex generated mirror
```

### Workspace / Operations Layer
```text
.vscode/              Workspace editor settings and tasks
docs/                 Design, plans, and decision records
deploy.ps1            Source -> runtime/editor sync
validate.ps1          Structural validation for source assets
init-project.ps1      Template expansion for new projects
```

---

## Recommended Governance Rules

- `rules/`, `skills/`, `templates/` are the only editable source directories for agent assets.
- `.cursor/rules/`, `.claude/agents/`, `.codex/agents/` are generated or synced outputs and are not edited manually.
- `.github/` is a runtime entrypoint area, not a replacement for `templates/` or `rules/`.
- `templates/` remains dedicated to `init-project.ps1` inputs and must not be deleted until that script is fully reworked.
- Any future path migration must preserve a compatibility window where old and new paths both resolve.

---

## Task 1: Document the Canonical Folder Model

**Files:**
- Modify: `README.md`
- Modify: `.ai/repo-map.md`

- [ ] **Step 1: Update README structure section**

Document the three-layer model:
- Source layer = editable canonical assets
- Runtime/generated layer = deployed outputs and entrypoints
- Workspace/operations layer = scripts and docs

- [ ] **Step 2: Update README operational boundary**

Add explicit statements:
- edit only `rules/`, `skills/`, `templates/`, `.ai/agents-source/`
- do not manually edit `.cursor/rules/*.mdc`, `.claude/agents/`, `.codex/agents/`
- `.github/` is runtime, not source-of-truth for all agent assets

- [ ] **Step 3: Update `.ai/repo-map.md`**

Align the repo map with the same folder governance so assistants stop proposing destructive flattening or moves.

- [ ] **Step 4: Verify docs are consistent**

Check that:
- README and repo-map use the same folder terminology
- no section implies `.cursor/rules/` is an editable source path
- no section implies `templates/` can be removed independently of `init-project.ps1`

---

## Task 2: Add a Guardrail Against Unsafe Bulk Moves

**Files:**
- Modify: `README.md`
- Modify: `templates/README.md`

- [ ] **Step 1: Add “unsafe migration” warning to README**

Include a short warning that the following operations are invalid without script updates:
- moving `rules/` into `.cursor/`
- moving `skills/` into `.cursor/`
- deleting `templates/`
- overwriting `.github/copilot-instructions.md` with template files

- [ ] **Step 2: Add `templates/README.md` note**

Clarify that `templates/` is not legacy clutter; it is an input contract for `init-project.ps1`.

- [ ] **Step 3: Verify references**

Ensure the warning points readers to:
- `deploy.ps1`
- `validate.ps1`
- `init-project.ps1`

---

## Task 3: Define the Default Future-State Structure

**Files:**
- Modify: `README.md`
- Optional Modify: `.ai/repo-map.md`

- [ ] **Step 1: Record the default future-state recommendation**

State that the default supported structure is:

```text
.ai/
.ai/kernel/gates/
rules/
skills/
templates/
.github/
.cursor/rules/
.claude/agents/
.codex/agents/
.vscode/
docs/
```

- [ ] **Step 2: Mark which parts are source vs generated**

Every listed directory should be tagged as one of:
- source
- runtime entrypoint
- generated mirror
- workspace config

- [ ] **Step 3: Keep `.github/instructions/` optional**

Document that `.github/instructions/` may be introduced later for VS Code scoped instructions, but it does not replace `rules/` or `skills/` in this repository model.

---

## Task 4: Define the Only Safe Migration Path

**Files:**
- Modify: `README.md`
- Create or Modify: `docs/dcr/specs/` future migration spec only if migration is approved later

- [ ] **Step 1: Describe the migration gate**

Any structural migration must satisfy all of these before deleting old paths:
- `deploy.ps1` supports both old and new paths
- `validate.ps1` validates the new canonical paths
- `init-project.ps1` reads the new template paths
- docs are updated
- `deploy.ps1 -Check` passes

- [ ] **Step 2: Define the migration sequence**

Safe sequence:
1. copy to new paths
2. update scripts for dual-read compatibility
3. validate and deploy check
4. cut over documentation
5. delete old paths in a later change

- [ ] **Step 3: Explicitly forbid one-shot destructive migration**

Add a short rule that a single command combining move, overwrite, ignore, and delete is not an acceptable migration path for this repository.

---

## Task 5: Optional Compatibility Refactor Spec (Do Not Implement By Default)

**Files:**
- Create later only if approved: `docs/dcr/specs/YYYY-MM-DD-folder-migration-spec.md`

- [ ] **Step 1: Define when this becomes necessary**

Only open a migration spec if one of these becomes true:
- `init-project.ps1` is being redesigned
- multiple tools require `.github/` or `.cursor/` native source locations
- the team agrees to retire root-level source directories

- [ ] **Step 2: Define the target compatibility model**

If migration is approved later, prefer:
- source under one new canonical subtree
- root-level legacy paths retained as compatibility shims during transition
- generated mirrors unchanged until cutover completes

- [ ] **Step 3: Keep this task dormant by default**

Do not implement this task as part of the current work. The repository does not currently need structural migration to remain maintainable.

---

## Acceptance Criteria

- [ ] The repository has one documented answer to “where do I edit source assets?”
- [ ] The repository has one documented answer to “what is generated?”
- [ ] The repository has one documented answer to “why does templates/ still exist?”
- [ ] The repository documentation discourages destructive one-shot moves
- [ ] No script behavior is changed during the governance-only phase

---

## Recommended Outcome

Use this as the default rule set for the repo:

- Edit `rules/`, `skills/`, `templates/`, `.ai/agents-source/`
- Generate or sync `.cursor/rules/`, `.claude/agents/`, `.codex/agents/`
- Keep `.github/` as the VS Code Copilot runtime entrypoint
- Keep `templates/` until `init-project.ps1` is explicitly redesigned
- Treat path migration as a separate approved project, not as cleanup