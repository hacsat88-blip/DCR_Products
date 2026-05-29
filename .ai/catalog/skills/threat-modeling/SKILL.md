---
name: threat-modeling
routing_category: governance
description: "設計フェーズの脅威モデリング：STRIDE分析・DFD作成・MITRE ATT&CKマッピング・リスク優先度付け"
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
  - windsurf
  - opencode
  - gemini-cli
---

# Threat Modeling

## 基本原則

- 設計フェーズで脅威を発見するほど修正コストが低い
- 「何が悪いことが起きるか」を全員で考える（ブレインストーム）
- 対策は完璧を目指さない——リスク優先度に従い現実的に

## STRIDE 分析手順

| 脅威 | 内容 | 例 |
|------|------|-----|
| **S**poofing | なりすまし | 偽認証トークン |
| **T**ampering | 改ざん | リクエストパラメータ書き換え |
| **R**epudiation | 否認 | ログ削除・監査証跡欠如 |
| **I**nfo Disclosure | 情報漏洩 | エラーメッセージに内部情報 |
| **D**oS | サービス妨害 | レート制限なしAPI |
| **E**levation | 特権昇格 | 水平/垂直権限昇格 |

## DFD（データフロー図）作成手順

1. 外部エンティティ（ユーザー・外部API）を列挙
2. プロセス（APIエンドポイント・バックグラウンドジョブ）を配置
3. データストア（DB・キャッシュ・ファイル）を追加
4. データフローの方向と内容を矢印で描画
5. **トラストバウンダリー**（ゾーン境界）を点線で囲む

## MITRE ATT&CK マッピング

- 特定した脅威を ATT&CK テクニックIDにマッピング
- Initial Access / Execution / Persistence / Privilege Escalation / Defense Evasion / Credential Access / Discovery / Lateral Movement / Exfiltration / Impact
- Cloud Matrix（AWS/Azure/GCP）とEnterprise Matrixを使い分ける

## リスク優先度付け（DREAD）

- **D**amage: 被害の深刻度（1-10）
- **R**eproducibility: 再現容易性
- **E**xploitability: 攻撃難易度
- **A**ffected Users: 影響ユーザー数
- **D**iscoverability: 発見容易性

## 脅威モデルドキュメントテンプレート

```markdown
## 対象システム概要
## アーキテクチャ図（DFD）
## トラストバウンダリー一覧
## STRIDE 分析結果（表形式）
## 優先度付き対策リスト
## 残存リスクと受容判断
```

## 実施タイミング

- 新機能設計時（スプリント計画前）
- 外部API連携追加時
- 認証・認可設計変更時
- 年次セキュリティレビュー
