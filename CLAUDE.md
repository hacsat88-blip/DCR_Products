<!-- AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
Generated from: .ai/core + .ai/routing + .ai/catalog/rules/ + .ai/catalog/skills/ + .ai/catalog/agents-source/
To regenerate: Run pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# Claude Code Entrypoint

Unified entry point for Claude Code environment.

## Scope Summary

- Active rules: 53
- Active skills: 68
- Active agents: 116
- Deprecated aliases (rules/skills/agents): 0 / 0 / 0

## Source of Truth

- Rules: [.ai/catalog/rules/](.ai/catalog/rules/)
- Skills: [.ai/catalog/skills/](.ai/catalog/skills/)
- Agents: [.ai/catalog/agents-source/](.ai/catalog/agents-source/)
- Core: [.ai/core/](.ai/core/)
- Routing: [.ai/routing/](.ai/routing/)
- Environment diff (Claude Code): [.ai/adapters/claude-code/kernel.md](.ai/adapters/claude-code/kernel.md)
---

## Unified Coordinator

全タスクの単一入口は **pied-piper** agent。
Rule/Skill/Agent の選定は [.ai/routing/router.md](.ai/routing/router.md) の決定木と **unified-router** skill に従い、
候補を増やさず必要十分な候補へ圧縮し、発火前に候補・理由・期待効果を報告する。

Skill、Agent、サブエージェント、並列 orchestration、外部 MCP/API、P2/P3 操作が関わる場合は、原則として **候補提示 → ユーザー承認 → 発火** の順に進める。P1 read-only の単独低リスク探索のみ、短い事前報告後に自動実行できる。

自然言語の承認は柔らかく拾うが、一意でない場合は再確認する。`おすすめで` / `推奨で` / `Aで` / `1で` は対象が一意の直前候補に結びつく場合のみ承認扱い。`それで` / `進めて` / `承認` / `OK` は単独候補の場合のみ承認扱い。

`いい感じに` / `任せる` / `おまかせ` / `よさそう` / `よさげ` / `たぶん` / `多分` は承認にせず、候補提示または再確認に戻す。`キャンセル` / `中止` は却下、`別案` / `別の案` / `軽く` は再提案として扱う。

`.ai/routing/state/gate-state.json` に `proposal_state.status = proposed|refined` がある場合、短い次発話は通常ルーティングより先に直前提案への返答として解釈する。承認・却下・修正・曖昧の分類は `tools/lib/gate-state.ps1` の proposal state machine に従う。

## Completion Review Proposal

実装・修正・生成物・設定変更・MCP/API 変更・source-of-truth 変更などの完成物がある場合、完了報告前に `a/` Review Gate + `code-reviewer` 相当のレビュー実行を提案する。レビューは自動実行せず、採用候補・理由・期待効果・承認が必要な理由を示し、ユーザー承認後に発火する。trivial docs/typo、read-only 調査、またはユーザーがレビュー不要を明示した場合は省略できる。

## Runtime Memory Preflight

「これどう？」「サトシ開発目線で」「前と同じ観点で」「入れる価値ある？」「導入して」「置き換える必要ある？」「また同じエラー」「過去判断も踏まえて」など、過去判断が品質に影響する相談では、利用可能な runtime memory を着手前に確認する。

agentmemory 互換 backend が使える場合は、同種タスク、関連ファイルの過去判断、採用/非採用ポリシー、検証済みコマンドを短く検索する。使えない場合は通常の repo 探索へフォールバックする。memory recall は正本ではなく、`.ai/catalog` / `.ai/core` / repo artifact / 現在の git 状態を優先する。

詳細：
- [.ai/routing/coordinator.md](.ai/routing/coordinator.md)
- [.ai/routing/router.md](.ai/routing/router.md)
- [.ai/routing/integration.md](.ai/routing/integration.md)
