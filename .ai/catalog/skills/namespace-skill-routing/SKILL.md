---
name: namespace-skill-routing
routing_category: governance
description: "スキル数が増えて routing token cost や選択迷いが大きくなったときに、namespace router / hub skill / routing table で候補を整理する。Codex以外のモデルでも過剰なスキル一覧に引っ張られないようにするための設計スキル。"
contract:
  preconditions:
    - "スキルやコマンドの数が増え、直接一覧では選択精度や token cost が悪化している"
  postconditions:
    - "namespace、具体スキル、移行方針、互換性が整理されている"
  invariants:
    - "既存スキルの直接呼び出し互換性を壊さない"
    - "namespace router は coordinator ではなく候補整理に徹する"
composable:
  input_type: catalog
  output_type: routing-design
  chains_with:
    - unified-router
    - token-efficiency-advisor
    - context-optimization
metadata:
  origin: gsd-build/get-shit-done
  upstream_url: "https://github.com/gsd-build/get-shit-done"
  upstream_paths:
    - "docs/ARCHITECTURE.md"
  upstream_license: "MIT"
  imported_at: "2026-05-11"
  adapted_from: "Two-stage namespace routing pattern; mapped to DCR skill routing without replacing unified-router."
  model_neutral: true
---

# Namespace Skill Routing

## 目的

スキル数が増えたとき、全スキルを横並びで見せるのではなく、少数の namespace で入口を整理する。
これは `pied-piper` や `unified-router` の置換ではなく、候補選定を軽くする補助設計である。

## Namespace の作り方

1. 既存 skill を domain / phase / risk / artifact type で分類する
2. 5-8 個程度の namespace 候補に圧縮する
3. namespace description は短い keyword tags を優先する
4. namespace body に routing table を置く
5. 具体 skill の直接呼び出しは残す
6. 既存 deprecated alias と名前衝突しないか確認する

## 例

| Namespace | 対象 |
|---|---|
| planning | interview, decision, spec, phase plan |
| execution | implementation, wave, delegation |
| verification | test, UAT, review, evidence |
| context | compression, degradation, state handoff |
| security | scan, threat, semgrep |

## モデル非依存ルール

- ルーター本文は短く、表で選べる形にする
- 特定IDEのコマンド名を前提にしない
- namespace は判断を助けるだけで、最終 coordinator にならない
- fanout 後は `deploy.ps1 -Check` と `validate.ps1` で確認する

