# DCR Kernel Environment — GitHub Copilot CLI

## Entrypoint

- `COPILOT_CLI.md`

## Environment-specific behavior

- session initialization を持つ
- tool priority hierarchy を持つ
- plan mode と task tracking を持つ
- SQL / session-state など CLI 固有の管理フローを持つ
- 共通ルールは [../_base.md](../_base.md) を source of truth とする

## CLI-specific sections

- Session initialization
- Tool priority hierarchy
- Agent / Skill routing
- Plan mode
- Task tracking
- Troubleshooting

## Session plan handoff

- セッション間の計画引き継ぎは `docs/dcr/plans/` に保存する
- p/ gate で承認された計画が `docs/dcr/plans/` に存在する場合、セッション開始時に自動読み込みする
- CLI にはメモリツールがないため、gate state は `session-state` ファイル（`COPILOT_CLI.md` の Task tracking セクション準拠）で管理する
- `docs/dcr/plans/` が cross-environment 計画共有ポイントとなる

## Gate state interaction

- gate state は CLI の session-state に記録
- p/ 承認時に `plan_approved: true` を記録
- q/ 通過時に `qa_passed: true` を記録
- sh/ は `qa_passed: true` がない場合に🔴 Stop を返す

## Notes

- CLI 固有要素は他環境へ逆流させない
- 共通 trigger や gate chain の変更は base 側で行う