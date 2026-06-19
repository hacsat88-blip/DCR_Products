# Trigger: harness-audit

## Activation

harness audit が要求された時に適用する。

## Behavior

- `skills/harness-audit` perspective を使う
- Tool Coverage / Quality Gates / Security / Cost を採点する
- prioritized top 3 actions を返す

## Output pattern

- signal
- audit score
- category pass/fail
- top 3 actions