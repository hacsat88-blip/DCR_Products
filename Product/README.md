# Product Workspace Index

このフォルダは、個別 Product の workspace をまとめる場所です。
shared source-of-truth ではなく、Product ごとの local source と workflow を見分けるための入口として使います。

## Directory Roles

- `Product/<product>/`
  - 実在 Product の workspace
- `Product/_template/`
  - 新規 Product bootstrap 用の最小雛形
  - active Product として扱わない

ignore 済みの standalone clone や外部 repo が同居することはありますが、DCR の shared source-of-truth としては扱いません。

## First Inspection Order For Product Work

1. `Product/<product>/README.md`
   - Product の目的、entrypoint、実行方法
2. `Product/<product>/docs/`
   - Product 固有の設計・仕様・runbook
3. `Product/<product>/.ai/`
   - product-local overlay の rule / skill / agent source
   - 現時点では root `deploy.ps1` が自動読込する前提ではなく、専用 loader か product-local workflow がある場合だけ実体を置く
4. `Product/<product>/.vscode/`
   - local workspace 設定

## Promotion Rule

複数 Product や複数 editor で再利用する asset だけを root の shared source-of-truth へ昇格します。

- shared rule: `.ai/catalog/rules/`
- shared skill: `.ai/catalog/skills/`
- shared agent source: `.ai/catalog/agents-source/`

Product 専用の generated mirror はここに置きません。

## Related References

- shared source-of-truth の入口: `.ai/catalog/README.md`
- repo 全体の配置ルール: `docs/dcr/reference/repo-layout.md`
- Product 雛形の意図: `Product/_template/`