# Environment Diffs

This directory keeps only thin environment-specific diffs for the Mac migration triad.

- `codex/kernel.md`: Codex-specific behavior
- `claude-code/kernel.md`: Claude Code-specific behavior
- `cursor/kernel.md`: Cursor-specific behavior

Runtime entrypoints remain in their tool-native locations:

- Codex: `AGENTS.md`
- Claude Code: `CLAUDE.md`
- Cursor: `.cursor/`

Do not edit generated entrypoints directly. Edit `.ai/book/`, `.ai/kernel/`, `.ai/catalog/rules/`, `.ai/catalog/skills/`, or `.ai/catalog/agents-source/`, then regenerate with:

```powershell
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1
```
