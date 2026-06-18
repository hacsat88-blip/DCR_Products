# DCR Environment Capability — VS Code Copilot

## Entrypoint

- `.github/copilot-instructions.md`

## Shared Book

- Runtime: [../../core/runtime.md](../../core/runtime.md)
- Routing: [../../routing/router.md](../../routing/router.md)
- Gates: [../../routing/gates.md](../../routing/gates.md)
- Permissions: [../../core/permissions.md](../../core/permissions.md)
- Tool contract: [../../core/tool-contract.md](../../core/tool-contract.md)

## Capability Declaration

- Uses VS Code Copilot instruction loading.
- Can reference module files and command files from the generated entrypoint.
- Stores durable cross-session plans under `docs/dcr/plans/`.
- Uses VS Code or Copilot-provided workspace context where available.

## Constraints And Fallbacks

- Instruction loading and context size may limit how much of the core is active at once.
- Keep generated entrypoints concise and link to the shared core.
- If a tool is unavailable, follow [../../core/tool-contract.md](../../core/tool-contract.md) fallback rules.

## Tone

- Prefer concise editor-assist responses with concrete file references.

