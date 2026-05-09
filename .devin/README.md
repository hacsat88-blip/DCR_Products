# Devin Thin Layer

This directory contains Devin-specific project configuration and operational guidance.

## Purpose

- Keep shared DCR behavior in `.ai/`.
- Keep generated runtime mirrors in tool-specific folders such as `.windsurf/`, `.cursor/`, `AGENTS.md`, and `CLAUDE.md`.
- Keep Devin-only behavior here: session rules, hook examples, workflow shortcuts, and Devin-specific skills.

## Layout

```text
.devin/
  DEVIN.md                         # Devin-specific project entrypoint
  config.example.json              # Example policy profile, not an active runtime schema
  hooks.example.json               # Example hook wiring, adapt before enabling
  hooks/                           # Hook scripts used by hooks.example.json
  workflows/                       # Devin workflow shortcuts
  skills/devin-session-operator/   # Devin session operations skill
```

## Activation Notes

- If Devin auto-loads `.devin/DEVIN.md`, treat it as the local entrypoint.
- If not, read `.devin/DEVIN.md` at session start before implementation work.
- Do not copy `config.example.json` or `hooks.example.json` into an active global config until the current Devin hook/config schema is confirmed.
- Hook environment names in `hooks.example.json` are provisional. Verify the current Devin hook payload schema before enabling, and adapt scripts if your runtime uses different names.
- Workflow verification commands assume PowerShell is available. Prefer `pwsh` when Windows PowerShell lacks required modules such as `Get-FileHash`.
- For user-level Devin configuration, use `~/.config/devin/`.

## MCP Setup

Devin supports custom MCP servers through Settings > MCP Marketplace > Add Your Own.
Keep MCP activation in Devin's UI or current user-level configuration; this repository only records the safe project-local example.

Use this STDIO server when enabling the shared OSS delegation bridge:

```json
{
  "transport": "STDIO",
  "command": "python",
  "args": [
    "<DEVIN_REPO_ROOT>/tools/mcp-servers/opencode-bridge/server.py"
  ],
  "env_variables": {}
}
```

Replace `<DEVIN_REPO_ROOT>` with the absolute checkout path visible inside Devin's environment before testing the server.
After saving the custom MCP, use Devin's Test listing tools action. The expected tools are `oss_explore`, `oss_document`, and `oss_implement`.

## Source-of-Truth Rule

Edit source files under `.ai/` when changing shared DCR behavior. Do not treat generated mirrors as source of truth.
