# Agent Source of Truth

This folder is the single place to edit shared agent definitions.

## Convention

- Put Codex agent definitions here as `.toml` files.
- Put Claude Code agent definitions here as `.md` files.
- Keep matching agent names aligned by basename.
  - Example: `reviewer.toml` and `reviewer.md`

## TOML Schema

```toml
name = "agent-id"                    # kebab-case identifier (required)
description = "..."                 # Single-line description (required)
version = "1.0.0"                   # SemVer version (required)
model = "gpt-5.4"                  # Model specifier (required)
model_reasoning_effort = "medium"   # low | medium | high (required)
sandbox_mode = "read-only"          # read-only | workspace-write (required)

# Optional: skill dependencies
uses_skills = []                    # e.g. ["code-review", "systematic-debugging"]

# Optional: agent composition
inherits = ""                       # e.g. "multi-agent-coordinator"

[instructions]
text = """..."""                    # Agent system prompt
```

## Model Selection Guide

| Criteria                                 | Model Tier                  | Example                              |
| ---------------------------------------- | --------------------------- | ------------------------------------ |
| Read-only exploration, simple formatting | Low (`gpt-5.3-codex-spark`) | search-specialist, trend-analyst     |
| Multi-file edits, integration logic      | Medium (`gpt-5.4`)          | frontend-developer, debugger         |
| Architecture decisions, security review  | High (latest capable)       | architect-reviewer, security-auditor |

**Default**: Use `gpt-5.4` with `medium` reasoning unless cost optimization or high complexity justifies a different tier.

## MD Schema (Claude Code)

```yaml
---
name: agent-id          # Must match .toml basename
description: "..."      # Must match .toml description
---

You are the [agent-name] Claude Code subagent.

Primary focus: [domain focus areas]

Working rules:
- [Rule 1]
- [Rule 2]
```

## Sync

Run this from the repository root:

```powershell
# Deploy all (includes agents sync)
.\deploy.ps1

# Or, agents only
.\deploy.ps1 -Target agents
```

The deployment process copies:

- `*.toml` to `.codex/agents/` (Git 管理外 generated mirror)
- `*.md` to `.claude/agents/` (Git 管理外 generated mirror)

## Notes

- This is a source folder, not a runtime folder.
- The two tools cannot consume the same file format, so the folder is shared by naming convention and sync, not by direct file reuse.
- `validate.ps1` checks that all `.toml` files have a `version` field.
- Increment version on breaking changes to agent instructions.
