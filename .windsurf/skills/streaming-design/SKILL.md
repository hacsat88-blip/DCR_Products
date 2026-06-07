---
name: streaming-design
routing_category: devops
description: "リアルタイムストリーミング設計：Kafkaトピック設計・スキーマレジストリ・Exactly-once・バックプレッシャー"
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
  - copilot
  - cursor
  - gemini-cli
---

# Streaming Design

## 基本原則

- ストリーミングは「いつ処理するか」をデータが決める（プル型ではなくプッシュ型）
- At-least-once → Exactly-once はコスト高——本当に必要か確認する
- バックプレッシャー設計なしの高負荷システムは必ず崩壊する

## Kafka トピック設計

```yaml
# トピック設計のパラメータ
topic: user-events
partitions: 12          # スループット = パーティション数 × コンシューマー数
replication_factor: 3   # 本番: 3以上（過半数で可用性保証）
retention: 7d           # データ保持期間
compression: lz4        # 圧縮（CPU vs ストレージのトレードオフ）
```

パーティションキー設計:
- ユーザーIDをキーにすると同一ユーザーの順序が保証される
- ランダムキー（null）はスループット最大化（順序不保証）

## スキーマレジストリ（Avro / Protobuf）

```json
{
  "type": "record",
  "name": "UserEvent",
  "namespace": "com.example.events",
  "fields": [
    {"name": "user_id", "type": "string"},
    {"name": "event_type", "type": {"type": "enum", "name": "EventType", "symbols": ["login", "purchase", "logout"]}},
    {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"},
    {"name": "metadata", "type": {"type": "map", "values": "string"}, "default": {}}
  ]
}
```

- スキーマの後方互換性: フィールド追加OK、削除NG、型変更NG
- Confluent Schema Registry でスキーマを一元管理

## Exactly-Once セマンティクス

| セマンティクス | 設定 | 用途 |
|-------------|------|------|
| At-most-once | `acks=0` | ログ収集（損失許容） |
| At-least-once | `acks=all`, `retries>0` | 一般用途 |
| Exactly-once | トランザクション + `enable.idempotence=true` | 決済・在庫 |

```python
# Kafka Producer - Exactly-once 設定
producer = KafkaProducer(
    enable_idempotence=True,
    acks='all',
    max_in_flight_requests_per_connection=5,
    transactional_id='payment-producer-1'
)
```

## バックプレッシャー設計

- コンシューマーラグを監視（ラグ増加 = 処理が追いついていない）
- プロデューサーレート制限: 受信側の処理能力に合わせてレートを調整
- Circuit Breaker: ラグ > 閾値 → 一時的に受付を止める

```python
# コンシューマーラグ監視
consumer_lag_threshold = 10_000  # メッセージ
if kafka_consumer_lag('user-events') > consumer_lag_threshold:
    alert("Consumer lag critical — scale up consumers")
```

## Kafka vs 代替サービス

| サービス | 特徴 | 向いているケース |
|---------|------|----------------|
| Apache Kafka | 高スループット・永続化 | 大規模・複雑なパイプライン |
| AWS Kinesis | マネージド・AWSネイティブ | AWSスタック統一 |
| Google Pub/Sub | マネージド・GCPネイティブ | GCPスタック統一 |
| Redis Streams | 軽量・低レイテンシ | 小規模・シンプルなユースケース |
