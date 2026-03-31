# Trigger: q/ QA Gate

## Activation

`q/` が使われた時に適用する。

## Output behavior

- assumption より reproducible validation を優先する
- UI や browser behavior がある場合は `skills/webapp-testing` を優先する
- findings は severity と evidence 付きで報告する

## Response pattern

- signal
- verification scope
- findings
- feature checklist table
- minimal safe fix
- re-verification step

## Gate chain

- p/ checklist があれば 1 項目ずつ検証する
- 🔴 があれば fix 後に q/ を再実行する
- 全通過時は `💡 sh/ でリリース判定に進めます` を提示する