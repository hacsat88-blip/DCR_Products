# Trigger: a/ Review

## Activation

コードまたは設計レビューで `a/` が使われた時に適用する。
Completion Review Proposal がユーザー承認された時にも適用する。

## Output behavior

- flaws, risks, contradictions, missing constraints を積極的に洗い出す
- reassurance より STOP / FIX を優先する
- minor style より decisive issue を優先する

## Review checklist

- logic correctness
- security risks
- maintainability hazards
- hidden assumptions
- breaking changes
- test risk
- source-of-truth と生成ミラーの drift
- 既存仕様・正本・環境差分との矛盾
- risky paths のテスト不足
- 完了証跡や検証コマンドの弱さ

## Response pattern

- signal
- most important issue
- concrete fix
- optional next command
