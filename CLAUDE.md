<!-- AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
Generated from: .ai/book + .ai/kernel + .ai/catalog/rules/ + .ai/catalog/skills/ + .ai/catalog/agents-source/
To regenerate: Run pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# Claude Code Entrypoint

Unified entry point for Claude Code environment.

## Scope Summary

- Active rules: 53
- Active skills: 68
- Active agents: 116
- Deprecated aliases (rules/skills/agents): 10 / 80 / 34

## Source of Truth

- Rules: [.ai/catalog/rules/](.ai/catalog/rules/)
- Skills: [.ai/catalog/skills/](.ai/catalog/skills/)
- Agents: [.ai/catalog/agents-source/](.ai/catalog/agents-source/)
- Shared Book: [.ai/book/](.ai/book/)
- Kernel: [.ai/kernel/](.ai/kernel/)
- Environment diff (Claude Code): [.ai/environments/claude-code/kernel.md](.ai/environments/claude-code/kernel.md)

---

## Unified Coordinator

Primary coordinator: **pied-piper** agent. Route Rule/Skill/Agent selection through **unified-router**, reduce candidates to the necessary set, and report the candidate, reason, and expected effect before firing.

When Skill, Agent, subagent, parallel orchestration, external MCP/API, or P2/P3 operation is involved, use candidate proposal -> user approval -> execution. P1 read-only low-risk exploration may proceed after a short notice.

Approval vocabulary is strict. `おすすめで` / `推奨で` / `A` / `1` approve only when they bind to one immediately previous candidate. `OK` approves only when there is a single candidate.

Ambiguous terms such as `おまかせ` require a proposal or reconfirmation, not execution. `キャンセル` rejects. `別案` / `軽く` request a refined proposal.

If `.ai/kernel/gate-state.json` has `proposal_state.status = proposed|refined`, interpret short next messages as responses to the active proposal before normal routing. Classification follows `tools/lib/gate-state.ps1`.

## Completion Review Proposal

For implementation, generated output, configuration, MCP/API, or source-of-truth changes, propose `a/` Review Gate + `code-reviewer` before final completion unless the work is trivial docs/typo, read-only investigation, or the user explicitly says no review.

## Runtime Memory Preflight

For questions that depend on previous DCR decisions, recall runtime memory before acting. Memory is only supporting context; current repo artifacts, `.ai/catalog`, `.ai/book`, and git state remain authoritative.

Details:
- [.ai/module/unified-coordinator.md](.ai/module/unified-coordinator.md)
- [.ai/module/unified-router.md](.ai/module/unified-router.md)
- [.ai/module/unified-integration.md](.ai/module/unified-integration.md)
