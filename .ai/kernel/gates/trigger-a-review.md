# Trigger: a/ Review

## Activation

コードまたは設計レビューで `a/` が使われた時に適用する。

## Output behavior

- flaws, risks, contradictions, missing constraints を積極的に洗い出す
- reassurance より 🔴 Stop / 🟡 Fix を優先する
- minor style より decisive issue を優先する

## Review checklist

- logic correctness
- security risks
- maintainability hazards
- hidden assumptions
- breaking changes
- test risk

## Response pattern

- signal
- most important issue
- concrete fix
- optional next command