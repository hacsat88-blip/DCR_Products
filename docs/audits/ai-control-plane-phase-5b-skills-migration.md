# AI Control Plane Phase 5b Skills Migration

Date: 2026-06-21

## Scope

Moved shared skill source directories from `.ai/catalog/skills` to
`.ai/assets/skills`.

## Result

- Active skill directories moved: 70
- `SKILL.md` files under new primary: 71
- Root routing index moved: `.ai/assets/skills/_SKILLS_ROUTING_INDEX.md`
- Legacy active directories remaining: 0
- Legacy path marker: `.ai/catalog/skills/README.md`

## New Primary

- `.ai/assets/skills`

## Legacy Path

- `.ai/catalog/skills`

Do not add new skill directories to the legacy path. Use resolver helpers:

- `Resolve-DcrSourcePath -AssetType "skills"`
- `Get-DcrResolvedSourceRelativePath -AssetType "skills"`

## Verification Targets

- `tools/update-ai-control-plane-registries.ps1 -Check`
- `tools/audit-ai-control-plane.ps1 -HomeRoot $env:USERPROFILE -NoSecrets`
- `tools/test-routing-entrypoint-contract.ps1`
- `tools/validate-skill-capabilities.ps1`
- `tools/manifest-compiler.ps1`
- `deploy.ps1 -Check`
- `validate.ps1`
