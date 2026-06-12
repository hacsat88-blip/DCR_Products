# DCR Environment Capability - Devin

## Entrypoint

- `AGENTS.md`
- `.devin/config.json`
- `.devin/skills/*/SKILL.md`

## Shared Book

- Runtime: [../../book/runtime.md](../../book/runtime.md)
- Routing: [../../book/routing.md](../../book/routing.md)
- Gates: [../../book/gates.md](../../book/gates.md)
- Permissions: [../../book/permissions.md](../../book/permissions.md)
- Tool contract: [../../book/tool-contract.md](../../book/tool-contract.md)

## Capability Declaration

- Devin CLI reads `AGENTS.md` as always-on project rules.
- Devin CLI and Devin Local use project skills under `.devin/skills/`.
- MCP and permission configuration belong in `.devin/config.json` for project-shared settings and `.devin/config.local.json` for local secrets.

## Constraints And Fallbacks

- Do not edit `.devin/` generated files directly; update `.ai/` sources and run `deploy.ps1 -Target devin`.
- Do not commit secrets. Use `.devin/config.local.json` for local-only credentials.
- Workflow procedures should be represented as Devin skills because Devin Local does not support legacy Cascade workflows.
