# OpenCode Environment Diff for DCR

This file defines OpenCode-specific behavior for the DCR (サトシ開発) project.

## Shared Book

- Runtime: [../../book/runtime.md](../../book/runtime.md)
- Routing: [../../book/routing.md](../../book/routing.md)
- Gates: [../../book/gates.md](../../book/gates.md)
- Permissions: [../../book/permissions.md](../../book/permissions.md)
- Tool contract: [../../book/tool-contract.md](../../book/tool-contract.md)

## Scope

- **Active rules**: 71 (from `.ai/catalog/rules/`)
- **Active skills**: DCR skills from deploy-managed `~/.agents/skills/` plus OpenCode-specific `.opencode/skills/`
- **Active agents**: OpenCode-specific `.opencode/agents/`; shared agent source remains `.ai/catalog/agents-source/`

## OpenCode-Specific Configuration

### Agents

OpenCode adds 3 project-specific subagents:

1. **`@dcr-code-reviewer`**
   - DCR quality-standard code review
   - Read-only (`edit: deny`)
   - Covers: correctness, security, maintainability, testing, performance

2. **`@dcr-test-creator`**
   - Test planning, implementation, coverage evaluation
   - Edit with approval (`edit: ask`)
   - Covers: unit, integration, E2E, property-based, performance tests

3. **`@dcr-rule-auditor`**
   - DCR rule/skill structure quality audit
   - Read-only (`edit: deny`)
   - Validates: frontmatter, H1, body, validate.ps1 integration

### Skills

OpenCode adds 3 project-specific skills:

1. **`satoshi-dev-flow`**
   - DCR Pipeline (p/ -> implement -> q/ -> sh/) for OpenCode
   - Gate automation: Plan Gate, QA Gate, Ship Gate

2. **`dcr-rule-patterns`**
   - Index/search/mapping for 71 rules + 134 skills
   - Routing category search, use-case mapping, frontmatter checklists

3. **`tech-stack-guide`**
   - Tech stack guide for サトシ開発
   - PowerShell, Next.js/React, Python, TOML/YAML/JSON, MCP

### Configuration Loading

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["AGENTS.md", ".opencode/kernel.md"]
}
```

The canonical project config is the repository-root `opencode.json`. The `.opencode/opencode.json` copy is kept only as a compatibility mirror for older local setups and should not be treated as the primary entrypoint.

## Integration with DCR Kernel

### Unified Coordinator

All task routing enters through the shared **pied-piper** coordinator and the `unified-router` decision tree. OpenCode-local agents and skills are overlays; they do not replace the DCR source of truth.

For Skill, Agent, subagent, parallel orchestration, external MCP/API, or P2/P3 work, use **proposal -> user approval -> execution**. Only a single low-risk P1 read-only exploration may run after a short visible preflight.

Natural-language replies are accepted only when the target is unique. `おすすめで` / `推奨で` / `Aで` / `1で` approve a uniquely selected option. `それで` / `進めて` / `承認` / `OK` approve only when there is exactly one active option. `任せる` / `おまかせ` / `よさそう` / `よさげ` / `たぶん` / `多分` remain ambiguous and must not execute. `キャンセル` / `中止` reject; `別案` / `別の案` / `軽く` refine.

When `.ai/kernel/gate-state.json` has `proposal_state.status = proposed|refined`, interpret a short next utterance as a proposal reply before normal routing. The final approve/reject/refine/ambiguous transition follows `tools/lib/gate-state.ps1`.

### Signal Protocol

OpenCode agents use the DCR signal protocol:
- `PASS`: Gate cleared, proceed to next
- `FIX`: Issue found, corrective action needed
- `STOP`: Critical blocker, halt and reassess
- `WARN`: Advisory, non-blocking

### Permission Model

OpenCode permissions align with DCR safety boundaries:
- `edit: deny` → Plan-only mode (analysis, review)
- `edit: ask` → Approval required for changes
- `edit: allow` → Full development mode
- `bash: allow` → Script execution permitted
- `bash: ask` → Approval required for commands

### Work Approach

For 3+ step tasks, OpenCode follows the DCR pipeline:
1. **Plan Gate (p/)**: Scope definition, checklist generation
2. **Implementation**: Chunked execution with progress reports
3. **QA Gate (q/)**: Evidence-based verification
4. **Ship Gate (sh/)**: Release decision

## Differences from Other Environments

### vs. Claude Code
- Claude Code uses `CLAUDE.md` as entrypoint
- OpenCode uses root `opencode.json` + `AGENTS.md` + `.opencode/kernel.md`
- OpenCode has a native `skill` tool

### vs. Cursor
- Cursor uses `.cursor/rules/` directory
- OpenCode uses `.opencode/` directory
- OpenCode has built-in agent system (`@mention`)

## Runtime Memory

OpenCode supports `agentmemory` compatible backends:
- Search past decisions, related file history
- Adopt/reject policies
- Verified commands

When available, runtime memory is checked before task execution.

## External Skills

OpenCode auto-loads external skills from:
- `.opencode/skills/<name>/SKILL.md`
- `.agents/skills/<name>/SKILL.md`
- `.claude/skills/<name>/SKILL.md`
- `~/.config/opencode/skills/<name>/SKILL.md`
- `~/.claude/skills/<name>/SKILL.md`
- `~/.agents/skills/<name>/SKILL.md`

For this repository, DCR skills remain canonical in `.ai/catalog/skills/` and are propagated to the user-level `.agents/skills/` target by `deploy.ps1`. OpenCode-specific skills in `.opencode/skills/` are a thin local layer and do not replace the DCR catalog.

## Source of Truth Boundaries

- Rules: edit `.ai/catalog/rules/`; OpenCode receives the shared runtime through `AGENTS.md` and `.opencode/kernel.md`.
- Skills: edit `.ai/catalog/skills/`; OpenCode can load the deployed `.agents/skills/` mirror and the three OpenCode-local skills.
- Agents: edit `.ai/catalog/agents-source/` for shared Codex/Claude definitions. Keep `.opencode/agents/` for OpenCode-native project agents unless an explicit OpenCode agent mirror is added.
- OpenCode config: edit `.ai/environments/opencode/opencode.json` and run `deploy.ps1 -Target opencode`.
