<!-- AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
Generated from: .ai/book + .ai/kernel + .ai/catalog/rules/ + .ai/catalog/skills/ + .ai/catalog/agents-source/
To regenerate: Run pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# Codex / GitHub Copilot CLI / Warp Entrypoint

Unified entry point for Codex, GitHub Copilot CLI, and Warp Project Rules environments.

GitHub Copilot CLI specific behavior lives in [.ai/environments/copilot-cli/kernel.md](.ai/environments/copilot-cli/kernel.md).
Warp-specific behavior lives in [.ai/environments/warp/kernel.md](.ai/environments/warp/kernel.md).

## Scope Summary

- Active rules: 53
- Active skills: 133
- Active agents: 114
- Deprecated aliases (rules/skills/agents): 10 / 3 / 34

## Source of Truth

- Rules: [.ai/catalog/rules/](.ai/catalog/rules/)
- Skills: [.ai/catalog/skills/](.ai/catalog/skills/)
- Agents: [.ai/catalog/agents-source/](.ai/catalog/agents-source/)
- Shared Book: [.ai/book/](.ai/book/)
- Kernel: [.ai/kernel/](.ai/kernel/)
- Environment diff (Codex): [.ai/environments/codex/kernel.md](.ai/environments/codex/kernel.md)
- Environment diff (Warp): [.ai/environments/warp/kernel.md](.ai/environments/warp/kernel.md)

---

## Unified Coordinator

全タスクの単一入口は **pied-piper** agent。Rule/Skill/Agent 選定は決定木に従い、採用前に3行報告（採用名・理由・期待効果）を出す。

## Runtime Memory Preflight

「これどう？」「サトシ開発目線で」「前と同じ観点で」「入れる価値ある？」「導入して」「置き換える必要ある？」「また同じエラー」「過去判断も踏まえて」など、過去判断が品質に影響する相談では、利用可能な runtime memory を着手前に確認する。

agentmemory 互換 backend が使える場合は、同種タスク、関連ファイルの過去判断、採用/非採用ポリシー、検証済みコマンドを短く検索する。使えない場合は通常の repo 探索へフォールバックする。memory recall は正本ではなく、.ai/catalog / .ai/book / repo artifact / 現在の git 状態を優先する。

詳細：
- [.ai/module/unified-coordinator.md](.ai/module/unified-coordinator.md)
- [.ai/module/unified-router.md](.ai/module/unified-router.md)
- [.ai/module/unified-integration.md](.ai/module/unified-integration.md)

---

## Response Language

ユーザーへの回答、説明、CLI 出力の要約、エラー原因・影響・修正案は、ユーザーが別言語を明示しない限り日本語で行う。

## Warp Project Rules

Warp はこの AGENTS.md を Project Rules として読む。Warp 本体の設定はアプリ内 Settings とローカルデータベースで管理されるため、このリポジトリでは settings.json を正本化しない。
