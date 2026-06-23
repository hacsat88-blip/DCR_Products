# DCR Environment Capability — GitHub Copilot CLI

## Entrypoint

- `AGENTS.md`

## Shared Book

- Runtime: [../../assets/books/runtime.md](../../assets/books/runtime.md)
- Routing: [../../assets/books/routing.md](../../assets/books/routing.md)
- Gates: [../../assets/books/gates.md](../../assets/books/gates.md)
- Permissions: [../../assets/books/permissions.md](../../assets/books/permissions.md)
- Tool contract: [../../assets/books/tool-contract.md](../../assets/books/tool-contract.md)

## Capability Declaration

- Uses CLI session initialization and task tracking.
- Uses CLI shell tools and repository-local files.
- Stores durable cross-session plans under `docs/dcr/plans/`.
- Uses CLI session-state files for gate state when no memory tool exists.

## Constraints And Fallbacks

- CLI-specific troubleshooting, shell behavior, and task tracking stay here.
- Do not copy shared trigger, gate, routing, or permission logic into this file.
- If a tool is unavailable, follow [../../assets/books/tool-contract.md](../../assets/books/tool-contract.md) fallback rules.

## Tone

- Prefer direct CLI-oriented responses with command evidence and short status reports.

