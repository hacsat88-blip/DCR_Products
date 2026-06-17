# Trigger: security-scan

## Activation

security scan が要求された時に適用する。

## Behavior

- `skills/security-scan` を適用する
- findings を severity 別に分類する
- critical / high が残る場合は fail とする

## Output pattern

- signal
- severity summary
- concrete remediation list
- re-scan step