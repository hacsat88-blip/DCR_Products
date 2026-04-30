# DCR Environment Capability - Warp

## Entrypoint

- `AGENTS.md`

## Shared Book

- Runtime: [../../book/runtime.md](../../book/runtime.md)
- Routing: [../../book/routing.md](../../book/routing.md)
- Gates: [../../book/gates.md](../../book/gates.md)
- Permissions: [../../book/permissions.md](../../book/permissions.md)
- Tool contract: [../../book/tool-contract.md](../../book/tool-contract.md)

## Capability Declaration

- Uses Warp Project Rules from the repository root `AGENTS.md`.
- Can use Warp agents and terminal context according to Warp app settings.
- Does not use a repository-managed Warp `settings.json`; Warp application settings are managed by the app and local data store.

## Constraints And Fallbacks

- Keep shared runtime behavior in `.ai/book/` and `.ai/kernel/`.
- Keep project-level Warp rules in `AGENTS.md` so Codex, GitHub Copilot CLI, and Warp share the same entrypoint.
- If a tool is unavailable, follow [../../book/tool-contract.md](../../book/tool-contract.md) fallback rules.

## Tone

- Japanese is the default for user-facing responses and CLI output summaries unless the user asks otherwise.
- Summarize errors in Japanese with cause, impact, and fix.
