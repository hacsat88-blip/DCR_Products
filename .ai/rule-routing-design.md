# Rule Routing Design

This document defines how shared DCR rules are selected for the Mac triad.

Canonical surfaces:

- Codex
- Claude Code
- Cursor

## Goals

- Keep `.ai/catalog/rules/` as the canonical rule source.
- Keep runtime entrypoints thin and generated.
- Avoid per-surface rule forks unless an environment delta is truly required.
- Keep unsupported or retired runtime surfaces out of active routing.

## Source Of Truth

- Shared kernel: `.ai/kernel/`
- Runtime kernel: `.ai/kernel/dcr-kernel.md`
- Rules: `.ai/catalog/rules/*.md`
- Skills: `.ai/catalog/skills/*/SKILL.md`
- Agents: `.ai/catalog/agents-source/`
- Environment deltas: `.ai/environments/codex/`, `.ai/environments/claude-code/`, `.ai/environments/cursor/`

`AGENTS.md`, `CLAUDE.md`, `.cursor/`, `.codex/agents/`, and `.claude/agents/` are generated/runtime outputs.

## Selection Priority

1. Explicit user request for a named rule, skill, or agent.
2. Active skill metadata match.
3. Active rule metadata match.
4. Kernel-only behavior when no specific asset is needed.

When multiple candidates match, reduce them to the smallest useful set before proposing execution.

## Surface Mapping

### Codex

- Entrypoint: `AGENTS.md`
- Environment delta: `.ai/environments/codex/kernel.md`
- Agent output: `.codex/agents/*.toml`

### Claude Code

- Entrypoint: `CLAUDE.md`
- Environment delta: `.ai/environments/claude-code/kernel.md`
- Agent output: `.claude/agents/*.md`

### Cursor

- Mirror: `.cursor/`
- Ignore file: `.cursorignore`
- Environment delta: `.ai/environments/cursor/kernel.md`

## Guardrails

- Do not add retired runtime names to active `targets`, `runtime_targets`, schema enums, or routing docs.
- Do not route through product-specific skills or sample data packs.
- Do not edit generated runtime outputs as source.
- Do not add new runtime surfaces without updating deploy, check, validate, docs, and migration policy together.

## Validation Expectations

Validation should fail when:

- active skill metadata contains non-triad runtime targets.
- generated routing indexes contain retired runtime names as active guidance.
- deploy dry-runs do not cover the triad targets.
- generated outputs drift from source.
