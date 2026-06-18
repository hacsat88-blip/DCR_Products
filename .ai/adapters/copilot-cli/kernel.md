# DCR Environment Capability — GitHub Copilot CLI

## Entrypoint

- `AGENTS.md`

## Shared Book

- Runtime: [../../core/runtime.md](../../core/runtime.md)
- Routing: [../../routing/router.md](../../routing/router.md)
- Gates: [../../routing/gates.md](../../routing/gates.md)
- Permissions: [../../core/permissions.md](../../core/permissions.md)
- Tool contract: [../../core/tool-contract.md](../../core/tool-contract.md)

## Capability Declaration

- Uses CLI session initialization and task tracking.
- Uses CLI shell tools and repository-local files.
- Stores durable cross-session plans under `docs/dcr/plans/`.
- Uses CLI session-state files for gate state when no memory tool exists.

## Constraints And Fallbacks

- CLI-specific troubleshooting, shell behavior, and task tracking stay here.
- Do not copy shared trigger, gate, routing, or permission logic into this file.
- If a tool is unavailable, follow [../../core/tool-contract.md](../../core/tool-contract.md) fallback rules.

## Tone

- Prefer direct CLI-oriented responses with command evidence and short status reports.

