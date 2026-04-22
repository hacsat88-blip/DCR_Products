# Repo Boundary Hygiene Skill And Rule Design

## Goal

今回のセッションで得た知見を、再利用可能な DCR 資産へ昇格する。

対象は単なるディレクトリ整理ではなく、以下を含む repository boundary governance とする。

- root と `Product/` の責務分離
- source-of-truth と generated output の区別
- workflow contract になっている docs / templates / scripts の保護
- stale path の検出と除去
- legacy script を削除するか shim 化するかの判断

## Recommendation

初版は **1 skill + 1 rule** を推奨し、専用 agent は作らない。

- Skill: `repo-boundary-hygiene`
- Rule: `repo-boundary-steward`
- Agent: **v1 では作らない**

理由:

- 今回の学びの中心は「手順」と「不変条件」に分かれている
- 手順は skill、常時守るべき原則は rule が最も自然
- agent にすると `feature-proposal` や `agent-organizer` と責務が重なりやすい

## Why This Is Not Just Directory Architecture

今回扱ったのは folder layout の見た目だけではない。

実際に触った論点は次の 4 系統だった。

1. ディレクトリ構成の整理
2. リポジトリ境界の設計
3. source-of-truth / generated / runtime の責務分離
4. root workspace の運用衛生の是正

したがって、命名は `directory-architecture` より `repo-boundary-hygiene` のほうが範囲と意図に一致する。

## Relation To Existing Boundary Spec

この文書は repo 固有の boundary model 自体を定義する正本ではない。

repo 固有の構造、overlay 候補、migration gate、近接の運用判断は [docs/dcr/specs/2026-04-21-dcr-core-product-boundary-design.md](docs/dcr/specs/2026-04-21-dcr-core-product-boundary-design.md) を正本とする。

この文書の責務は、その判断を再利用可能な skill / rule へ昇格するための抽象化に限定する。

### Non-Goals

- repo 固有の overlay destination をこの文書で決めること
- Product ごとの ownership をこの文書で決めること
- 既存 boundary spec の migration 条件を置き換えること

## Proposed Skill

### Skill Name

`repo-boundary-hygiene`

### Skill Alternate Names

- `workspace-boundary-design`
- `source-of-truth-governance`
- `platform-product-separation`

`repo-boundary-hygiene` を推奨する理由:

- repo root / Product / generated / runtime まで含めて扱える
- 設計だけでなく audit と cleanup の実務手順を含められる
- 既存の architecture 改善 skill と用途が競合しにくい

### Skill Description

リポジトリの root / Product / source-of-truth / generated / runtime の境界を監査し、安全な cleanup と移行順序を定義する。stale path、orphaned product asset、workflow contract の破壊を検出し、削除・退避・shim 化・保留のどれを選ぶべきかを整理する。

### When To Use

- ディレクトリ統合や移設を検討するとき
- `docs/`, `templates/`, `.dcr/`, `.vscode/` などを削減したいとき
- root workspace が存在しない Product path を参照しているとき
- generated file を直接直すべきか generator を直すべきか迷うとき
- legacy script を削除するか shim にするか判断したいとき

### Deliverables

- Inventory: path ごとの分類表
- Findings: 問題一覧
- Decision table: `keep / delete / move / shim / defer`
- Validation plan: 実行コマンドと期待結果
- Rollout: 段階的移行順序

### Core Workflow

1. 対象 path を inventory する
2. 各 path に primary class を 1 つ与える
   - source-of-truth
   - generated
   - runtime/config
   - product-local
3. 必要に応じて secondary tag を付ける
   - workflow-contract
   - overlay-candidate
   - stale-path-risk
   - external-entrypoint
4. 参照元を検索し、削除が contract break になるか確認する
5. stale path と orphaned asset を列挙する
6. 対応を `delete / move / shim / defer` に分類する
7. root workspace を DCR core 観点で clean にできるか判定する
8. `validate.ps1` と `deploy.ps1 -Check` などで証拠を取る

### Anti-Patterns

- generated file を正本として修正する
- templates や docs を未参照確認のまま削除する
- root `.vscode` に product-specific task や interpreter を置き続ける
- 実在しない `Product/<name>/` に先行移設する
- legacy entrypoint をいきなり削除して外部参照を壊す

### Composition With Existing Skills

- `continuous-learning`: 学びを instinct 化して昇格する入口
- `harness-audit`: 棚卸しと改善アクションの出し方を流用
- `improve-codebase-architecture`: Findings / Impact / Proposal / Validation / Rollout の構成を流用
- `verification-before-completion`: cleanup 完了主張前の証拠ゲート
- `writing-plans`: 是正変更が複数ファイルに及ぶときの実装計画化

## Proposed Rule

### Rule Name

`repo-boundary-steward`

### Rule Alternate Names

- `platform-boundary-steward`
- `source-generated-governance`
- `workspace-boundary-steward`

### Recommended Domain Shape

- `domain`: `repo-boundary` を候補とする
- `routing_category`: governance
- `risk`: medium

補足:

- `routing_category` は coarse bucket として `governance` を使う
- `domain` は `governance` より具体的な識別子を使う
- metadata 導入時に既存 taxonomy と衝突するなら `domain` は暫定 `TBD` でもよい

### Rule Description

リポジトリの境界を保ち、source-of-truth / generated / runtime / Product local の責務混線を防ぐ専門ロール。cleanup や統合作業では、壊れにくさと再生成可能性を優先して判断する。

### Core Invariants

1. generated output は直接修正せず、生成元を修正する
2. docs / templates / scripts は参照元確認前に削除しない
3. root `.vscode` は DCR core 共通設定だけを持つ
4. orphaned product-specific asset は destination ができるまで無理に移設しない
5. legacy script は external reference が残る間は shim を優先する
6. cleanup 完了主張の前に search と verify を実行する

### Keywords

- repo-boundary
- source-of-truth
- generated
- stale-path
- overlay
- workspace-drift
- shim
- cleanup

## Why No Dedicated Agent In v1

既存資産との重なりが大きい。

- `feature-proposal`: 提案整理はできるが、boundary hygiene 固有の判定基準は持たない
- `agent-organizer`: 調整役としては使えるが、source/generated/product boundary の専門知識を持たない

今回必要なのは autonomous orchestration より、手順の再利用と invariants の固定である。

専用 agent を作る条件は次のとおり。

- `repo-boundary-hygiene` が複数回使われる
- audit を独立 subagent に委任したい需要がある
- rule + skill だけではレビューの抜けが頻発する

それまでは、skill と rule の組み合わせで十分。

## Suggested Adoption Path

### Phase 1

この spec を正として、skill 名と rule 名を固定する。

### Phase 2

`skills/repo-boundary-hygiene/SKILL.md` を追加する。

### Phase 3

`rules/repo-boundary-steward.md` を追加し、routing index に載るよう整える。

### Phase 4

運用実績を見て、必要なら review 用 subagent を追加する。

## Acceptance Criteria

- 今回のセッションで得た改善が 1 つの workflow として再利用可能になる
- 「削除してよいか」「shim が要るか」「destination 不在なので defer すべきか」を一貫して判断できる
- root workspace drift と source/generated 混線を同じ視点で扱える
- 既存 skill / agent と責務が過剰に重複しない

## Implementation Note

この設計はまず skill と rule の組み合わせで導入し、agent 化は deferred とする。