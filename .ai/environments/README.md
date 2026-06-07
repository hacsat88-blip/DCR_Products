# DCR Environments

This directory contains thin capability declarations for each runtime environment.

The shared thinking source of truth is [../book/runtime.md](../book/runtime.md). Environment files must not redefine runtime logic, trigger semantics, gates, routing, permissions, or safety boundaries.

## Layout

- `vscode-copilot/kernel.md`: VS Code Copilot Chat capability declaration
- `claude-code/kernel.md`: Claude Code capability declaration
- `copilot-cli/kernel.md`: GitHub Copilot CLI capability declaration
- `codex/kernel.md`: Codex capability declaration
- `cursor/kernel.md`: Cursor capability declaration
- `devin/kernel.md`: Devin CLI, Devin Local, and Devin Desktop compatibility declaration

## Runtime Entrypoints

`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/`, `.devin/`, and `.windsurf/` remain in their runtime-specific locations because tools auto-load those paths.

## Runtime Loading Model

- Claude Code: `CLAUDE.md` plus `.claude/settings.json` hooks. Hook enforcement is Claude-specific; shared policy still belongs in `.ai/book/` and `.ai/kernel/`.
- Codex and GitHub Copilot CLI: `AGENTS.md` carries the thin shared entrypoint and links back to the shared book/kernel.
- Cursor: `.cursor/rules/dcr-kernel.mdc` is generated from the shared kernel and `.cursorignore` keeps generated mirrors and deprecated aliases out of discovery.
- VS Code Copilot: `.github/copilot-instructions.md` stays concise and points to the shared book, kernel, rules, and skills.
- Devin CLI / Devin Local: `AGENTS.md` is always-on context, `.devin/config.json` holds project-safe config, and `.devin/skills/` mirrors skills, workflows, and agent perspectives.
- Devin Desktop legacy Cascade: `.windsurf/` is a generated compatibility mirror, not a source of truth.

## Rule

- Put shared behavior in `.ai/book/`.
- Put compatibility runtime mirrors in `.ai/kernel/`.
- Put only entrypoint, capability, state storage, tone, and fallback notes here.
- If a needed difference changes thinking or safety behavior, update `.ai/book/` instead of redefining it here.
