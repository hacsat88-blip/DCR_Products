# Product Template

新しい Product workspace を切るときの最小構成例です。

## Purpose

- `Product/<product>/` に何を置くかの基準を揃える
- root DCR core と product-local asset を混ぜない
- `.vscode/` を product-local runtime/config の入口として始められるようにする
- `.ai/` は必要になった時だけ product-local overlay として追加できるようにする

## Minimum Structure

```text
README.md
docs/
.vscode/
.ai/   # optional
```

## Rules

- このディレクトリ自体は bootstrap 用であり、実在 Product として discovery しない
- Product 固有 asset だけを置く
- `.ai/` は active な product-local rule / skill / agent source、または明示的な local loader/workflow がある時だけ作る
- shared 化が必要な rule / skill / agent source だけ root 正本へ昇格する