---
name: finishing-a-development-branch
routing_category: devops
description: "OpenAI finishing-a-development-branch baseline with a thin DCR overlay for deploy/check/validate finish gates, Windows/PowerShell commands, and generated mirror drift awareness."
disable-model-invocation: true
baseline:
  upstream: "openai/skills"
  role: overlay
  local_delta:
    - "DCR deploy/check/validate finish gates"
    - "Windows/PowerShell command forms"
    - "generated mirror drift awareness"
contract:
  preconditions:
    - "The request matches this skill's description or routing category."
  postconditions:
    - "The response names the result, reasoning, and verification or handoff path."
  invariants:
    - "Do not treat generated mirrors or runtime caches as DCR source of truth."
composable:
  input_type: task
  output_type: artifact-or-decision
  chains_with:
    - verification-before-completion
runtime_targets:
  - codex
  - claude
  - copilot
  - cursor
  - windsurf
  - opencode
  - gemini-cli
---

# Finishing a Development Branch

## OpenAI Baseline Overlay

Use the OpenAI official finishing-a-development-branch skill as the behavioral
baseline. This DCR overlay only adds local release and mirror checks.

## Activation Boundary

- Use when implementation and verification are complete and the user wants merge, PR, commit, or cleanup guidance.
- Do not merge, push, discard, or delete branches without explicit user approval.

## DCR Local Delta

- Confirm `git status --short` and separate intended changes from ambient drift.
- If `.ai/catalog`, `.ai/book`, `.ai/kernel`, adapters, templates, or generated entrypoints changed, require `deploy.ps1 -Check`.
- If active/deprecated counts changed, confirm `AGENTS.md`, `CLAUDE.md`, and Copilot instructions agree.
- Keep generated mirrors out of commits unless they are tracked entrypoints.

## Handoff

Present the completion choices clearly: local merge, push/PR, keep branch, or discard. For discard, require exact confirmation and list affected branch/worktree paths first.
