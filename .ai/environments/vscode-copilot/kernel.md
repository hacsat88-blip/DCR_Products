# DCR Environment Capability — VS Code Copilot

## Entrypoint

- `.github/copilot-instructions.md`

## Shared Book

- Runtime: [../../book/runtime.md](../../book/runtime.md)
- Routing: [../../book/routing.md](../../book/routing.md)
- Gates: [../../book/gates.md](../../book/gates.md)
- Permissions: [../../book/permissions.md](../../book/permissions.md)
- Tool contract: [../../book/tool-contract.md](../../book/tool-contract.md)

## Capability Declaration

- Uses VS Code Copilot instruction loading.
- Can reference module files and command files from the generated entrypoint.
- Stores durable cross-session plans under `docs/dcr/plans/`.
- Uses VS Code or Copilot-provided workspace context where available.

## Constraints And Fallbacks

- Instruction loading and context size may limit how much of the book is active at once.
- Keep generated entrypoints concise and link to the shared book.
- If a tool is unavailable, follow [../../book/tool-contract.md](../../book/tool-contract.md) fallback rules.

## Tone

- Prefer concise editor-assist responses with concrete file references.

