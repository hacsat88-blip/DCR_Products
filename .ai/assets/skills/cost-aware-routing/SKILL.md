---
name: cost-aware-routing
routing_category: governance
description: "コスト考慮モデルルーティング：タスク複雑度スコアリング・モデル選択マトリクス・予算エンベロープ・フォールバックチェーン"
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

# Cost-Aware Routing

## 基本原則

- タスクに必要な最安のモデルを選ぶ（オーバースペック禁止）
- 予算エンベロープを事前に設定し超過前に制御する
- キャッシュを最大活用してコストを削減する

## タスク複雑度スコアリング

| Tier | 複雑度 | 例 | 推奨モデル |
|------|--------|-----|-----------|
| 1 | Trivial | 分類・ルーティング判定 | claude-haiku / gpt-4o-mini |
| 2 | Simple | 要約・翻訳・フォーマット変換 | claude-sonnet / gpt-4o |
| 3 | Complex | コードレビュー・設計提案 | claude-sonnet / gpt-4o |
| 4 | Expert | アーキテクチャ・複雑デバッグ | claude-opus / o1 |

## モデル選択マトリクス

```
タスク判定フロー:
1. コンテキスト長 > 100k tokens? → 長コンテキスト対応モデル必須
2. リアルタイム応答（< 1秒）必要? → 高速モデル（mini/haiku）
3. コーディング・推論主体? → Tier 3-4
4. それ以外 → Tier 1-2 から試す
```

## プロンプトキャッシュ戦略

- System promptは変更しない（キャッシュヒット率 UP）
- 長い共通コンテキストは先頭に配置
- Anthropic: `cache_control: {"type": "ephemeral"}` を明示
- キャッシュヒット率 > 60% を KPI に設定

## 予算エンベロープ管理

```python
class BudgetEnvelope:
    daily_limit_usd: float = 10.0
    per_task_limit_usd: float = 0.50
    alert_threshold: float = 0.80  # 80%で通知
    
    def check_before_execute(self, estimated_cost: float) -> bool:
        remaining = self.daily_limit_usd - self.today_spent
        if estimated_cost > self.per_task_limit_usd:
            return False  # タスク単位上限超過
        if remaining < estimated_cost:
            return False  # 日次上限超過
        return True
```

## フォールバックチェーン設計

```
Primary: claude-opus（品質最優先）
  ↓ (コスト超過 or タイムアウト)
Fallback 1: claude-sonnet（バランス）
  ↓ (コスト超過 or タイムアウト)
Fallback 2: claude-haiku（コスト最小）
  ↓ (全失敗)
Error: 人間へエスカレーション
```

## コスト最適化チェックリスト

- [ ] 全タスクに Tier ラベルを付与
- [ ] キャッシュヒット率を週次確認
- [ ] 予算アラートを Slack に通知設定
- [ ] モデル別コスト比較を月次レポート
- [ ] Batch API 適用可能なタスクを特定（50%コスト削減）
