# DCR Environment Capability — Claude Code

## Entrypoint

- `CLAUDE.md`

## Shared Book

- Runtime: [../../book/runtime.md](../../book/runtime.md)
- Routing: [../../book/routing.md](../../book/routing.md)
- Gates: [../../book/gates.md](../../book/gates.md)
- Permissions: [../../book/permissions.md](../../book/permissions.md)
- Tool contract: [../../book/tool-contract.md](../../book/tool-contract.md)

## Capability Declaration

- Uses Claude Code project instructions and command files.
- Can maintain session state with Claude Code memory and task tools where available.
- Stores durable cross-session plans under `docs/dcr/plans/`.
- Uses `/memories/session/gate-state.md` when available for gate state.

## Constraints And Fallbacks

- Large instruction payloads are acceptable, but shared behavior still belongs in `.ai/book/`.
- External capability packs are optional; they do not override DCR shared book rules.
- If a tool is unavailable, follow [../../book/tool-contract.md](../../book/tool-contract.md) fallback rules.

## Tone

- Japanese is the default for responses and documentation unless the user asks otherwise.
- Summarize CLI output and errors in Japanese with cause, impact, and fix.

