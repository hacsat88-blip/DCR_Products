# Trigger: p/ Plan Gate

## Activation

`p/` が使われた時に適用する。

## Output behavior

- scope と constraints を先に定義する
- multi-step work では `skills/writing-plans` を優先する
- plan が coherent になるまで implementation を始めない

## Response pattern

- signal
- goal and constraints
- phased plan
- implementation checklist
- first executable step

## Gate chain

- q/ で検証する checklist を必ず生成する
- 実装後は `💡 q/ でQA検証を実行します` を提示する
- feature proposal が必要なら `rules/feature-proposal.md` を参照する