---
name: data-quality
routing_category: devops
description: "データ品質管理：6次元品質定義・Great Expectations/dbt tests・データSLO・品質アラート設計"
disable-model-invocation: true
contract:
  preconditions:
    - "The request matches this skill's description or routing category."
  postconditions:
    - "The response names the result, reasoning, and verification or handoff path."
  invariants:
    - "Do not treat generated mirrors or runtime caches as DCR source of truth."
composable:
  input_type: task
  output_type: artifact-or-decision
  chains_with:
    - verification-before-completion
runtime_targets:
  - codex
  - claude
  - cursor
---

# Data Quality

## 基本原則

- データの品質問題を下流まで流さない（入口で検出する）
- 品質チェックは自動化しCIに組み込む
- SLO（Service Level Objective）でデータ品質を定量的に約束する

## データ品質の6次元

| 次元 | 定義 | 測定方法 |
|------|------|---------|
| 完全性 | NULLがない | NULL率 < 0.1% |
| 正確性 | 実世界と一致 | 参照データとの照合 |
| 一貫性 | 複数ソース間で矛盾がない | 結合・比較チェック |
| 適時性 | 必要な時に利用可能 | データ鮮度（最終更新から経過時間） |
| 有効性 | 定義された範囲内 | 値域チェック・フォーマット検証 |
| 一意性 | 重複がない | 主キー重複チェック |

## Great Expectations 実装パターン

```python
import great_expectations as gx

context = gx.get_context()
suite = context.add_expectation_suite("orders_suite")

# カラムの期待値を定義
suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(
    column="order_id"
))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeBetween(
    column="amount", min_value=0, max_value=1_000_000
))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeUnique(
    column="order_id"
))
```

## dbt tests 設計

```yaml
# models/schema.yml
models:
  - name: orders
    columns:
      - name: order_id
        tests:
          - not_null
          - unique
      - name: status
        tests:
          - accepted_values:
              values: ['pending', 'completed', 'cancelled']
      - name: amount
        tests:
          - dbt_utils.accepted_range:
              min_value: 0
```

## データ SLO 定義

```yaml
# データSLOの例
slos:
  - metric: null_rate
    target: < 0.1%
    window: 24h
  - metric: freshness
    target: < 1h  # データの鮮度
    window: 1h
  - metric: row_count_anomaly
    target: 前日比 ±20% 以内
    window: 24h
```

## 品質アラート設計

- SLO違反 → Slackアラート（担当チームへ）
- Critical 品質問題 → パイプライン自動停止
- 品質スコアのトレンドダッシュボード（週次レポート）

## インシデント対応フロー

1. アラート受信 → 影響テーブル・影響範囲の特定
2. データ使用者への通知（SLAブリーチの場合）
3. 上流パイプラインの調査・修正
4. 修正後のバックフィル実行
5. 品質チェック再実行で回復確認
