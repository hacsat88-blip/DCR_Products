# DCR Environment Capability — Cursor

## Entrypoint

- `.cursor/rules/dcr-kernel.mdc`

## Shared Book

- Runtime: [../../assets/books/runtime.md](../../assets/books/runtime.md)
- Routing: [../../assets/books/routing.md](../../assets/books/routing.md)
- Gates: [../../assets/books/gates.md](../../assets/books/gates.md)
- Permissions: [../../assets/books/permissions.md](../../assets/books/permissions.md)
- Tool contract: [../../assets/books/tool-contract.md](../../assets/books/tool-contract.md)

## Capability Declaration

- Uses generated Cursor rules from `.ai/kernel/dcr-kernel.md`.
- `.cursorignore` hides generated mirrors and deprecated aliases from Cursor discovery.
- Can use editor-side context and repository files available to Cursor.

## Constraints And Fallbacks

- Cursor rule loading is path- and glob-dependent.
- Keep shared runtime behavior in `.ai/assets/books/` and `.ai/kernel/dcr-kernel.md`; do not redefine it here.
- If a tool is unavailable, follow [../../assets/books/tool-contract.md](../../assets/books/tool-contract.md) fallback rules.

## Tone

- Prefer concise code-assist responses with direct edits or actionable snippets.

