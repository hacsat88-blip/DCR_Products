# DCR Environments

This directory contains thin capability declarations for each runtime environment.

The shared thinking source of truth is [../book/runtime.md](../book/runtime.md). Environment files must not redefine runtime logic, trigger semantics, gates, routing, permissions, or safety boundaries.

## Layout

- `vscode-copilot/kernel.md`: VS Code Copilot Chat capability declaration
- `claude-code/kernel.md`: Claude Code capability declaration
- `copilot-cli/kernel.md`: GitHub Copilot CLI capability declaration
- `codex/kernel.md`: Codex capability declaration
- `warp/kernel.md`: Warp Project Rules capability declaration
- `cursor/kernel.md`: Cursor capability declaration
- `windsurf/kernel.md`: Windsurf capability declaration
- `opencode/kernel.md`: OpenCode capability declaration

## Runtime Entrypoints

`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/`, `.windsurf/`, root `opencode.json`, and `.opencode/` remain in their runtime-specific locations because tools auto-load those paths. Warp uses the root `AGENTS.md` as its Project Rules entrypoint.

## Runtime Loading Model

- Claude Code: `CLAUDE.md` plus `.claude/settings.json` hooks. Hook enforcement is Claude-specific; shared policy still belongs in `.ai/book/` and `.ai/kernel/`.
- Codex and GitHub Copilot CLI: `AGENTS.md` carries the thin shared entrypoint and links back to the shared book/kernel.
- Cursor: `.cursor/rules/dcr-kernel.mdc` is generated from the shared kernel and `.cursorignore` keeps generated mirrors and deprecated aliases out of discovery.
- Windsurf: `.windsurf/rules/dcr-kernel.md` is the always-on baseline; generated catalog rules use Windsurf rule activation modes.
- VS Code Copilot: `.github/copilot-instructions.md` stays concise and points to the shared book, kernel, rules, and skills.
- OpenCode: root `opencode.json` loads `AGENTS.md` and `.opencode/kernel.md`; `.opencode/agents/` and `.opencode/skills/` are OpenCode-local overlays.

## Rule

- Put shared behavior in `.ai/book/`.
- Put compatibility runtime mirrors in `.ai/kernel/`.
- Put only entrypoint, capability, state storage, tone, and fallback notes here.
- If a needed difference changes thinking or safety behavior, update `.ai/book/` instead of redefining it here.
