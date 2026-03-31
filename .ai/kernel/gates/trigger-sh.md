# Trigger: sh/ Ship Gate

## Activation

`sh/` が使われた時に適用する。

## Output behavior

- completion claim の前に verification evidence を要求する
- `skills/verification-before-completion` と `skills/finishing-a-development-branch` を優先する
- tests 確認後にのみ merge / PR option を示す

## Response pattern

- signal
- verification summary
- release readiness decision
- commit message proposal
- next release action

## Gate chain

- q/ 通過済みが前提
- q/ 未実行なら `⚠️ q/ を先に実行してからリリース判定を行います` を提示する