# AI Control Plane Phase 5a Skills Preflight

Date: 2026-06-21

## Scope

Phase 5a prepared the skills source migration from `.ai/catalog/skills` to
`.ai/assets/skills` without moving skill directories yet.

Phase 5b completion note:

- Current primary is now `.ai/assets/skills`.
- `.ai/catalog/skills` is a compatibility marker only.
- Active skill directories moved: 70.
- Root routing index moved: `_SKILLS_ROUTING_INDEX.md`.

## Review Gate Findings

- `tools/adapters/cursor.ps1` had deprecated skill ignore paths hardcoded to
  `.ai/catalog/skills`. It now uses the resolved skills source path.
- `tools/lib/deprecated-aliases.ps1` emitted live deprecated skill source paths
  from `.ai/catalog/skills`. It now uses the resolved skills source path.
- `tools/test-routing-entrypoint-contract.ps1` hardcoded the
  `unified-router` skill path. It now resolves the active skills source path.
- `tools/audit-system.ps1` hardcoded the skills routing index path. It now
  resolves the active skills source path.
- `validate.ps1` already used resolved paths for behavior, but diagnostic text
  still named `.ai/catalog/skills`; the text now says resolved skills paths.

## Inventory

- Active skill directories in `.ai/catalog/skills`: 70
- Active skill directories in `.ai/assets/skills`: 0
- `.ai/assets/skills` is a preflight marker only.

## Migration Risks

- Skills are directory-shaped assets, not flat files. Moving them must preserve
  `SKILL.md` and any nested scripts, templates, or examples.
- VS Code Copilot user-home deployment depends on the resolved skills source.
- Deprecated skill aliases and Cursor ignore generation must follow the
  resolved path after the move.
- Historical deprecated alias registry entries may retain old source paths as
  history; do not rewrite them blindly.

## Recommended Phase 5b Gate

Before moving skills:

1. Confirm `.ai/assets/skills` has no active skill directories.
2. Move all active skill directories from `.ai/catalog/skills` to
   `.ai/assets/skills`.
3. Leave `.ai/catalog/skills/README.md` as a compatibility marker.
4. Switch `source-layout.json` and `legacy-path-map.json` current primary to
   `.ai/assets/skills`.
5. Regenerate source registry and deploy mirrors.
6. Verify with `deploy.ps1 -Check`, `validate.ps1`,
   `tools/test-routing-entrypoint-contract.ps1`, and
   `tools/validate-skill-capabilities.ps1`.
