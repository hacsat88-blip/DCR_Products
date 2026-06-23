# AI Control Plane Current State Audit

Date: 2026-06-20
Workspace: `C:\Users\hacsa\Desktop\サトシ開発`

## Verdict

`.ai/` を source of truth にする方針は入っているが、現状は完全一元化とは言い切れない。生成先 drift、ホーム側 runtime 資産、PowerShell 起動解決、文字化けした architecture doc が残っている。

## Repo State Observed Before Implementation

- Branch before implementation: `main...origin/main [behind 37]`
- Untracked before implementation: `.ai/routing/`
- Branch created for implementation: `ai-control-plane`
- `git status` emitted warnings for inaccessible `C:\Users\hacsa\.config\git\ignore`.

## Drift And Validation Findings

- `.\deploy.ps1 -Check` found VS Code Copilot skills missing at `C:\Users\hacsa\.agents\skills`.
- `.\deploy.ps1 -Check` found Claude agents drift: `.claude\agents\pied-piper.md`.
- `.\deploy.ps1 -Check` found Devin canonical mirror drift, including modified config/skill files and extra rule/workflow files.
- `.\deploy.ps1 -Check` found Windsurf compatibility mirror drift, including modified config and selected skill files.
- `.\deploy.ps1 -Check` hit access denied while checking `C:\Users\hacsa\.config\dcr\config.json`.
- `.\validate.ps1` reached routing index freshness and then failed when its internal `pwsh.exe` child process could not launch.

## Home Inventory Findings

The following home-side AI-related roots exist and must be treated as classified runtime inventory, not blindly deleted:

- `C:\Users\hacsa\.agents`: only `.skill-lock.json` was visible in the shallow inventory.
- `C:\Users\hacsa\.codex`: contains Codex runtime state plus candidate or external asset checkouts such as `agent-skills`, `anthropic-skills`, `ecc`, `agents`, `rules`, and `skills`.
- `C:\Users\hacsa\.claude`: contains Claude runtime settings, credentials-like files, `agents`, `skills`, and plugin marketplace cache.
- `C:\Users\hacsa\.cursor`: contains Cursor runtime data, extensions, generated/project MCP state, `rules`, and `skills-cursor`.
- `C:\Users\hacsa\.config`: contains `dcr\config.json` plus unrelated app configs.

## Immediate Design Implication

The safe next step is not deletion. The safe next step is an AI Control Plane that declares:

- source assets: what is canonical and hashable,
- generated/runtime targets: what is overwritten by deploy,
- home inventory: what is managed, external runtime, cache, candidate import, ignored, or secret-adjacent,
- compatibility: how old `.ai/catalog` and new `.ai/assets` coexist during migration.
