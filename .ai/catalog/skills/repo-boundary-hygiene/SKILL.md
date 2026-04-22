---
name: repo-boundary-hygiene
description: "root / Product / source-of-truth / generated / runtime の境界を監査し、安全な cleanup と移行順序を定義する。stale path、orphaned asset、workflow contract、legacy shim の判断を一貫させる。"
contract:
  preconditions:
    - "repo または workspace の構造と cleanup 目標が特定されている"
    - "監査対象 path または変更候補が列挙できる"
  postconditions:
    - "path inventory と class/tag 分類が作成されている"
    - "keep/delete/move/shim/defer の decision table が作成されている"
    - "validation command と rollout order が定義されている"
  invariants:
    - "generated output を source-of-truth として扱わない"
    - "workflow contract の可能性がある path は参照確認前に削除しない"
    - "root workspace の drift は search と verify で裏付ける"
composable:
  input_type: code
  output_type: report
  chains_with:
    - writing-plans
    - verification-before-completion
    - continuous-learning
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies: []
  tags:
    - governance
    - architecture
    - cleanup
---

# Repo Boundary Hygiene

## 目的

リポジトリの root / Product / source-of-truth / generated / runtime の境界を棚卸しし、壊れにくい cleanup と移行順序を決める。

この skill は repo 固有の配置を決め打ちするものではない。repo ごとの boundary spec を前提に、その判断を再利用可能な audit workflow として適用する。

## いつ使うか

- root と `Product/` の責務が混ざって見えるとき
- `.vscode/`, `docs/`, `templates/`, `.dcr/`, `rules/`, `skills/` の整理を検討するとき
- source-of-truth と generated output のどちらを直すべきか迷うとき
- 不在 Product path や stale path を抱えた設定を片付けたいとき
- legacy script を削除するか shim にするか判断したいとき
- orphaned product asset を move するか defer するかを決めたいとき

## 非目標

- repo 固有の ownership を決めること
- まだ存在しない destination を仮定して移設すること
- generated file を直接修正して対処すること

## Primary Classes

各 path には primary class を 1 つ与える。

| Class           | 意味                          | 例                                              |
| --------------- | ----------------------------- | ----------------------------------------------- |
| source-of-truth | 正本。変更はここから始める    | `rules/*.md`, `skills/*/SKILL.md`, `templates/` |
| generated       | 正本から派生する生成物        | `.cursor/rules/*.mdc`, generated docs           |
| runtime/config  | 実行時に効く設定や task       | `.vscode/settings.json`, `.vscode/tasks.json`   |
| product-local   | 特定 Product にだけ属する資産 | `Product/<product>/**`, product overlay         |

## Secondary Tags

必要に応じて secondary tag を付ける。

| Tag                 | 用途                                         |
| ------------------- | -------------------------------------------- |
| workflow-contract   | 削除で運用導線が壊れる可能性がある           |
| overlay-candidate   | product-local overlay へ退避候補             |
| stale-path-risk     | 不在 path を参照している可能性がある         |
| external-entrypoint | 外部運用や既存導線が参照している可能性がある |

## 調査手順

1. 対象 path を inventory する
2. 各 path に primary class を 1 つ付ける
3. 必要なら secondary tag を追加する
4. 参照元を検索し、削除や移設で contract break が起きるか確認する
5. stale path、orphaned asset、generated drift を列挙する
6. 各項目を `keep / delete / move / shim / defer` に分類する
7. root workspace を単独で安全に開けるか判定する
8. `validate.ps1`、`deploy.ps1`、`deploy.ps1 -Check` などで証拠を取る

## Decision Table

| Action | 選ぶ条件                               | 例                                         |
| ------ | -------------------------------------- | ------------------------------------------ |
| keep   | 共通正本で、現行 contract を維持すべき | DCR core の共通 rule                       |
| delete | 参照元がなく、正本でも生成物でも不要   | 完全に死んだ補助ファイル                   |
| move   | destination と owner が既に存在する    | 実在 Product への overlay 移設             |
| shim   | external-entrypoint が残っている       | legacy script から canonical script へ委譲 |
| defer  | destination や loading path が未確定   | 不在 Product への先行移設                  |

## Required Checks

- generated output を直す前に source-of-truth を確認する
- `rg` または同等の検索で参照元を確認する
- root `.vscode` に product-specific path が残っていないか確認する
- destination 不在の move は defer に倒す
- cleanup 完了主張の前に verification command を実行する

## Anti-Patterns

- generated file を正本として編集する
- docs / templates / scripts を未検索のまま削除する
- root `.vscode` に product-specific interpreter や tasks を残す
- 実在しない `Product/<name>/` を仮定して資産を移す
- legacy entrypoint を外部参照確認なしで削除する

## Output Template

```markdown
## Inventory

| Path | Primary Class | Secondary Tags | Notes |
| ---- | ------------- | -------------- | ----- |

## Findings

- ...

## Decision Table

| Path | Action | Reason |
| ---- | ------ | ------ |

## Validation

- Run: `...`
- Expected: `...`

## Rollout

1. ...
2. ...
3. ...
```

## Composition

- `writing-plans`: spec を implementation plan へ落とす
- `verification-before-completion`: cleanup 完了主張前の証拠を取る
- `continuous-learning`: 再発防止の instinct を repo memory に残す

## Deliverables

- path inventory
- findings
- decision table
- validation commands
- rollout order
