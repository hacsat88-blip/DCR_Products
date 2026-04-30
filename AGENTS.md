<!-- ⚠️ AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY ⚠️
Generated from: .ai/book + .ai/kernel + .ai/catalog/rules/ + .ai/catalog/skills/ + .ai/catalog/agents-source/
To regenerate: Run .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# Codex / GitHub Copilot CLI Entrypoint

Unified entry point for Codex and GitHub Copilot CLI environments.

GitHub Copilot CLI specific behavior lives in [.ai/environments/copilot-cli/kernel.md](.ai/environments/copilot-cli/kernel.md).

## Scope Summary

- Active rules: 53
- Active skills: 115
- Active agents: 109
- Deprecated aliases (rules/skills/agents): 10 / 3 / 34

## Source of Truth

- Rules: [.ai/catalog/rules/](.ai/catalog/rules/)
- Skills: [.ai/catalog/skills/](.ai/catalog/skills/)
- Agents: [.ai/catalog/agents-source/](.ai/catalog/agents-source/)
- Shared Book: [.ai/book/](.ai/book/)
- Kernel: [.ai/kernel/](.ai/kernel/)
- Environment diff (Codex): [.ai/environments/codex/kernel.md](.ai/environments/codex/kernel.md)

---

## Unified Coordinator

全タスクの単一入口は **pied-piper** agent。Rule/Skill/Agent 選定は決定木に従い、採用前に3行報告（採用名・理由・期待効果）を出す。

詳細：
- [.ai/module/unified-coordinator.md](.ai/module/unified-coordinator.md)
- [.ai/module/unified-router.md](.ai/module/unified-router.md)
- [.ai/module/unified-integration.md](.ai/module/unified-integration.md)
