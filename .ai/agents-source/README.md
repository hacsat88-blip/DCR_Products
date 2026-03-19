# Agent Source of Truth

This folder is the single place to edit shared agent definitions.

## Convention

- Put Codex agent definitions here as `.toml` files.
- Put Claude Code agent definitions here as `.md` files.
- Keep matching agent names aligned by basename.
  - Example: `reviewer.toml` and `reviewer.md`

## Sync

Run this from the repository root:

```powershell
.\sync-agents.ps1
```

The script copies:

- `*.toml` to `.codex/agents/`
- `*.md` to `.claude/agents/`

## Notes

- This is a source folder, not a runtime folder.
- The two tools cannot consume the same file format, so the folder is shared by naming convention and sync, not by direct file reuse.
