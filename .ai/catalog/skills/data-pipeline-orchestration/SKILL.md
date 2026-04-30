---
name: data-pipeline-orchestration
routing_category: devops
description: "データパイプラインオーケストレーション：DAG設計・Airflow/Prefect/Dagster選定・バックフィル・SLAアラート"
disable-model-invocation: true
---

# Data Pipeline Orchestration

## 基本原則

- パイプラインの各タスクは冪等（同じ入力→同じ出力、何度実行しても安全）
- 失敗時の再試行を前提に設計する（エラーは必ず起きる）
- データの鮮度要件とコストのバランスを取る

## DAG 設計原則

- タスクは小さく・単一責任にする（デバッグしやすい）
- 依存関係はデータの流れで定義する（実行順ではなく）
- 中間成果物は外部ストレージに保存（ステートレス設計）

## オーケストレーター選定

| ツール | 特徴 | 向いているケース |
|--------|------|----------------|
| Apache Airflow | 最も普及・豊富なOperator | エンタープライズ・大規模 |
| Prefect | Pythonネイティブ・簡単 | 中小規模・モダン |
| Dagster | アセット中心・型安全 | データ品質重視 |
| dbt | 変換特化・SQLファースト | ELTの変換レイヤー |

## バックフィル戦略

- 過去データ再処理は `execution_date` パラメータで制御
- バックフィルはバッチサイズを制限して実行（本番負荷への影響防止）
- 冪等タスクのみバックフィル可能（非冪等タスクはバックフィル禁止）

```python
# Airflow バックフィル実行例
airflow dags backfill \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --max-active-runs 3 \
  my_pipeline_dag
```

## パーティション設計

- 時間パーティション: `year=2024/month=01/day=15/` の階層化
- 増分処理: ウォーターマーク（最終処理タイムスタンプ）を保存
- Full Refresh vs Incremental の判断基準:
  - データ量 < 1GB → Full Refresh（シンプル）
  - データ量 > 1GB または更新が頻繁 → Incremental

## SLA アラート設定

- 完了期限（SLA）をパイプラインごとに定義
- SLA ミス時: Slack/PagerDuty へ通知
- SLA の測定: `pipeline_duration_minutes` を Prometheus で記録

## パイプラインテスト手法

- **Unit**: 各変換ロジックを単体テスト
- **Integration**: 実際のDB/ストレージに接続したテスト
- **Data Contract**: 入出力スキーマの型・NULL制約を自動検証
- **Regression**: 本番データのサンプルで過去との比較

## チェックリスト

- [ ] 全タスクの冪等性を確認
- [ ] 依存サービスの障害時のタイムアウト設定
- [ ] 監視アラートの設定（遅延・失敗・SLA違反）
- [ ] バックフィル手順のドキュメント化
