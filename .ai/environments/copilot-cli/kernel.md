# DCR Environment Capability — GitHub Copilot CLI

## Entrypoint

- `AGENTS.md`

## Shared Book

- Runtime: [../../book/runtime.md](../../book/runtime.md)
- Routing: [../../book/routing.md](../../book/routing.md)
- Gates: [../../book/gates.md](../../book/gates.md)
- Permissions: [../../book/permissions.md](../../book/permissions.md)
- Tool contract: [../../book/tool-contract.md](../../book/tool-contract.md)

## Capability Declaration

- Uses CLI session initialization and task tracking.
- Uses CLI shell tools and repository-local files.
- Stores durable cross-session plans under `docs/dcr/plans/`.
- Uses CLI session-state files for gate state when no memory tool exists.

## Constraints And Fallbacks

- CLI-specific troubleshooting, shell behavior, and task tracking stay here.
- Do not copy shared trigger, gate, routing, or permission logic into this file.
- If a tool is unavailable, follow [../../book/tool-contract.md](../../book/tool-contract.md) fallback rules.

## Tone

- Prefer direct CLI-oriented responses with command evidence and short status reports.

