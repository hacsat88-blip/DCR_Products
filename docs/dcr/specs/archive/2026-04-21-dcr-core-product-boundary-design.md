# DCR Core And Product Boundary Design

## Goal

DCR core の運用と個別 Product の開発運用を分離し、リポジトリ root が「存在しない Product を前提に壊れる」状態を解消する。

## Current Findings

2026-04-21 時点の確認結果:

- repo 管理対象の `Product/` ディレクトリは `cyber-stock-dashboard/` を中心とし、standalone CLI clone の `dexter-jp/` は DCR 正本に含めない
- root workspace 設定は存在しない `Product/autotrader-suite/...` を参照している
- product 専用の rule / skill / agent source が存在しない `Product/ai-prompt-manager` を前提にしている
- `deploy.ps1` と `validate.ps1` は Product 配下が無くても DCR core 単体で成立している

このため、現在の混在は「機能結合」ではなく「path 結合」に近い。

## Current Product Overlay Candidates

現時点で root に残っている product 専用 source-of-truth 候補は次の 4 つ。

- `rules/ai-prompt-manager-steward.md`
- `skills/ai-prompt-manager/SKILL.md`
- `.ai/agents-source/ai-prompt-manager-orchestrator.md`
- `.ai/agents-source/ai-prompt-manager-orchestrator.toml`

これらは generated output 側にも波及しているが、移設対象として扱うのは source-of-truth 側だけに限定する。

## Problems

### 1. Root Workspace Drift

root の `.vscode/settings.json` と `.vscode/tasks.json` が、現在存在しない Product 向け interpreter / task を抱えている。

影響:

- 初回起動時に壊れた task が見える
- Python interpreter の既定値が存在しない path を指し得る
- DCR core の作業中でも Product 依存のノイズが混入する

### 2. Global Instruction Pollution

`rules/`, `skills/`, `.ai/agents-source/` は DCR 全体の正本だが、その中に単一 Product 専用アセットが混ざっている。

影響:

- 現在開いていない Product の前提が root の routing surface に露出する
- Product が不在でも、存在するかのような専用 rule / skill が残る
- DCR core の変更と Product 固有変更の境界が曖昧になる

### 3. Operational Ambiguity

root repo が DCR platform なのか multi-product monorepo なのかが曖昧で、運用判断がぶれる。

## Design Principles

1. DCR core は Product の存在有無に依存しない
2. Product 固有アセットは Product の近くに置く
3. root workspace には DCR core 共通の設定だけを残す
4. path migration は互換期間を置き、即時削除しない
5. 「共通」と「個別」を同じ配置で運用しない

## Recommended Boundary Model

### Layer A: DCR Core

root に残すもの:

- `rules/`
- `skills/`
- `.ai/`
- `.dcr/`
- `templates/`
- `docs/dcr/`
- `deploy.ps1`, `validate.ps1`, `init-project.ps1`
- root `.vscode/` のうち DCR core 共通タスクだけ

ここには「Product 不在でも意味があるもの」だけを残す。

### Layer B: Product Workspaces

`Product/<product>/` に置くもの:

- product source code
- product local `.vscode/`
- product local README / runbook
- product 固有の automation
- product 固有の AI overlay

推奨配置:

```text
Product/
  <product>/
    .ai/
      rules/
      skills/
      agents/
    .vscode/
    README.md
```

ここでの `.ai/` は root の DCR core を置き換えるものではなく、product-local overlay として扱う。

### Layer C: Optional Split

Product 数が増え、root workspace が再び重くなる場合は次を検討する。

- multi-root workspace 化
- Product 単位の別 repo 化
- DCR core repo と Product repo の分離

この段階は Phase 1 の必須条件ではない。

## Migration Strategy

### Phase 1: Stop Root Breakage

目的: root だけで作業しても壊れない状態にする。

対象:

- root `.vscode/settings.json` から不在 Product 依存を外す
- root `.vscode/tasks.json` から不在 Product task を外すか退避する
- legacy script や古い運用導線を core 前提へ寄せる

成功条件:

- root workspace を単独で開いても壊れた interpreter / task が出ない

### Phase 2: Move Product-Specific AI Assets Local

目的: DCR 共通アセットと Product 専用アセットを分離する。

候補:

- `rules/ai-prompt-manager-steward.md`
- `skills/ai-prompt-manager/`
- `.ai/agents-source/ai-prompt-manager-orchestrator.md`

移動先:

- `Product/<product>/.ai/rules/`
- `Product/<product>/.ai/skills/`
- `Product/<product>/.ai/agents/`

Phase 2 の実行条件:

- 実在する `Product/<product>/` がある
- その Product 側に owner と README または runbook がある
- Product-local overlay をどう読み込むかが明文化されている

上記が満たされるまでは、候補アセットを無理に root から追い出さない。代わりに、新しい product 専用アセットを root へ追加しないことをルールにする。

成功条件:

- root の rule / skill / agent surface が DCR 共通物だけになる

### Phase 3: Introduce Product Overlay Loading

目的: Product を開いたときだけ Product 固有 AI アセットを有効化する。

方向性:

- root deploy は DCR core のみを対象にする
- product-local deploy / merge step を別途用意する
- overlay は明示 opt-in にする

成功条件:

- DCR core deploy が Product 不在でも壊れない
- Product を開いたときだけ追加アセットが見える

## Decisions

### Decision 1: Root は DCR Platform 扱いを維持する

理由:

- 現在の deploy / validate / docs/dcr は明確に platform 側の責務
- Product source code は補助的で、root 運用の主役ではない

### Decision 2: Product 固有アセットは root から段階的に退避する

理由:

- path が実在しない Product を前提にした global routing はノイズになる
- Product ごとの寿命と DCR core の寿命は一致しない

### Decision 3: 即時 repo 分割はしない

理由:

- まず必要なのは運用境界の明文化と stale path 解消
- repo split は Phase 1 完了後でも遅くない

### Decision 4: orphaned product asset は先に文書化し、後で移設する

理由:

- `Product/ai-prompt-manager` は現時点で存在しない
- 移動先が無いまま placeholder directory を作ると ownership が曖昧なまま固定化される
- root cleanup の優先課題は runtime breakage の除去であり、overlay relocation は destination ができてから始めるべき

## Near-Term Actions

1. root `.vscode` の Product 依存を除去し、core workspace を単独で安全に開ける状態にする
2. Product 固有 rule / skill / agent の source-of-truth 候補を inventory する
3. Phase 2 を開始できる execution gate を固定する
4. overlay merge を deploy に含めるか、別コマンド化するかを決める

## Acceptance Criteria

- DCR core だけで root workspace を安全に開ける
- root の task / settings が不在 Product を前提にしない
- Product 固有 AI アセットの置き場所が明文化される
- DCR core と Product の責務境界が README なしでも判断できる

## Open Questions

- `ai-prompt-manager` は今後この repo に戻るのか
- Product-local overlay を hidden folder (`.ai/`) にするか、公開フォルダにするか
- Product 分離後も root で一括検索したいか