# AI Control Plane Phase 7 Commit Readiness

Date: 2026-06-23
Branch: ai-control-plane
Workspace: C:\Users\hacsa\Desktop\サトシ開発

## Purpose

This note records the post-review readiness state after the Review Gate fixes.
It answers whether more required refactoring remains before staging and commit.

## Verdict

No known must-fix code or policy changes remain before commit.

The branch is ready for an explicit staging/commit decision, subject to human
approval. Do not stage, commit, push, discard, or clean untracked files without
that approval.

## Review Gate Fixes Completed

1. Cursor target verification
   - Fixed `deploy.ps1 -Check -Target cursor` so it now compares generated
     Cursor-managed files instead of returning success without checking.
   - The check compares `.cursor/README.md`, `.cursor/mcp.json`,
     `.cursor/rules`, and `.cursorignore`.
   - Runtime-only `.cursor/hooks` files are intentionally not treated as adapter
     drift.

2. Generated entrypoint exact drift
   - Added check-time adapter generation for:
     - `AGENTS.md`
     - `CLAUDE.md`
     - `.github/copilot-instructions.md`
   - The generated candidate is compared against the tracked entrypoint with
     normalized newlines so Git CRLF behavior does not create false drift.

3. Control-plane source wording
   - Updated `.ai/control-plane/START-HERE.md`, `.ai/00_START_HERE.md`, and
     `.ai/20_SOURCE/source-layout.json` so they describe the actual current
     primary paths.
   - Current primary asset groups are rules, skills, agents, and books under
     `.ai/assets`.
   - Kernel and environments remain compatibility-rooted until an explicit
     future switch.

4. Registry and runtime-memory wording
   - Updated `tools/update-ai-control-plane-registries.ps1` and regenerated
     `.ai/control-plane/source-registry.json`.
   - Updated `.ai/assets/README.md`.
   - Updated runtime-memory source priority from legacy `.ai/catalog` language to
     `.ai/assets` and `.ai/control-plane`.
   - Regenerated tracked entrypoints from adapters.

## Verification

Checks run after the Review Gate fixes:

```text
.\deploy.ps1 -Check
result: pass

.\deploy.ps1 -Check -Target cursor
result: pass

.\deploy.ps1 -Check -Target vscode
result: pass

.\deploy.ps1 -Check -Target agents
result: pass

.\deploy.ps1 -Check -Target dcr
result: pass

.\tools\update-ai-control-plane-registries.ps1 -Check
result: pass

.\tools\test-retired-targets.ps1 -RepoRoot .
result: retired target smoke passed

.\tools\audit-ai-control-plane.ps1 -HomeRoot $env:USERPROFILE -NoSecrets
result: status ok, unclassifiedHomePaths 0

.\validate.ps1
result: 791 passed, 0 failed

git diff --check
result: no whitespace errors; CRLF warnings only
```

Additional focused searches:

```text
Old active source-priority wording:
result: no hits except intentional legacyPath entries in source-layout.json

Active retired target text outside docs/audits and retired-targets.policy.json:
result: no hits
```

## Remaining Optional Improvements

These are not blockers for this branch.

1. `validate.ps1` comment mojibake cleanup
   - Several comments and failure strings are mojibake from earlier encoding
     history.
   - Runtime behavior is passing, so this should be a separate cosmetic cleanup
     commit, not mixed into the control-plane migration.

2. Commit automation helper
   - A future helper could stage files by the recommended commit buckets.
   - Current branch should still use human-reviewed staging because the diff is
     intentionally large.

3. Manifest-driven deploy orchestration
   - `tools/deploy-all.ps1` still maps adapter manifest ids in script.
   - This is acceptable for the migration gate; a later phase can move more of
     that behavior into `.ai/distribution/manifests`.

## Recommended Commit Buckets

Preferred:

1. Source layout migration and compatibility maps.
2. Control-plane registries, navigation, and audit scripts.
3. Deploy/adapter/validate hardening and regenerated entrypoints.
4. Devin/Windsurf retirement and retired-target guard.

Acceptable fallback:

- One squash commit after final human review.

## Next Action

Ask for explicit approval before staging. Recommended command family after
approval:

```powershell
git add ...
git diff --cached --check
git commit -m "ai: introduce control-plane source layout"
```
