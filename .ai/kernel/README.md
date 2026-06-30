# Kernel

`.ai/kernel/` contains the shared baseline used by the three supported Mac migration surfaces:

- Codex
- Claude Code
- Cursor

Generated entrypoints are intentionally thin:

- `AGENTS.md` links Codex back to `.ai/book/`, `.ai/kernel/`, and `.ai/catalog/`.
- `CLAUDE.md` links Claude Code back to the same source-of-truth tree.
- `.cursor/rules/dcr-kernel.mdc` mirrors the shared kernel for Cursor.

Edit the source files here and under `.ai/book/` or `.ai/catalog/`, then run:

```powershell
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```
