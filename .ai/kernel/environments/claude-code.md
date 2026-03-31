# DCR Kernel Environment — Claude Code

## Entrypoint

- `CLAUDE.md`

## Environment-specific behavior

- 応答とドキュメントは日本語を基本とする
- CLI 出力やエラーは引用しつつ、日本語で cause / impact / fix を要約する
- command files 一覧を持ち、trigger は silent apply を徹底する
- 共通ルールは [../_base.md](../_base.md) を source of truth とする

## Notes

- Claude Code は大きい instructions を扱えるため、差分に加えて運用メッセージを保持しやすい
- 外部 capability pack は DCR control layer を上書きしない