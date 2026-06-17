# DCR Environment Capability — Cursor

## Entrypoint

- `.cursor/rules/dcr-kernel.mdc`

## Shared Book

- Runtime: [../../book/runtime.md](../../book/runtime.md)
- Routing: [../../book/routing.md](../../book/routing.md)
- Gates: [../../book/gates.md](../../book/gates.md)
- Permissions: [../../book/permissions.md](../../book/permissions.md)
- Tool contract: [../../book/tool-contract.md](../../book/tool-contract.md)

## Capability Declaration

- Uses generated Cursor rules from `.ai/kernel/dcr-kernel.md`.
- `.cursorignore` hides generated mirrors and deprecated aliases from Cursor discovery.
- Can use editor-side context and repository files available to Cursor.

## Constraints And Fallbacks

- Cursor rule loading is path- and glob-dependent.
- Keep shared runtime behavior in `.ai/book/` and `.ai/kernel/dcr-kernel.md`; do not redefine it here.
- If a tool is unavailable, follow [../../book/tool-contract.md](../../book/tool-contract.md) fallback rules.

## Tone

- Prefer concise code-assist responses with direct edits or actionable snippets.

