---
name: continuous-learning-v2
routing_category: governance
description: "project/global スコープと confidence を持つ instinct 運用。学びを status/export/import/evolve/promote で管理し、再利用可能な skill/rule 候補へ昇格する。"
metadata:
  origin: ECC continuous-learning-v2 (lightweight adaptation for DCR)
---

# Continuous Learning v2 (Light)

## v1 との関係

- `skills/continuous-learning/SKILL.md` を基盤フローとして利用する
- v2 は既存記録を project/global と confidence で再編成し、昇格判断を追加する拡張レイヤー
- 初回導入時は v1 の運用を優先し、慣れたら v2 コマンド運用を段階適用する

## 目的

`skills/continuous-learning` の記録を拡張し、知見を次の2層で管理する。

- project scope: そのリポジトリだけで有効な知見
- global scope: 複数リポジトリで再利用可能な知見

## データモデル

各 instinct は以下を持つ。

- `id`: 一意識別子
- `trigger`: どの状況で発火するか
- `confidence`: 0.0-1.0
- `domain`: workflow/testing/security/docs 等
- `scope`: `project` or `global`
- `learning`: 学び
- `action`: 次回アクション

## コマンド運用

この light 版は専用 CLI ではなく、既存 memory を使って運用する。

- `status`: `/memories/repo/` の instinct を一覧し confidence を確認
- `export`: 高 confidence instinct を markdown で抽出
- `import`: 他メモから instinct を取り込み（重複は高 confidence を優先）
- `evolve`: 似た trigger をクラスタ化して skill/rule 候補化
- `promote`: project instinct を global へ昇格

## Promote ルール

以下を満たしたら `global` 昇格候補:

- 2回以上、別文脈で再現
- 平均 confidence が 0.8 以上
- 特定プロジェクト事情に依存しない

## Evolve ルール

以下を満たしたら独立 skill 候補:

- 同一 domain で 3 件以上
- 同系 trigger で実行手順が定義可能
- 失敗予防または工数削減の効果が明確

## 関連

- `skills/continuous-learning` 記録
- `skills/rules-distill` rule 昇格
