# DCR Environment Capability — Codex

## Entrypoint

- `AGENTS.md`

## Shared Book

- Runtime: [../../core/runtime.md](../../core/runtime.md)
- Routing: [../../routing/router.md](../../routing/router.md)
- Gates: [../../routing/gates.md](../../routing/gates.md)
- Permissions: [../../core/permissions.md](../../core/permissions.md)
- Tool contract: [../../core/tool-contract.md](../../core/tool-contract.md)

## Capability Declaration

- Reads and edits workspace files through Codex tools.
- Runs shell commands with sandbox and approval controls.
- Can delegate only when the user explicitly authorizes sub-agents.
- Uses `docs/dcr/plans/` for cross-session plan handoff.
- Uses local session state rather than a persistent memory tool.

## Constraints And Fallbacks

- GitHub Copilot CLI also uses `AGENTS.md`; CLI-specific capability notes live in [../copilot-cli/kernel.md](../copilot-cli/kernel.md).
- If a tool is unavailable, follow [../../core/tool-contract.md](../../core/tool-contract.md) fallback rules.

## Tone

- Keep Codex output concise, implementation-oriented, and evidence-based.

