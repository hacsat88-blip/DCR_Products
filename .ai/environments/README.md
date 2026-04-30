# DCR Environments

This directory contains thin capability declarations for each runtime environment.

The shared thinking source of truth is [../book/runtime.md](../book/runtime.md). Environment files must not redefine runtime logic, trigger semantics, gates, routing, permissions, or safety boundaries.

## Layout

- `vscode-copilot/kernel.md`: VS Code Copilot Chat capability declaration
- `claude-code/kernel.md`: Claude Code capability declaration
- `copilot-cli/kernel.md`: GitHub Copilot CLI capability declaration
- `codex/kernel.md`: Codex capability declaration
- `cursor/kernel.md`: Cursor capability declaration
- `windsurf/kernel.md`: Windsurf capability declaration

## Runtime Entrypoints

`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/`, and `.windsurf/` remain in their runtime-specific locations because tools auto-load those paths.

## Rule

- Put shared behavior in `.ai/book/`.
- Put compatibility runtime mirrors in `.ai/kernel/`.
- Put only entrypoint, capability, state storage, tone, and fallback notes here.
- If a needed difference changes thinking or safety behavior, update `.ai/book/` instead of redefining it here.

