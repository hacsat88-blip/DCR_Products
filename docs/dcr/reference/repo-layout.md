# DCR Repo Layout Reference

この文書は、サトシ開発の repo 全体をどこへ何を置く前提で運用するかを 1 枚で確認するための stable reference です。

## Four Layers

| Layer             | Responsibility                                  | Main Paths                                                                                                         |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| DCR core          | Product 不在でも成立する shared source-of-truth | `.ai/kernel/`, `.ai/catalog/`, `.ai/`, `.dcr/`, `templates/`, `docs/dcr/`, root operations scripts                   |
| Product workspace | 個別 Product の source code と local workflow   | `Product/<product>/`                                                                                               |
| generated output  | deploy により再生成される mirror                | `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.claude/agents/`, `.codex/agents/` |
| historical docs   | active ではない履歴文書                         | `docs/dcr/specs/archive/`, `docs/dcr/plans/archive/`                                                               |

## DCR Core

root に残すのは、どの Product を開いていなくても意味がある shared asset です。

- `.ai/catalog/rules/`: invariant、routing metadata、handoff policy
- `.ai/catalog/skills/`: reusable workflow、generator、analysis method
- `.ai/catalog/agents-source/`: runtime persona と execution specialist の source-of-truth
- `.ai/kernel/`: 全環境共通の kernel、権限、トリガー、runtime entrypoint source
- `.dcr/`, `templates/`: DCR 自身の設定と template 契約
- `docs/dcr/`: governance、workflow、reference、design record
- root editor workspace 設定は DCR core の正本にしない。共通運用は `.ai/`、`README.md`、`tools/` に集約する

`.dcr/` と `docs/dcr/` は logical control surface を構成するが、machine-readable config と human-readable docs のため物理的には分ける。詳細は `docs/dcr/reference/control-surface.md` を参照。

次のような asset は root に増やさない前提です。

- destination の無い Product 専用 rule / skill / agent source
- 1 つの Product でしか使わない local setting
- editor が読む generated mirror の手編集版

## Product Workspace

`Product/<product>/` は、その Product の local source-of-truth と実行導線を持ちます。

推奨する最小構成:

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
```

ルール:

- product-local `.ai/` は overlay 用の source-of-truth だけを置く
- generated mirror や editor-specific output は Product 側の `.ai/` に置かない
- shared 化が必要な asset だけ root の `.ai/catalog/rules/`, `.ai/catalog/skills/`, `.ai/catalog/agents-source/` へ昇格する

`templates/product/` は新しい Product を始めるときの bootstrap 例であり、実在 Product と同じ discovery 対象にはしません。

## Generated Output

generated output は 1 つの概念層ですが、path は既存 consumer 契約を維持します。

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.claude/agents/` (Git 管理外)
- `.codex/agents/` (Git 管理外)

判断原則:

- ここは直接編集しない
- 変更は source-of-truth 側から行い、`deploy.ps1` で再生成する
- 大量生成される editor mirror は Git 管理対象にせず、正本の重複を避ける
- `.generated/` のような新しい集約 path へは現時点で移さない

## Active Docs And Archive

active doc の drop zone は変えません。

- active spec: `docs/dcr/specs/`
- active plan: `docs/dcr/plans/`

archive は subdirectory で追加します。

- historical spec: `docs/dcr/specs/archive/`
- historical plan: `docs/dcr/plans/archive/`

方針:

- 新しい active doc は直下に保存する
- 完了済みで低頻度参照になったものだけ archive へ移す
- 先に archive を追加し、active path 自体の rename から始めない

## Quick Placement Rules

新しいファイルの置き場所に迷ったら、次の順で判断します。

1. Product が 1 つも無くても必要か
   - Yes: root DCR core
   - No: `Product/<product>/`
2. deploy で再生成されるか
   - Yes: generated output。source-of-truth を直す
3. 現役の design / implementation record か
   - Yes: `docs/dcr/specs/` または `docs/dcr/plans/`
   - No: 対応する `archive/`
4. 個人向けの任意スナップショット・メモか（チーム正本ではない）
   - Yes: `docs/snapshots/`（[README](../../snapshots/README.md) 参照）
5. 新規 Product の雛形か
   - Yes: `templates/product/`

## AI Editor Discovery Order

複数の AI エディタが同じ path decision に到達したいときは、次の順で確認する。

1. shared source-of-truth の入口として `.ai/catalog/README.md` を開く
2. Product 固有作業なら `Product/README.md` を開く
3. `.dcr/` と `docs/dcr/` の責務分担は `docs/dcr/reference/control-surface.md` で確認する
4. この文書で root / Product / generated / archive の置き場所判断を確認する
5. 実行順と検証手順は `docs/dcr/development-workflow.md` で確認する

補足:

- generated mirror は確認対象にはなっても、最初の編集対象にはしない
- archive は historical context 用であり、active decision の起点にしない
- 探索時は generated mirror、archive、外部 clone を明示的に除外してノイズを抑える

## Safe Workflow

1. source-of-truth を編集する
2. 必要なら `deploy.ps1` を実行する
3. `validate.ps1` を実行する
4. `deploy.ps1 -Check` で drift を確認する

この reference で判断しづらい場合は、`docs/dcr/instruction-governance.md` と `docs/dcr/development-workflow.md` を正本として参照します。
