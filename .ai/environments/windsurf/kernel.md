# DCR Environment Capability — Windsurf

## Entrypoint

- `.windsurf/rules/dcr-kernel.md`

## Shared Book

- Runtime: [../../book/runtime.md](../../book/runtime.md)
- Routing: [../../book/routing.md](../../book/routing.md)
- Gates: [../../book/gates.md](../../book/gates.md)
- Permissions: [../../book/permissions.md](../../book/permissions.md)
- Tool contract: [../../book/tool-contract.md](../../book/tool-contract.md)

## Capability Declaration

- Uses generated Windsurf rules and workflows.
- Loads `.windsurf/rules/dcr-kernel.md` as the always-on runtime baseline.
- Mirrors active catalog rules as model-decision rules.

## Constraints And Fallbacks

- Windsurf generated files are deploy-managed; edit `.ai/` sources instead.
- Keep shared runtime behavior in `.ai/book/` and `.ai/kernel/dcr-kernel.md`; do not redefine it here.
- If a tool is unavailable, follow [../../book/tool-contract.md](../../book/tool-contract.md) fallback rules.

## Tone

- Prefer compact agentic workflow guidance with visible verification evidence.

