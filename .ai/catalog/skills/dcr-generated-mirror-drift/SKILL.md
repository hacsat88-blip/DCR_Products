---
name: dcr-generated-mirror-drift
routing_category: devops
description: "Diagnose drift between DCR source-of-truth files and generated Mac triad runtime outputs such as AGENTS.md, CLAUDE.md, .cursor/, .codex/agents/, and .claude/agents/."
contract:
  preconditions:
    - "A deploy, check, validation, or git status result suggests generated output drift or stale runtime residue."
  postconditions:
    - "The response identifies the source file, generated output, minimal repro, fix target, and verification command."
  invariants:
    - "Do not edit generated mirrors as the source-of-truth."
    - "Classify destination-only files as stale residue unless a current source file owns them."
composable:
  input_type: failure
  output_type: diagnosis
  chains_with:
    - systematic-debugging
    - verification-before-completion
    - documents-ops
metadata:
  origin: local-codex-sessions
  adapted_from: "DCR mirror and generated-entrypoint drift rollouts, updated for the Mac triad core."
  imported_at: "2026-05-24"
runtime_targets:
  - codex
  - claude
  - cursor
---

# DCR Generated Mirror Drift

## Purpose

Use this skill when source files under `.ai/` and generated runtime outputs disagree.

Canonical source files live under:

- `.ai/book/`
- `.ai/kernel/`
- `.ai/catalog/`
- `.ai/environments/`
- `tools/`

Generated outputs include:

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/`
- `.codex/agents/`
- `.claude/agents/`

## Triggers

- `deploy.ps1 -Check` reports `[EXTRA]`, `[MISSING]`, or `[DRIFT]`.
- `validate.ps1` reports generated output or routing drift.
- `git status --short` shows generated outputs changed after deploy.
- A deleted runtime surface or local cache still appears in generated mirrors.

## Diagnosis Flow

1. Capture the failing command and exact output.
2. Identify whether the path is source, generated output, or stale runtime residue.
3. If source is wrong, edit the owning `.ai/` or `tools/` file.
4. If generated output is stale, rerun `deploy.ps1`.
5. If destination-only residue remains, remove it only after confirming the resolved path is inside the intended mirror.

## Report Shape

```markdown
DCR MIRROR DRIFT
- symptom:
- source or mirror:
- minimal repro:
- fix target:
- verification:
```

## Verification

Choose the smallest relevant check first:

```powershell
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check -Target codex
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check -Target claude
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check -Target cursor
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
pwsh -ExecutionPolicy Bypass -File .\validate.ps1
```
