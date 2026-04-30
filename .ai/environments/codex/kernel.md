# DCR Environment Capability — Codex

## Entrypoint

- `AGENTS.md`

## Shared Book

- Runtime: [../../book/runtime.md](../../book/runtime.md)
- Routing: [../../book/routing.md](../../book/routing.md)
- Gates: [../../book/gates.md](../../book/gates.md)
- Permissions: [../../book/permissions.md](../../book/permissions.md)
- Tool contract: [../../book/tool-contract.md](../../book/tool-contract.md)

## Capability Declaration

- Reads and edits workspace files through Codex tools.
- Runs shell commands with sandbox and approval controls.
- Can delegate only when the user explicitly authorizes sub-agents.
- Uses `docs/dcr/plans/` for cross-session plan handoff.
- Uses local session state rather than a persistent memory tool.

## Constraints And Fallbacks

- GitHub Copilot CLI also uses `AGENTS.md`; CLI-specific capability notes live in [../copilot-cli/kernel.md](../copilot-cli/kernel.md).
- If a tool is unavailable, follow [../../book/tool-contract.md](../../book/tool-contract.md) fallback rules.

## Tone

- Keep Codex output concise, implementation-oriented, and evidence-based.

