# AI Control Plane Start Here

This directory is the first stop for agents working on DCR assets.

For a workspace-wide orientation, read `.ai/00_START_HERE.md` first. The
numbered `.ai/10_CONTROL` through `.ai/90_COMPAT` directories are a navigation
overlay that points to the current canonical paths without moving them.

## Read Order

1. `.ai/00_START_HERE.md`
2. `.ai/10_CONTROL/navigation-map.json`
3. `.ai/20_SOURCE/source-layout.json`
4. `source-registry.json`
5. `target-registry.json`
6. `home-inventory.policy.json`
7. `lifecycle.policy.md`
8. `retired-targets.policy.json`
9. `.ai/compatibility/legacy-path-map.json`

## Current Migration Rule

The control plane is active. Asset sources have moved, while some core runtime
roots remain in compatibility mode.

- Rules, skills, agents, and shared books are authored under `.ai/assets/`.
- Kernel and environment sources still use `.ai/kernel/` and `.ai/environments/`
  until their source-layout entries are explicitly switched.
- Modules are authored under `.ai/core/modules/`; `.ai/module/` is a compatibility
  entrypoint.
- Control-plane metadata lives under `.ai/control-plane/`.
- Distribution metadata lives under `.ai/distribution/`.
- `.ai/20_SOURCE/source-layout.json` declares the current primary source path for
  each group and any pending future migration path.
- `.ai/10_CONTROL`, `.ai/20_SOURCE`, `.ai/30_ROUTING`, `.ai/40_DISTRIBUTION`,
  `.ai/50_EXTERNAL`, and `.ai/90_COMPAT` are navigation-oriented overlays.
- `.ai/routing/state/` is local/generated state and should not be committed.

## Agent Editing Rule

Do not edit generated targets directly. Edit the source asset or the control-plane manifest that generates the target.

Generated or runtime targets include:

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.codex/agents/`
- `.claude/agents/`
- `.cursor/rules/`
- `C:\Users\hacsa\.agents`
- `C:\Users\hacsa\.config\dcr`

## Verification

After changing source assets or control-plane metadata, run:

```powershell
.\tools\update-ai-control-plane-registries.ps1
.\tools\audit-ai-control-plane.ps1 -HomeRoot $env:USERPROFILE -NoSecrets
.\deploy.ps1 -Check
.\validate.ps1
```

If a home path is inaccessible, do not read secrets or force access. Classify it in `home-inventory.policy.json` and report the boundary.
