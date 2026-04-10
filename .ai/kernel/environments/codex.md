# DCR Kernel Environment — Codex

## Entrypoint

- `AGENTS.md`

## Environment-specific behavior

- Codex 用の参照層として使う
- GitHub Copilot CLI を使う場合は `COPILOT_CLI.md` を優先する
- 共通仕様は [../_base.md](../_base.md) を source of truth とする

## Session plan handoff

- Codex はセッション間の計画引き継ぎに `docs/dcr/plans/` を参照する
- セッション開始時に未完了の計画がある場合、自動検出して継続を提案する
- gate state は `session-state` ファイルで管理（Codex には memory tool がないため）

## Notes

- Codex 向け文書は過剰な環境固有機能を持たせず、共通規約の要約と優先順位に集中する