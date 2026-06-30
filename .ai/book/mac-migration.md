# Mac Migration

Mac移行の正本は Codex、Claude Code、Cursor の三面だけに限定する。

## Canonical Scope

- Codex: `AGENTS.md`, `.codex/`, `.ai/environments/codex/`
- Claude Code: `CLAUDE.md`, `.claude/`, `.ai/environments/claude-code/`
- Cursor: `.cursor/`, `.cursorignore`, `.ai/environments/cursor/`
- Shared source: `.ai/book/`, `.ai/kernel/`, `.ai/catalog/rules/`, `.ai/catalog/skills/`, `.ai/catalog/agents-source/`
- Tooling required to regenerate and verify the triad: `deploy.ps1`, `validate.ps1`, and `tools/`

## Excluded From Source Of Truth

- Product work and generated app assets
- Reports, snapshots, and local analysis outputs
- VS Code Copilot, GitHub Copilot CLI, Devin, Windsurf, DCR runtime config, and other retired mirrors
- Local secrets, `.env`, credentials, machine-specific local settings, and runtime logs

## Migration Flow

1. Clone the repo on the Mac.
2. Install Codex, Claude Code, and Cursor.
3. Run `pwsh -ExecutionPolicy Bypass -File .\deploy.ps1`.
4. Run `pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check`.
5. Run `pwsh -ExecutionPolicy Bypass -File .\validate.ps1`.

If Product work becomes shared again, promote only reviewed reusable rules, skills, agents, or docs into `.ai/catalog/` or `.ai/book/`. Do not add Product directories back to the Mac migration core.
