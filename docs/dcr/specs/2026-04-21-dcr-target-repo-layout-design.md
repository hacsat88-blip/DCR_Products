# DCR Target Repo Layout Design

## Goal

サトシ開発の repo 構成を、DCR core、Product workspace、generated output、historical docs の責務ごとに読み分けやすくし、`deploy.ps1` / `validate.ps1` / 既存 skill の保存先契約を壊さずに整理する。

## Relation To Prior Model

この spec は、[docs/dcr/specs/archive/2026-04-21-dcr-core-product-boundary-design.md](docs/dcr/specs/archive/2026-04-21-dcr-core-product-boundary-design.md) の boundary model を統合し、後継の正本として扱う。

core / Product / generated / historical docs の 4 層モデル、移行フェーズ、設計原則はこの文書へ集約した。

## Current State

2026-04-21 時点の前提:

- `.ai/catalog/rules/`, `.ai/catalog/skills/`, `.ai/catalog/agents-source/` の taxonomy は文書化済み
- repo-local generated mirror と user-level managed target の境界は定義済み
- `validate.ps1` と `deploy.ps1 -Check` は clean に通る
- root `.vscode/` はすでに DCR core-safe な最小構成に寄っている

現時点の主な曖昧さは、root workspace の壊れではなく、次の 3 点にある。

1. Product-local overlay の標準形がまだ固定されていない
2. `docs/dcr/specs/` と `docs/dcr/plans/` に active と historical document が混在しやすい
3. repo の理想構成を 1 枚で説明する stable reference がまだ無い

## Design Principles

1. DCR core は Product 不在でも成立する
2. Product 固有資産は Product の近くに置く
3. generated output は consumer が期待する path を維持する
4. docs の active path は既存 skill の既定保存先を壊さない
5. history の整理は archive 追加で行い、既定 path の rename では始めない
6. 先に contract を固定し、その後に move / archive を進める

## Recommended Layers

### Layer A: DCR Core

root に残す shared source-of-truth:

- `.ai/catalog/`
- `.ai/kernel/`
- `.ai/module/`
- `.dcr/`
- `templates/`
- `docs/dcr/`
- `deploy.ps1`, `validate.ps1`, `init-project.ps1`
- root `.vscode/` の共通設定

ここには Product が 1 つも存在しなくても意味がある資産だけを置く。

### Layer B: Product Workspace

`Product/<product>/` は個別アプリの正本と local workflow を持つ。

推奨形:

```text
Product/
  <product>/
    README.md
    docs/
    .vscode/
    .ai/
      rules/
      skills/
      agents/
    src/ or app/
```

`Product/<product>/.ai/` は root の DCR core を置き換えるものではなく、product-local overlay として扱う。
ここに置くのは source-of-truth 側の rule / skill / agent source だけとし、generated mirror や editor-specific output は含めない。

### Layer C: Generated Output

generated output は概念上 1 層として扱うが、path は現行 consumer 契約を維持する。

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.windsurf/` (Git 管理外)
- `.claude/agents/` (Git 管理外)
- `.codex/agents/` (Git 管理外)

この段階では `.generated/` へ一括移動しない。理由は、各 editor / CLI が現在の path を直接参照しているため。
大量生成 mirror は Git 管理対象にせず、`deploy.ps1` による再生成契約を正本にする。

### Layer D: Historical Docs

active docs の既定 path は維持し、history だけ archive に分離する。

推奨形:

```text
docs/
  dcr/
    architecture/
    instruction-governance.md
    development-workflow.md
    specs/
      YYYY-MM-DD-*.md
      archive/
    plans/
      YYYY-MM-DD-*.md
      archive/
```

ここでの重要な判断は次の 2 点。

- active spec / plan の drop zone は `docs/dcr/specs/` と `docs/dcr/plans/` のまま残す
- archive は subdirectory で追加し、既定保存先そのものは rename しない

## Stable Reference Docs

`docs/dcr/` には 3 種類の docs を明確に分ける。

1. policy
   - `instruction-governance.md`
   - `development-workflow.md`
2. design / implementation records
   - `specs/`
   - `plans/`
3. stable reference
   - `architecture/`
   - 将来的に `reference/` を追加して repo layout や glossary を置く

推奨: repo 全体の説明は 1 枚の stable reference に寄せ、spec / plan はその時点の変更判断に集中させる。

## Product Overlay Rules

Product overlay を root へ混ぜないための gate:

1. 実在する `Product/<product>/` がある
2. `README.md` か runbook がある
3. owner が分かる
4. root shared 化の必要がある asset だけを昇格する

次のものは root へ追加しない。

- destination の無い Product 専用 rule
- destination の無い Product 専用 skill
- destination の無い Product 専用 agent source

## Recommended Immediate Moves

### 1. Archive-first docs cleanup

最初にやるべき docs 整理は delete ではなく archive である。

理由:

- skill / spec / plan の保存先契約を壊さない
- 履歴価値を失わない
- 検索ノイズを段階的に減らせる

### 2. Product workspace template

`templates/product/` を追加し、新しい Product を置くときの最小構成を固定する。

最低限欲しいもの:

- `README.md`
- `.vscode/`
- `.ai/`
- `docs/`

`templates/product/` 自体は実在 Product discovery の対象にせず、bootstrap 用の例示ディレクトリとして扱う。

### 3. Repo layout reference

`docs/dcr/reference/repo-layout.md` のような 1 枚物を追加し、README から誘導する。

これにより、README にすべての構成説明を抱え込ませずに済む。

## Explicit Non-Goals

- generated output path を一斉 rename すること
- `docs/dcr/specs/` と `docs/dcr/plans/` の active path 自体を変更すること
- Product を即時に別 repo へ分離すること
- 実在しない Product へ overlay を先行移設すること

## Phased Rollout

### Phase 1: Reference And Archive Contract

- target repo layout の stable docs を追加する
- `specs/archive/` と `plans/archive/` を追加する
- README から導線を張る

### Phase 2: Product Workspace Standard

- `templates/product/` を作る
- product-local `.ai/` と `.vscode/` の最低限を固定する

### Phase 3: Historical Doc Relocation

- active と archive を分類する
- 実装済みで参照頻度の低い docs を archive へ move する
- `rg` と validation で参照切れを確認する

### Phase 4: Optional Overlay Loader Work

- 必要なら Product overlay を load する別 deploy flow を追加する
- root deploy は DCR core のまま維持する
- この phase は layout documentation と archive 導入の初回移行 plan には含めず、real Product consumer が出た時点で follow-up に切り出す

## Acceptance Criteria

- DCR core、Product、generated、historical docs の境界を 1 枚で説明できる
- active spec / plan の既定保存先を壊さない
- docs 整理は archive-first の方針で進められる
- Product を追加するときの最小構成がぶれない
- `deploy.ps1` と `validate.ps1` の現行契約を崩さない

## Recommended Next Actions

1. archive directory の追加
2. repo layout stable reference の追加
3. `templates/product/` の追加
4. active / archive の初回棚卸し
5. 必要なら overlay migration gate を docs から script へ昇格
