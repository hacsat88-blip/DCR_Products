# AI Workspace Start Here

This file is the first read point for agents that need to understand or change
the DCR AI workspace.

## Fast Rule

Read in numeric order. Edit only the canonical source paths named by the map.
Generated targets are outputs, not authoring locations.

## Numeric Layers

1. `10_CONTROL` - source registries, target registries, lifecycle, and policy.
2. `20_SOURCE` - canonical rule, skill, agent, book, kernel, and environment sources.
3. `30_ROUTING` - router, gates, decision state schemas, and local routing state.
4. `40_DISTRIBUTION` - manifests, adapters, templates, deploy targets, and mirrors.
5. `50_EXTERNAL` - imported concepts, external capability records, and home inventory.
6. `90_COMPAT` - legacy path maps and migration compatibility notes.

## Current Stage

This is a navigation overlay. It points to canonical files; it is not itself the
authoring location for rules, skills, agents, books, kernel, or environment
content.

Authoritative source assets live in the current primary paths declared by:

- `.ai/control-plane/source-registry.json`
- `.ai/control-plane/target-registry.json`
- `.ai/compatibility/legacy-path-map.json`

The numbered directories explain where to look and what each layer means.

## Before Editing

1. Read `.ai/10_CONTROL/navigation-map.json`.
2. Read `.ai/20_SOURCE/source-layout.json` when changing source layout or paths.
3. Confirm the target file is a canonical source, not a generated target.
4. Prefer the current primary paths in `.ai/20_SOURCE/source-layout.json`
   until `legacy-path-map.json` says a future path is primary.
5. After source or control-plane changes, run the repo validation commands listed in
   `.ai/control-plane/START-HERE.md`.

## Never Edit Directly

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.codex/agents/`
- `.claude/agents/`
- `.cursor/rules/`
- user home runtime caches or secret-bearing config
