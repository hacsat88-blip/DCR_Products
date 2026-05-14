# Windsurf Templates

This directory contains only Windsurf source templates that are copied by
`tools/adapters/windsurf.ps1`.

## Source Of Truth

- Rules are generated from `.ai/kernel/dcr-kernel.md` and `.ai/catalog/rules/`.
- Workflows are generated from `.claude/commands/` plus optional
  `templates/windsurf/.windsurf/workflows/*.md`.
- MCP template config lives in `templates/windsurf/.windsurf/mcp_config.example.json`.
- The repo-local `.windsurf/` directory is generated output and stays untracked.

Do not add rule templates under `templates/windsurf/.windsurf/rules/`; they are
not consumed by the adapter and will fail the Windsurf template quality check.
