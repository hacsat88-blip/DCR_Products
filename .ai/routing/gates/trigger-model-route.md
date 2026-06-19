# Trigger: model-route

## Activation

model routing guidance が要求された時に適用する。

## Behavior

- task complexity を low / medium / high で分類する
- cheapest safe model tier を先に提案する
- escalation / de-escalation rule を定義する

## Output pattern

- signal
- chosen tier
- reason
- fallback / escalation condition