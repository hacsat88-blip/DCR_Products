# Cyber Stock Dashboard Local AI Overlay

このディレクトリは Cyber Stock Dashboard 専用の product-local overlay 用 source-of-truth を置く場所です。

## Allowed

- `rules/`
- `skills/`
- `agents/`

## Not Allowed

- generated mirror
- editor-specific output
- root DCR core を恒久的に置き換える複製

shared 化が必要な asset だけ root の `.ai/catalog/rules/`, `.ai/catalog/skills/`, `.ai/catalog/agents-source/` へ昇格します。

## Current Status

現時点では root `deploy.ps1` や共通 adapter は `Product/cyber-stock-dashboard/.ai/` を自動読込しません。
このフォルダは、将来 product-local loader を導入するか、明示的な local workflow を決めたときに使う reserved lane として維持します。
現時点では active な rule / skill / agent source は置かず、この README だけを境界マーカーとして残します。