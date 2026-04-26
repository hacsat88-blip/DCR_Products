# Unified Coordinator Module

サブエージェント・ルール・スキルの **唯一の調整層**。
ユーザー入力から実行までの一貫したパイプラインを定義し、`pied-piper` agent と `unified-router` モジュールを束ねる。

## 目的

- 「どのスキル/ルール/エージェントを使うか」の判断を AI 任せでなく **明文化された決定木** で実施
- 採用前に **3行報告テンプレート** で人間に意図を見せ、承認/否認を可能にする
- 統廃合された旧名（`workflow-orchestrator` 等の deprecated）からの呼び出しは alias で新後継に転送
- p/ → q/ → sh/ ゲート連鎖の入口・出口を統制

## アーキテクチャ

```
ユーザー入力
   ↓
[Unified Coordinator = pied-piper agent]
   ├─ ① 分類: intent / domain / risk / phase
   ├─ ② ルーティング: unified-router.md の決定木で Rule + Skill + Agent を選定（最大2件）
   ├─ ③ 報告: 3行テンプレで先に表明（信頼度・理由・期待効果）
   ├─ ④ 実行: 選定対象を呼び出し
   └─ ⑤ ゲート: kernel/p, kernel/q, kernel/sh を強制
       ↓
最終アウトプット
```

## 関係する正本ファイル

- agent: [.ai/catalog/agents-source/pied-piper.md](../catalog/agents-source/pied-piper.md) — 統一 Coordinator の実体
- ルーティング: [.ai/module/unified-router.md](unified-router.md) — 決定木の正本
- 統合フロー: [.ai/module/unified-integration.md](unified-integration.md) — Plan/Review/QA/Ship 共通化
- ゲート: `.ai/kernel/p/`, `.ai/kernel/q/`, `.ai/kernel/sh/`

## 報告テンプレート（必須）

すべての実行前に以下3行を発話する：

```
🎯 採用：<rule|skill|agent名>（信頼度 0.XX）
📌 理由：<routing_category 一致 + match keywords/domain>
✨ 期待効果：<1行で見込まれる成果物・短縮時間・品質ゲート>
```

confidence < 0.8 の場合は候補2-3件を提示しユーザーに選択を委ねる。

## 旧オーケストレーターからの移行

| 旧名 | 後継 | 状態 |
|---|---|---|
| workflow-orchestrator | pied-piper | deprecated, alias |
| multi-agent-coordinator | pied-piper | deprecated, alias |
| task-distributor | pied-piper | deprecated, alias |
| skill-router (skill) | unified-router (module) + pied-piper | 刷新 |

`error-coordinator` `context-manager` は内部 utility として保持（pied-piper が必要時に呼び出す）。
`it-ops-orchestrator` はドメイン特化として独立維持。

## ゲート連鎖の強制

`.ai/kernel/gate-state.json`（後続の Phase B-4 で実装）に各ゲート通過状態を永続化し、以下を hard block：

- `q/` 未通過のまま `sh/` に進めない
- `p/` 未確定のまま実装フェーズに入らない（writing-plans が要求された場合）

`deploy.ps1` がこれを検証し、違反時は generated 配布を中止する。

## ユーザー視点の効果

1. **認知負荷軽減**：選択肢が「親ハブ + 4本柱」に集約され、提示件数が減る
2. **透明性**：採用根拠が事前に見える
3. **可制御性**：3行報告に対し「別案にして」「もっと深く」と即座に方向修正可能
4. **後方互換**：旧名指定でも alias で動く
