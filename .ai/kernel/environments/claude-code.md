# DCR Kernel Environment — Claude Code

## Entrypoint

- `CLAUDE.md`

## Environment-specific behavior

- 応答とドキュメントは日本語を基本とする
- CLI 出力やエラーは引用しつつ、日本語で cause / impact / fix を要約する
- command files 一覧を持ち、trigger は silent apply を徹底する
- 共通ルールは [../_base.md](../_base.md) を source of truth とする

## Session plan handoff

- セッション間の計画引き継ぎは `docs/dcr/plans/` に保存する
- CLAUDE.md のセッション開始時に `docs/dcr/plans/` を確認し、未完了の計画があれば継続を提案する
- gate state は `/memories/session/gate-state.md` で管理（Claude Code の TodoWrite と併用）

## Gate state interaction

- gate state は session スコープのファイルで管理
- p/ 承認時に `plan_approved: true` を記録
- q/ 通過時に `qa_passed: true` を記録
- sh/ は `qa_passed: true` がない場合に🔴 Stop を返す

## Notes

- Claude Code は大きい instructions を扱えるため、差分に加えて運用メッセージを保持しやすい
- 外部 capability pack は DCR control layer を上書きしない