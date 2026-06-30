# Catalog Discovery Guide

This directory is the shared source-of-truth for the Mac triad:

- Codex
- Claude Code
- Cursor

Use this folder when you need to inspect or change shared rules, skills, or agent sources. Do not edit generated runtime mirrors first.

## First Inspection Order

1. `.ai/kernel/`
   - Shared behavior, gates, permissions, triggers, and runtime kernel.
2. `.ai/catalog/rules/`
   - Durable invariants, routing metadata, handoff policy, and safety rules.
3. `.ai/catalog/skills/`
   - Reusable workflows, analysis methods, and artifact procedures.
4. `.ai/catalog/agents-source/`
   - Canonical agent definitions used to generate Codex and Claude mirrors.

## When To Start Here

- You need to change shared behavior for Codex, Claude Code, or Cursor.
- You need the source file behind a generated entrypoint or mirror.
- You need to decide whether a skill, rule, or agent belongs in the shared triad.
- You need to remove local, product-specific, or retired runtime assets from the canonical repo.

## When Not To Start Here

- You only need to inspect a generated output.
- You are looking at local machine settings, secrets, caches, or user-specific runtime state.
- You are changing product implementation files. Those are outside this triad source-of-truth.

Generated outputs include `AGENTS.md`, `CLAUDE.md`, `.cursor/`, `.codex/agents/`, and `.claude/agents/`. Regenerate them from `.ai/` rather than editing them directly.

## Promotion Rule

Promote only reusable shared assets into this catalog:

- rules go in `rules/`
- skills go in `skills/`
- agent definitions go in `agents-source/`

Keep local settings, examples with private data, product implementation files, and retired runtime mirrors outside the canonical catalog.

## Related References

- Repo map: `.ai/repo-map.md`
- Shared book: `.ai/book/`
- Kernel: `.ai/kernel/`
- Deployment script: `deploy.ps1`
- Validation script: `validate.ps1`
