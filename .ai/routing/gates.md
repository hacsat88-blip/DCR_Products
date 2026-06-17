# Shared Gates

This chapter defines the shared trigger and gate chain behavior for all environments.

## Trigger Source

Trigger parsing is defined in [runtime.md](runtime.md). Detailed handler templates live in [../kernel/gates/](../kernel/gates/).

## Gate Chain

Standard delivery flow:

`p/` Plan Gate -> implementation -> review proposal -> `q/` QA Gate -> `sh/` Ship Gate

## Plan Gate

`p/` fixes scope, constraints, and checklist before implementation.

- Use for multi-step implementation or ambiguous scope.
- Store durable plans under `docs/dcr/plans/` when cross-session handoff is needed.
- If scope changes after approval, return to `p/`.

## QA Gate

`q/` verifies behavior with evidence.

- Check the plan checklist item by item.
- Report findings in risk order.
- State what was verified and what could not be verified.

## Completion Review Proposal

When implementation, generated artifacts, configuration changes, MCP/API changes, or source-of-truth changes produce a completed artifact, propose review before claiming completion.

- Use `採用候補 / 理由 / 期待効果 / 承認が必要な理由`.
- Do not run review automatically; run `a/` Review Gate or `code-reviewer` only after user approval.
- May skip for trivial docs/typos, read-only investigation, or explicit user opt-out.
- Prioritize correctness, security, maintainability, test gaps, source/generated drift, spec conflicts, and weak verification evidence.

## Ship Gate

`sh/` decides release readiness after QA.

- Block if QA evidence is missing.
- Confirm verification evidence, residual risk, and git state.
- Do not claim ready-to-ship if critical findings remain.

## Review And Strategy Triggers

- `a/`: prioritize defects, risks, contradictions, and missing constraints.
- `s/`: current state -> reframed question -> direction evaluation.
- `i/`: merge competing proposals into one consistent recommendation.
- `r/`: compare trade-offs and choose a provisional recommendation.
- `d/`: find failure scenarios, fatal weaknesses, and minimal mitigations.

## Loop Guard

If the same Mode is used 3 times consecutively, suggest `i/` or `s/`. Continue when the user explicitly asks to continue.

