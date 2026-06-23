# AI Control Plane Phase 5 Release Gate

Date: 2026-06-22
Branch: ai-control-plane
Workspace: C:\Users\hacsa\Desktop\サトシ開発

## Purpose

This note freezes the release-gate view for the AI Control Plane migration before
staging, committing, or pushing. It is intentionally a handoff document for the
next human or AI reviewer: what changed, why the large diff is expected, what
was verified, and what still needs explicit approval.

## Scope Buckets

1. Source layout migration
   - New canonical AI asset roots live under `.ai/assets/`.
   - Rules, skills, agents, and shared book material moved away from the legacy
     `.ai/catalog/*` and `.ai/book/*` source layout.
   - Compatibility README files and path maps remain so old entrypoints can
     point readers toward the new source of truth.

2. Control plane introduction
   - `.ai/control-plane/START-HERE.md` is now the first human/AI read path.
   - `source-registry.json`, `target-registry.json`,
     `home-inventory.policy.json`, and `retired-targets.policy.json` provide
     machine-readable ownership, target, home-inventory, and retirement policy.
   - Numbered entry directories (`.ai/00_START_HERE.md`, `.ai/10_CONTROL`,
     `.ai/20_SOURCE`, `.ai/30_ROUTING`, `.ai/40_DISTRIBUTION`,
     `.ai/50_EXTERNAL`, `.ai/90_COMPAT`) make the intended navigation order
     explicit.

3. Distribution and generated entrypoints
   - `deploy.ps1`, `tools/deploy-all.ps1`, adapters, manifests, and validation
     scripts now prefer the control-plane/source-registry direction.
   - Tracked generated entrypoints (`AGENTS.md`, `CLAUDE.md`, GitHub/Cursor/VS
     Code surfaces) were regenerated from source of truth rather than edited as
     primary source.

4. Retired target removal
   - Devin and Windsurf are removed from active distribution, validation, and
     manifests.
   - Repo runtime mirrors `.devin/` and `.windsurf/` are deleted.
   - `tools/test-retired-targets.ps1` and
     `.ai/control-plane/retired-targets.policy.json` guard against reintroducing
     retired target files or active references.
   - Historical references are allowed only under `docs/audits/` and the
     retirement policy.

5. Validation and audit hardening
   - `validate.ps1` includes the retired-target guard.
   - `tools/audit-ai-control-plane.ps1` checks control-plane registries and home
     inventory classification without reading secret contents.
   - `tools/update-ai-control-plane-registries.ps1` keeps registry data aligned
     with source files.

## Current Diff Shape

The diff is large by design because this phase moves a whole AI source layout
and retires generated mirrors.

- Modified tracked paths: 1356
- Untracked paths: 573
- `.ai/*` modified tracked paths: 535
- `.ai/*` untracked paths: 565
- Tool/deploy/validate modified paths: 23
- Tool untracked paths: 4
- Audit docs untracked paths: 4

Git also reports this local warning during status/diff commands:

```text
warning: unable to access 'C:\Users\hacsa/.config/git/ignore': Permission denied
```

This warning is local git config access noise and did not block the repo checks.

## Verification Already Run

These checks passed after the retired-target guard fix:

```text
.\tools\test-retired-targets.ps1 -RepoRoot .
result: retired target smoke passed

.\validate.ps1
result: 791 passed, 0 failed

.\deploy.ps1 -Check
result: all generated targets in sync

.\tools\audit-ai-control-plane.ps1 -HomeRoot $env:USERPROFILE -NoSecrets
result: status ok, unclassifiedHomePaths 0, targetEntries 8, sourceEntries 300

git diff --check
result: no whitespace errors; CRLF warnings only
```

## Known Caveats

- No staging, commit, push, or branch cleanup has been done in this gate.
- The worktree is intentionally huge; review should be bucketed by source
  migration, control-plane policy, distribution/validation, and retired target
  removal rather than treated as unrelated churn.
- `.codex/agents` sync required elevated access because the sandbox could not
  write the home runtime mirror; the elevated `tools/deploy-all.ps1 -Target
  agents` rerun completed successfully.
- Historical Devin/Windsurf strings remain only in audit material and the
  retirement policy. Active runtime files, manifests, adapters, and validation
  paths should not reintroduce them.

## Recommended Review Order

1. Review `.ai/control-plane/*` and `.ai/00_START_HERE.md` first to confirm the
   new mental model.
2. Review `tools/lib/catalog-paths.ps1`, `deploy.ps1`, `tools/deploy-all.ps1`,
   and adapters to confirm generation still follows source of truth.
3. Review `validate.ps1`, `tools/audit-ai-control-plane.ps1`,
   `tools/update-ai-control-plane-registries.ps1`, and
   `tools/test-retired-targets.ps1` to confirm gates match the new policy.
4. Review `.ai/assets/*` as moved source material, not as hand-authored new
   domain behavior.
5. Review generated entrypoints last and compare them to deploy output.

## Recommended Commit Split

Preferred split:

1. `ai: migrate source assets into control-plane layout`
2. `ai: add control-plane registries and audit gates`
3. `deploy: update adapters and validation for control-plane sources`
4. `ai: retire devin and windsurf runtime targets`

Acceptable fallback:

- A single squash commit after final review if preserving the detailed phase
  history is less important than keeping branch history compact.

## Release Gate Status

Status: ready for final review, then explicit approval for staging/commit/push.

Do not stage, commit, push, delete branches, or clean untracked files without
explicit user approval.
