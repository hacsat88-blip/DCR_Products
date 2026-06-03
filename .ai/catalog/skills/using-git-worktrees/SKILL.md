---
name: using-git-worktrees
routing_category: devops
description: "OpenAI using-git-worktrees baseline with a thin DCR overlay for branch/worktree naming, source-of-truth safety, generated mirror checks, and Windows path handling."
disable-model-invocation: true
baseline:
  upstream: "openai/skills"
  role: overlay
  local_delta:
    - "DCR branch/worktree naming"
    - "source-of-truth and generated mirror safety"
    - "Windows path checks"
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
  - gemini-cli
---

# Using Git Worktrees

## OpenAI Baseline Overlay

Use the OpenAI official using-git-worktrees skill as the behavioral baseline.
This DCR overlay only adds local safety and naming constraints.

## Activation Boundary

- Use when feature work should be isolated from the current workspace.
- Avoid creating a worktree if the current task is a small direct edit in the active workspace.
- Do not remove worktrees or branches without explicit approval.

## DCR Local Delta

- Prefer branch names with the `codex/` prefix unless the user asks otherwise.
- Prefer project-local ignored worktree directories or an existing repo convention.
- Verify any project-local worktree directory is ignored before use.
- For DCR source-of-truth changes, remember that generated mirrors must be refreshed from the source workspace after implementation.

## Handoff

Report the worktree path, branch, setup command run, and baseline verification result. If setup fails, keep the worktree intact and report the exact failure.
