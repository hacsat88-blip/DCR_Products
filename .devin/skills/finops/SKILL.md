---
name: finops
routing_category: devops
description: "クラウドコスト最適化・予算アラート・リソース右サイジング・LLM APIコスト管理"
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

# FinOps

## 基本原則

- コストの可視化なくして最適化なし（タグ戦略が基盤）
- コスト配賦でチームの当事者意識を醸成する
- 削減より「適正価格のビジネス価値」を目指す

## タグ戦略（コスト可視化の基盤）

- 必須タグ: `team`, `product`, `env`（prod/staging/dev）, `cost-center`
- タグ適用率 100% が目標（SCP/Policy でタグなしリソース起動を禁止）
- タグ付けを CI/CD に組み込み（Terraform で強制）

## Reserved Instance / Savings Plans 最適化

- 1年コミット: 最大40%割引（RI）・最大66%割引（SP）
- 対象: 常時稼働リソース（EC2/RDS/Lambda）
- 手順: 過去3ヶ月の使用量を分析 → カバレッジ80%をコミット

## リソース右サイジング手順

1. CloudWatch / Azure Monitor で CPU/Memory 使用率を2週間収集
2. 平均10%以下のリソースを過剰プロビジョニングとしてリスト
3. 1段階ダウングレードしてリグレッションテスト実施
4. 本番で1週間監視後に確定

## LLM API コスト管理

- モデル選定: タスク複雑度に応じてTier分け
  - Trivial: haiku/gpt-4o-mini（1/10のコスト）
  - Standard: claude-sonnet/gpt-4o
  - Complex: claude-opus/o1
- Prompt Caching: 繰り返しプロンプトのキャッシュで最大90%削減
- バッチ処理: リアルタイム不要なタスクはBatch API（50%割引）
- 月次LLMコストダッシュボード必須

## コスト異常検知

- 前日比+30%をアラートの閾値に設定
- AWS Cost Anomaly Detection / Azure Cost Alerts を活用
- 週次コストレポートをチームへ自動配信

## コスト削減チェックリスト

- [ ] 未使用EIP/スナップショット/AMIの削除
- [ ] S3 Intelligent-Tiering 設定
- [ ] NAT Gateway → VPC Endpoint への置き換え
- [ ] 開発環境の夜間/週末シャットダウン自動化
- [ ] CloudFront キャッシュヒット率の向上
