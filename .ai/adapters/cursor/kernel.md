# DCR Environment Capability — Cursor

## Entrypoint

- `.cursor/rules/dcr-kernel.mdc`

## Shared Book

- Runtime: [../../core/runtime.md](../../core/runtime.md)
- Routing: [../../routing/router.md](../../routing/router.md)
- Gates: [../../routing/gates.md](../../routing/gates.md)
- Permissions: [../../core/permissions.md](../../core/permissions.md)
- Tool contract: [../../core/tool-contract.md](../../core/tool-contract.md)

## Capability Declaration

- Uses generated Cursor rules from `.ai/core/kernel.md`.
- `.cursorignore` hides generated mirrors and deprecated aliases from Cursor discovery.
- Can use editor-side context and repository files available to Cursor.

## Constraints And Fallbacks

- Cursor rule loading is path- and glob-dependent.
- Keep shared runtime behavior in `.ai/core/` and `.ai/core/kernel.md`; do not redefine it here.
- If a tool is unavailable, follow [../../core/tool-contract.md](../../core/tool-contract.md) fallback rules.

## Tone

- Prefer concise code-assist responses with direct edits or actionable snippets.

