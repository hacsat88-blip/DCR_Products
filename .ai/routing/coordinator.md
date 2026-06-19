# Unified Coordinator Module

DCR の調整層ハブ。実行仕様は pied-piper agent に、決定木は unified-router モジュールに委任する。
本ファイルは概念索引 + 旧名移行テーブルとして機能する。

## 目的

- タスク分類 → ルール/スキル/エージェント選定を pied-piper 経由で実行する
- p/ → q/ → sh/ ゲート連鎖の入口・出口を統制する

## 正本ファイル

| 役割 | ファイル |
|---|---|
| agent 実行仕様 | [pied-piper.md](../catalog/agents-source/pied-piper.md) |
| ルーティング決定木 | [unified-router.md](unified-router.md) |
| 統合フロー | [unified-integration.md](unified-integration.md) |
| ゲート | [trigger-p.md](../kernel/gates/trigger-p.md) / [trigger-q.md](../kernel/gates/trigger-q.md) / [trigger-sh.md](../kernel/gates/trigger-sh.md) |

## 旧オーケストレーターからの移行

| 旧名 | 後継 | 状態 |
|---|---|---|
| workflow-orchestrator | pied-piper | deprecated, alias |
| multi-agent-coordinator | pied-piper | deprecated, alias |
| task-distributor | pied-piper | deprecated, alias |
| skill-router (skill) | unified-router (module) + pied-piper | 刷新 |

`error-coordinator` `context-manager` は内部 utility として保持（pied-piper が必要時に呼び出す）。
`it-ops-orchestrator` はドメイン特化として独立維持。
