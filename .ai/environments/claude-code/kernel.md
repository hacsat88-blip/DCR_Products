# DCR Environment Capability — Claude Code

## Entrypoint

- `CLAUDE.md`

## Shared Book

- Runtime: [../../assets/books/runtime.md](../../assets/books/runtime.md)
- Routing: [../../assets/books/routing.md](../../assets/books/routing.md)
- Gates: [../../assets/books/gates.md](../../assets/books/gates.md)
- Permissions: [../../assets/books/permissions.md](../../assets/books/permissions.md)
- Tool contract: [../../assets/books/tool-contract.md](../../assets/books/tool-contract.md)

## Capability Declaration

- Uses Claude Code project instructions and command files.
- Can maintain session state with Claude Code memory and task tools where available.
- Stores durable cross-session plans under `docs/dcr/plans/`.
- Uses `/memories/session/gate-state.md` when available for gate state.

## Constraints And Fallbacks

- Large instruction payloads are acceptable, but shared behavior still belongs in `.ai/assets/books/`.
- External capability packs are optional; they do not override DCR shared book rules.
- If a tool is unavailable, follow [../../assets/books/tool-contract.md](../../assets/books/tool-contract.md) fallback rules.

## Tone

- Japanese is the default for responses and documentation unless the user asks otherwise.
- Summarize CLI output and errors in Japanese with cause, impact, and fix.

