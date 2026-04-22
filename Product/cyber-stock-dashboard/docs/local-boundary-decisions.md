# Cyber Stock Dashboard Local Boundary Decisions

このメモは、Cyber Stock Dashboard の product-local 資産をどこまで持つかを固定するための最小判断集です。

## Current Decisions

- shared DCR governance の正本は root `docs/dcr/` と `.ai/catalog/` に置く
- `Product/cyber-stock-dashboard/docs/` は、この product にだけ必要な runbook や設計判断を置く
- `Product/cyber-stock-dashboard/.ai/` は reserved overlay lane として維持し、現時点では active な rule / skill / agent source を置かない

## Promotion Rules

- 他 Product でも再利用したい判断は root `docs/dcr/` へ昇格する
- product-local の AI asset を本当に使うときだけ `.ai/` に追加する
- `.ai/` を使う前に、loader か明示的な local workflow を先に決める

## Current Outcome

- 現時点では `docs/` は keep
- `.ai/` は defer ではなく reserved のまま keep
- active な product-local AI asset が無い限り、追加の `.ai` 階層は増やさない