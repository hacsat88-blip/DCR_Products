# Mac Migration

This chapter defines the shared policy for moving this DCR workspace from Windows to macOS while keeping the DCR core as the source of truth.

## Repository Strategy

- Keep this repository as the canonical DCR core repository.
- Do not create a separate Mac-only repository unless history rewriting or a public sanitized export is explicitly approved.
- Treat `.ai/book/`, `.ai/kernel/`, `.ai/catalog/`, `.ai/environments/`, `templates/`, and `tools/` as the shared source and maintenance layer.
- Treat `AGENTS.md`, `CLAUDE.md`, `.github/`, `.cursor/`, `.codex/`, and `.claude/` as runtime entrypoints or generated/runtime surfaces, not as the first edit target.

## Product Boundary

- `Product/` is local product work and is excluded from the shared Mac-ready DCR core.
- Keep local Product files on disk or back them up separately; do not delete them as part of DCR core migration.
- Promote only reusable Product rules, skills, agents, or templates into `.ai/catalog/` after review.
- Build outputs, dependency folders, and runtime caches such as `node_modules/`, `.next/`, `*.tsbuildinfo`, and `output/` are not shared source.

## Encoding And Line Endings

- Use UTF-8 for text files.
- Use LF as the default repository line ending.
- Keep Windows batch files as CRLF.
- Mark binary files such as images, PDFs, Excel workbooks, and archives as binary.
- On macOS, use `git config core.autocrlf input` before editing the repository.

## Mac First-Run Checklist

1. Install PowerShell 7 and Git.
2. Clone the repository.
3. Run `git config core.autocrlf input` inside the clone.
4. Run `pwsh -ExecutionPolicy Bypass -File ./deploy.ps1 -Check`.
5. Run `pwsh -ExecutionPolicy Bypass -File ./validate.ps1`.
6. If generated runtime mirrors are missing or drifted, run `pwsh -ExecutionPolicy Bypass -File ./deploy.ps1`, then repeat the check and validation commands.

## Safety Rules

- Do not commit `.env`, `.env.*`, local credentials, runtime state, or per-session telemetry.
- Do not edit generated mirrors directly when the source exists under `.ai/`.
- Do not assume Windows PowerShell 5.1 output proves encoding health; prefer PowerShell 7 and UTF-8-aware tooling.
- If Product work becomes shared again, document its owner and promotion boundary before tracking it.
