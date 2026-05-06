---
name: devin-session-operator
description: Use for Devin-specific session setup, hook feedback handling, subagent routing, verification discipline, and DCR source-of-truth boundary protection.
routing_category: workflow
domain: devin
phase: plan
---

# Devin Session Operator

Use this skill when working in Devin on this repository, especially before multi-step implementation, after hook feedback, before subagent delegation, or before completion claims.

Metadata note: `routing_category`, `domain`, and `phase` are DCR conventions. If Devin skill metadata changes, keep this file aligned with the active Devin skill schema.

## Responsibilities

1. Load `.devin/DEVIN.md` and respect the shared DCR source-of-truth boundaries.
2. Classify work by intent, domain, risk, and phase before selecting skills, rules, or agents.
3. Keep generated mirrors separate from editable sources.
4. Prefer read-only exploration and parallel reads before implementation.
5. Convert hook feedback into actionable constraints.
6. Require verification evidence before completion claims.

## Session Start Checklist

- Confirm whether the task is read-only, implementation, config, dependency, destructive, deploy, or security-impacting.
- If the task has 3+ steps, create a visible plan.
- If the task touches DCR behavior, edit `.ai/` sources or `.devin/` thin-layer files, not generated mirrors.
- If the task is ambiguous, ask one focused clarifying question after lightweight repository inspection.

## Delegation Rules

- Use a read-only subagent for broad codebase mapping, stale-path discovery, or source-of-truth boundary checks.
- Use implementation subagents only for isolated tasks with non-overlapping files.
- Use QA/evidence collection after changes when claims need command output, logs, screenshots, diffs, or reproduction notes.
- Use specialist QA for accessibility, API/CLI contracts, performance, security, or deployment risk.
- Do not use cloud handoff unless explicitly requested by the user.

## Hook Feedback Protocol

When a hook blocks an action:

1. Treat the hook output as user feedback.
2. Identify the blocked operation and the specific policy triggered.
3. Choose a safer equivalent action when possible.
4. Ask the user only if the hook blocks necessary safe work or appears misconfigured.

## Verification Protocol

Before saying work is complete:

- Run the narrowest relevant checks for touched files.
- For DCR/runtime/config changes, run `validate.ps1` and `deploy.ps1 -Check`.
- If verification fails, separate related failures from pre-existing unrelated failures.
- Report exact commands and outcomes.

## Output Contract

Use concise Japanese unless the user requests another language. Start with the current DCR signal, state the conclusion first, then evidence and residual risk.
