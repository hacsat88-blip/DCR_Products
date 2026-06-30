---
name: disaster-recovery
routing_category: devops
description: "DR/BCP設計：RTO/RPO定義・DR戦略4段階・バックアップ3-2-1ルール・フェイルオーバーテスト"
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

# Disaster Recovery

## 基本原則

- テストしていないDRは存在しないのと同じ（定期訓練必須）
- RTO/RPOはビジネス要件から逆算する（技術から決めない）
- フェイルオーバーは自動化するが、フェイルバックは慎重に手動で行う

## RTO / RPO 定義

| 指標 | 定義 | 設定例 |
|------|------|-------|
| **RTO** (Recovery Time Objective) | 復旧にかけられる最大時間 | 4時間 |
| **RPO** (Recovery Point Objective) | 許容できる最大データ損失時間 | 1時間 |

- Tier 1（売上直結）: RTO 1h / RPO 15min
- Tier 2（内部業務）: RTO 4h / RPO 1h
- Tier 3（非クリティカル）: RTO 24h / RPO 24h

## DR戦略 4段階

| 戦略 | コスト | RTO | 概要 |
|------|--------|-----|------|
| Backup & Restore | 最安 | 数時間〜 | S3にバックアップ、必要時に復元 |
| Pilot Light | 安 | 数十分 | 最小限の環境をスタンバイ状態で維持 |
| Warm Standby | 中 | 数分 | 縮小版の本番環境を常時稼働 |
| Multi-Site Active-Active | 最高 | ほぼ0 | 複数リージョンで同時稼働 |

## バックアップ 3-2-1 ルール

- **3** コピーを保持する
- **2** 種類の異なるメディアに保存する
- **1** コピーはオフサイト（別リージョン/別クラウド）に置く

```yaml
# AWS Backup ポリシー例
backup_plan:
  rules:
    - rule_name: daily_backup
      schedule: "cron(0 2 * * ? *)"  # 毎日午前2時
      retention_days: 35
      copy_to_region: ap-northeast-1  # オフサイトコピー
```

## フェイルオーバーテスト手順

1. 事前通知（ステークホルダーへ計画的障害の連絡）
2. テスト環境での手順リハーサル
3. 本番フェイルオーバー実施（時間帯: 低トラフィック時間帯）
4. RTOの計測（手順開始から復旧確認まで）
5. RPOの計測（最後のバックアップからデータ損失量）
6. フェイルバック実施
7. 手順書の更新

## DR手順書テンプレート

```markdown
## 障害シナリオ: [データベース完全障害]
## 発動条件: [DBへの接続が5分以上不可]
## 対応手順:
1. PagerDutyでオンコールエンジニアを起動
2. CloudWatchアラームで障害範囲を確認
3. RDSフェイルオーバーを実行: `aws rds failover-db-cluster ...`
4. アプリケーションの接続確認
5. ステークホルダーへの状況報告
## 担当: [チーム名]
## 最終テスト日: [YYYY-MM-DD]
```

## 年次DR訓練計画

- Q1: データベース障害シナリオ
- Q2: リージョン障害シナリオ
- Q3: データ破損シナリオ
- Q4: 総合障害（複合シナリオ）
