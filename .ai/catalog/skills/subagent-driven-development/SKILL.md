---
name: subagent-driven-development
routing_category: devops
description: "OpenAI subagent-driven-development baseline with a thin DCR overlay for local agent boundaries, review handoff, source-of-truth constraints, and repo-specific verification gates."
baseline:
  upstream: "openai/skills"
  role: overlay
  local_delta:
    - "DCR review handoff"
    - "local agent boundary rules"
    - "repo-specific verification gates"
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
  - cursor
---

# Subagent-Driven Development

## OpenAI Baseline Overlay

Use the OpenAI official subagent-driven-development skill as the behavioral
baseline. This DCR overlay only adds local delegation boundaries and verification
requirements.

## Activation Boundary

- Use when an approved plan has independent tasks that can be delegated.
- Do not dispatch agents for P2/P3 work until the user has approved the candidate agents and expected effects.
- Avoid subagents for tightly coupled one-file edits where coordination overhead is higher than the work.

## DCR Local Delta

- Give each subagent only the task, relevant files, success criteria, and verification command it needs.
- Preserve source-of-truth boundaries: generated mirrors are not implementation targets.
- Require review of subagent output before trusting completion claims.
- For broad catalog/routing work, finish with `dcr-pipeline` QA/ship gates.

## Handoff

Collect subagent results into one status: done, done with concerns, needs context, or blocked. Verify independently before reporting success.
