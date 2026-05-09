# Devin Project Entrypoint

## Mission

Use Devin as a high-signal implementation and verification operator for this repository. Prefer small, safe changes with visible evidence over broad rewrites.

## Source of Truth

- Shared runtime and behavior: `.ai/book/`, `.ai/kernel/`
- Routing and orchestration: `.ai/module/unified-router.md`, `.ai/module/unified-coordinator.md`, `.ai/module/unified-integration.md`
- Rules: `.ai/catalog/rules/`
- Skills: `.ai/catalog/skills/`
- Agents: `.ai/catalog/agents-source/`
- Generated mirrors: `AGENTS.md`, `CLAUDE.md`, `.windsurf/`, `.cursor/`, `.codex/agents/`, `.claude/agents/`

## Devin Operating Rules

1. For 3+ step work, plan first and track progress with the task plan tool.
2. For config, dependency, destructive, deploy, or security-impacting work, present the plan and wait for explicit approval before editing or executing.
3. Use read-only exploration first. Batch independent reads and status checks.
4. Before using any skill or subagent, report the adopted name, reason, and expected effect.
5. Prefer source edits under `.ai/` over editing generated mirrors. `.devin/` is itself source-of-truth for Devin-specific behavior, not generated output.

## Delegation Strategy

- Use a read-only onboarding or mapping subagent when source-of-truth boundaries, generated files, or execution paths are unclear.
- Use implementation subagents only for isolated tasks with clear file ownership.
- Use QA/evidence collection after implementation when completion claims need commands, logs, screenshots, diffs, or reproduction notes.
- Use specialist QA for UI accessibility, API/CLI contracts, performance, or security when those risks are in scope.
- When the user enables the project MCP in Devin, prefer the `opencode-bridge` tools for OSS model delegation: `oss_explore`, `oss_document`, and `oss_implement`.
- Only hand off to a cloud or remote Devin agent when the user explicitly asks for handoff.

## Hooks and Feedback

Treat hook output as user feedback. If a hook blocks an action:

1. Adjust the action when possible, using a safer equivalent.
2. If the hook appears misconfigured or blocks necessary safe work, ask the user to inspect the hook configuration or explicitly approve the blocked action.
3. Do not attempt to bypass hooks without explicit user approval for that specific action.

## Safety Boundaries

- Do not read, print, copy, or commit secrets.
- Do not edit `.env`, key, certificate, wallet, or credential files.
- Do not run destructive commands without explicit approval for that specific action.
- Do not force-push, rewrite history, delete branches, or bypass hooks without explicit approval.
- Do not directly edit deploy-generated mirrors unless the task explicitly targets generated output inspection.

## Verification Before Completion

Before claiming implementation work is complete, run the narrowest relevant checks plus, for DCR/runtime/config changes:

```powershell
powershell -ExecutionPolicy Bypass -File ./validate.ps1
powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
```

If verification fails for pre-existing unrelated changes, report that distinction clearly and provide the exact failing evidence.

## Completion Report

Report:

- Changed files
- Why the change is safe
- Verification evidence
- Residual risks or follow-up needed
