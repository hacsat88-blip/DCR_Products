# DCR Environment Capability — VS Code Copilot

## Entrypoint

- `.github/copilot-instructions.md`

## Shared Book

- Runtime: [../../assets/books/runtime.md](../../assets/books/runtime.md)
- Routing: [../../assets/books/routing.md](../../assets/books/routing.md)
- Gates: [../../assets/books/gates.md](../../assets/books/gates.md)
- Permissions: [../../assets/books/permissions.md](../../assets/books/permissions.md)
- Tool contract: [../../assets/books/tool-contract.md](../../assets/books/tool-contract.md)

## Capability Declaration

- Uses VS Code Copilot instruction loading.
- Can reference module files and command files from the generated entrypoint.
- Stores durable cross-session plans under `docs/dcr/plans/`.
- Uses VS Code or Copilot-provided workspace context where available.

## Constraints And Fallbacks

- Instruction loading and context size may limit how much of the book is active at once.
- Keep generated entrypoints concise and link to the shared book.
- If a tool is unavailable, follow [../../assets/books/tool-contract.md](../../assets/books/tool-contract.md) fallback rules.

## Tone

- Prefer concise editor-assist responses with concrete file references.

