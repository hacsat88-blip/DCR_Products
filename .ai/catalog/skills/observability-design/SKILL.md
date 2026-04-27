---
name: observability-design
routing_category: devops
description: メトリクス設計、アラート戦略、分散トレーシング、ログ構造化の実践ガイド。システムの可観測性を体系的に構築する。
contract:
  preconditions:
    - "対象システムのアーキテクチャが把握されている"
    - "SLO/SLI の方針が定義済みまたは定義可能"
  postconditions:
    - "メトリクス設計書またはダッシュボード定義が生成される"
    - "アラートルールとエスカレーション方針が定義される"
  invariants:
    - "既存の監視設定を破壊しない"
    - "過剰なアラートノイズを生まない設計にする"
composable:
  input_type: architecture
  output_type: observability-spec
  chains_with:
    - deployment-patterns
    - systematic-debugging
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies: []
  tags:
    - observability
    - monitoring
    - operations
---

# Observability Design

## 目的

システムの健全性を継続的に把握し、異常を早期検知できる可観測性基盤を設計する。

## いつ使うか

- 新規サービスの監視設計
- 既存サービスのアラート改善
- SLO/SLI の定義と追跡
- インシデント後の可観測性強化

## 3本柱の設計

### 1. メトリクス (Metrics)

- **RED メソッド** (サービス向け): Rate, Errors, Duration
- **USE メソッド** (インフラ向け): Utilization, Saturation, Errors
- カスタムビジネスメトリクスは最小限に絞る
- カーディナリティ爆発を避ける（ラベル値は有限集合に制限）

### 2. ログ (Logs)

- 構造化ログ (JSON) を標準とする
- ログレベルの使い分け:
  - `ERROR`: 即時対応が必要
  - `WARN`: 放置するとエラーになりうる
  - `INFO`: 正常な業務イベント
  - `DEBUG`: 開発時のみ有効化
- リクエストIDでトレースと紐付ける
- 個人情報はログに含めない

### 3. トレース (Traces)

- OpenTelemetry を推奨
- サービス境界にスパンを設置
- クリティカルパス（認証→API→DB→応答）を優先計装
- サンプリング率は本番 1-10%、障害調査時 100%

## アラート設計

### 原則

- **症状ベース** でアラートする（原因ベースではない）
- アラートは即座にアクション可能なものだけ設定する
- 1つのアラートに1つの対応手順を紐付ける

### 階層

| レベル | 基準 | 通知先 | 例 |
|--------|------|--------|-----|
| P1 Critical | SLO 違反、データ損失リスク | PagerDuty + Slack | エラー率 > 5% (5分) |
| P2 High | パフォーマンス劣化、部分障害 | Slack チャンネル | p99 レイテンシ > 2s |
| P3 Medium | 異常傾向、リソース逼迫 | ダッシュボード | CPU > 80% (15分) |
| P4 Low | 情報通知 | メール/チケット | 証明書の期限 30日前 |

## SLO/SLI テンプレート

```yaml
service: [service-name]
slos:
  - name: availability
    sli: "成功リクエスト数 / 全リクエスト数"
    target: 99.9%
    window: 30d
  - name: latency
    sli: "p99 レスポンスタイム"
    target: "< 500ms"
    window: 30d
error_budget:
  total: 0.1%  # = 43.2 minutes/month
  burn_rate_alert: 14.4x (1h window)
```

## チェックリスト

- [ ] RED/USE メトリクスが主要サービスに設定済み
- [ ] 構造化ログが全サービスで有効
- [ ] トレースがサービス間を跨いで伝播
- [ ] SLO が定義され、エラーバジェットが追跡されている
- [ ] アラートが症状ベースで設定されている
- [ ] ダッシュボードが4つのゴールデンシグナルを表示
- [ ] ランブックがアラートに紐付いている
