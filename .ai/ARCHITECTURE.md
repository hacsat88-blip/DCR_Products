# DCR Triad Architecture

This repository is the source-of-truth for the Mac migration triad:

- Codex
- Claude Code
- Cursor

Retired runtime surfaces and product implementation assets are outside the canonical architecture.

## Source Layers

```text
.ai/
  book/                 shared operating policy
  kernel/               shared runtime kernel, gates, triggers, permissions
  environments/
    codex/              Codex-specific delta
    claude-code/        Claude Code-specific delta
    cursor/             Cursor-specific delta
  catalog/
    rules/              shared rule source
    skills/             shared skill source
    agents-source/      canonical agent source

tools/                  adapters, manifest tools, validators
deploy.ps1              generate and check triad runtime outputs
validate.ps1            repo integrity gate
```

## Runtime Outputs

Generated outputs are derived from `.ai/` and `tools/`.

| Surface | Output | Source |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.codex/agents/` | `.ai/book/`, `.ai/kernel/`, `.ai/catalog/`, `.ai/environments/codex/` |
| Claude Code | `CLAUDE.md`, `.claude/agents/` | `.ai/book/`, `.ai/kernel/`, `.ai/catalog/`, `.ai/environments/claude-code/` |
| Cursor | `.cursor/`, `.cursorignore` | `.ai/book/`, `.ai/kernel/`, `.ai/catalog/`, `.ai/environments/cursor/` |

Generated outputs are not the first edit target. Edit the owning source file, then run deploy and validation.

## Deploy Flow

```text
.ai source
  -> tools/adapters/codex.ps1
  -> tools/adapters/claude.ps1
  -> tools/adapters/cursor.ps1
  -> tools/adapters/agents.ps1
  -> AGENTS.md / CLAUDE.md / .cursor/ / .codex/agents/ / .claude/agents/
```

Use:

```powershell
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
pwsh -ExecutionPolicy Bypass -File .\validate.ps1
```

## Routing

The single coordination entry is `pied-piper`. Rule, Skill, and Agent selection follows the unified-router policy:

1. Prefer explicit user intent.
2. Match active skill/rule metadata.
3. Reduce visible candidates to the necessary set.
4. Report candidate, reason, and expected effect before firing skills, agents, subagents, orchestration, external MCP/API, or P2/P3 operations.

## Safety Boundaries

- Keep product implementation files and sample product data out of this source-of-truth.
- Keep secrets, `.env`, local settings, caches, and logs out of Git.
- Keep retired runtime mirrors out of active metadata and active docs.
- Keep Codex / Claude Code / Cursor as the only runtime surfaces unless the scope is explicitly changed.
