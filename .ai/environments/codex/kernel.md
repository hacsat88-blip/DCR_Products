# DCR Environment Capability — Codex

## Entrypoint

- `AGENTS.md`

## Shared Book

- Runtime: [../../assets/books/runtime.md](../../assets/books/runtime.md)
- Routing: [../../assets/books/routing.md](../../assets/books/routing.md)
- Gates: [../../assets/books/gates.md](../../assets/books/gates.md)
- Permissions: [../../assets/books/permissions.md](../../assets/books/permissions.md)
- Tool contract: [../../assets/books/tool-contract.md](../../assets/books/tool-contract.md)

## Capability Declaration

- Reads and edits workspace files through Codex tools.
- Runs shell commands with sandbox and approval controls.
- Can delegate only when the user explicitly authorizes sub-agents.
- Uses `docs/dcr/plans/` for cross-session plan handoff.
- Uses local session state rather than a persistent memory tool.

## Constraints And Fallbacks

- GitHub Copilot CLI also uses `AGENTS.md`; CLI-specific capability notes live in [../copilot-cli/kernel.md](../copilot-cli/kernel.md).
- If a tool is unavailable, follow [../../assets/books/tool-contract.md](../../assets/books/tool-contract.md) fallback rules.

## Tone

- Keep Codex output concise, implementation-oriented, and evidence-based.

