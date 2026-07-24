---
name: event-driven-agents
routing_category: governance
description: "イベント駆動エージェント設計：トリガー定義・イベントフィルタリング・冪等処理・デッドレターキュー"
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

# Event-Driven Agents

## 基本原則

- エージェントはイベントに反応して起動し、終了したら停止する（常駐しない）
- イベント処理は必ず冪等にする（同じイベントが2回来ても安全）
- 失敗したイベントは捨てずにデッドレターキューで保管する

## イベントトリガー種別

| トリガー | 例 | 用途 |
|---------|-----|------|
| GitHub Events | push, PR作成, issue作成 | コードレビュー・自動修正 |
| Webhook | Slack通知, 外部API通知 | 外部システム連携 |
| Cron | 毎日9時 | 定期レポート・監視 |
| Queue | SQS, Pub/Sub メッセージ | 非同期処理 |
| File Watch | S3 ObjectCreated | データ処理パイプライン |

## イベントフィルタリングパターン

```yaml
# GitHub Actions のイベントフィルタ例
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - '!**.md'  # ドキュメント変更は除外
  pull_request:
    types: [opened, synchronize]
```

## 冪等な処理の保証

- イベントIDで処理済みチェック（重複処理防止）
- At-least-once → Exactly-once: 処理結果をDB記録してから ACK
- 冪等キー: `{event_type}:{source_id}:{timestamp}` を主キーに使用

```python
def process_event(event):
    # 処理済みチェック
    if db.exists(f"processed:{event.id}"):
        return  # 重複 → スキップ
    
    # 処理実行
    result = agent.execute(event.payload)
    
    # 処理済みマーク（原子的に）
    db.mark_processed(event.id, result)
```

## デッドレターキュー（DLQ）設計

- 最大リトライ回数（例: 3回）後にDLQへ移動
- DLQメッセージは24時間以内に人間がレビュー
- DLQアラート: メッセージ数 > 0 で即時通知

## イベント→エージェント マッピング定義

```yaml
# event-agent-map.yaml
events:
  - trigger: github.pull_request.opened
    agent: code-reviewer
    filter:
      - "base_branch == 'main'"
    timeout_minutes: 10
    
  - trigger: cron.daily
    agent: security-scanner
    schedule: "0 9 * * 1-5"  # 平日朝9時
    timeout_minutes: 30
```

## チェックリスト

- [ ] 全トリガーのイベントフィルタ設定
- [ ] 冪等性の確認（重複テストを実施）
- [ ] DLQ の設定とアラート
- [ ] タイムアウト値の設定
- [ ] イベントスキーマのバージョン管理
