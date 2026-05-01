---
name: platform-engineering
routing_category: devops
description: "内部開発者プラットフォーム設計：IDP・Golden Pathテンプレート・セルフサービスインフラ・DORA指標"
disable-model-invocation: true
---

# Platform Engineering

## 基本原則

- プラットフォームは製品——内部開発者がユーザー
- ゴールデンパスは「最も簡単な方法がベストプラクティスな方法」
- セルフサービスでチケット依存を排除する

## Internal Developer Platform（IDP）設計

```
開発者向けポータル（Backstage / Port / Cortex）
      ↓
セルフサービスメニュー:
  - 新サービスのスキャフォールディング
  - 環境プロビジョニング
  - シークレット管理
  - デプロイメント実行
  - ドキュメント閲覧
      ↓
バックエンドオートメーション（Terraform / Helm / GitHub Actions）
```

## Golden Path テンプレート設計

Golden Path = 承認済みのベストプラクティスを組み込んだサービステンプレート

```yaml
# Backstage Software Template 例
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: nodejs-microservice
spec:
  parameters:
    - title: Service Info
      properties:
        name: { type: string }
        owner: { type: string }
  steps:
    - id: fetch-template
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
    - id: create-repo
      action: publish:github
    - id: register
      action: catalog:register
```

テンプレートに組み込むべき要素:
- セキュリティスキャン（Trivy/Snyk）設定済み
- 監視/アラート設定（Prometheus/Grafana）
- ログ構造化（JSON形式）
- ヘルスチェックエンドポイント
- Dockerfile + K8s manifests

## セルフサービスインフラ

```hcl
# Terraform Module: 標準的なマイクロサービスインフラ
module "microservice" {
  source  = "internal/microservice/aws"
  version = "~> 2.0"
  
  name        = "payment-service"
  environment = "production"
  min_tasks   = 2
  max_tasks   = 10
  cpu         = 256
  memory      = 512
}
# このモジュールがネットワーク・IAM・ALB・ECS・監視を全て設定
```

## 開発者体験 KPI（DORA + SPACE）

### DORA Metrics
- デプロイ頻度: 1日N回（Elite: 複数回/日）
- リードタイム: コミットから本番まで（Elite: < 1時間）
- 変更失敗率: 本番障害率（Elite: < 5%）
- MTTR: 本番障害回復時間（Elite: < 1時間）

### Time-to-First-Deploy（プラットフォームKPI）
- 新サービスが初回デプロイできるまでの時間
- 目標: < 30分（テンプレートから本番稼働まで）

## プラットフォームチームのチャーターモデル

```markdown
## ミッション: 開発者が価値を届けるスピードを最大化する
## 顧客: 社内の全開発チーム
## 提供価値:
  - セルフサービスインフラ（チケット不要）
  - 認知負荷の削減（複雑さの抽象化）
  - ベストプラクティスの標準化
## KPI:
  - 開発者満足度（年次DevEx Survey）
  - Time-to-First-Deploy
  - プラットフォーム採用率
```
