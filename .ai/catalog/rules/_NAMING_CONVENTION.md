# Catalog Naming Convention

ルール・スキル・エージェントの **命名一貫性** を保つための正本ガイド。
新規追加・改名時は本ドキュメントの suffix 規則に従うこと。

## Suffix の意味（責務スコープ）

| Suffix | 役割 | 権限 | 典型例 |
|---|---|---|---|
| `-steward` | **境界の番人**。ガバナンス・契約・traceability の維持を担当。範囲が広く、他ロールに対して「ノー」と言える | High | jira-workflow-steward, repo-boundary-steward, token-efficiency-steward |
| `-orchestrator` | **複数ロール調整**。ワークフロー全体の進行・ハンドオフを担う。**現状は pied-piper agent が唯一**（rules 側は agents-orchestrator のみ） | High | agents-orchestrator (rule), pied-piper (agent) |
| `-architect` | **構造設計**。システム全体の骨格・契約・データフローを設計。実装は他に委譲 | Medium-High | backend-architect, agentic-identity-trust-architect, ux-architect (deprecated) |
| `-engineer` | **実装の専門家**。ドメイン特化のコード・基盤を作る。日常的な実装が中心 | Medium | ai-engineer, data-engineer, devops-engineer, security-engineer, embedded-firmware-engineer, fintech-engineer |
| `-developer` | **汎用実装ロール**。エンジニア寄りだが、より広い範囲の実装をカバー（垂直クラスタの umbrella） | Medium | backend-developer, frontend-developer, fullstack-developer, mobile-developer |
| `-specialist` | **狭い領域の深い専門家**。技術スタック・プラットフォーム特化 | Medium | kotlin-specialist, react-specialist, kubernetes-specialist, refactoring-specialist |
| `-expert` | **言語・バージョン特化**。「-specialist」より狭く、特定言語・特定バージョンのエキスパート | Medium | dotnet-core-expert, powershell-7-expert, docker-expert, terragrunt-expert, slack-expert |
| `-pro` | **言語の総合的習熟**。「-expert」より広く、その言語/環境のベストプラクティス全般 | Medium | python-pro, typescript-pro, golang-pro, javascript-pro, sql-pro, php-pro, postgres-pro, cpp-pro |
| `-reviewer` | **レビュー専任**。実装はせず、品質判定とフィードバックを返す | Medium | code-reviewer, architect-reviewer |
| `-auditor` | **第三者監査**。コンプライアンス・セキュリティ・アクセシビリティの形式的審査 | High | security-auditor, compliance-auditor, accessibility-auditor (rule) |
| `-tester` | **テスト実行・検証**。実装の動作確認に特化 | Medium | api-tester, accessibility-tester, penetration-tester |
| `-analyst` | **分析・調査**。データ・市場・トレンドの解釈と推論を返す | Low-Medium | research-analyst, business-analyst, data-analyst, quant-analyst, trend-analyst (deprecated) |
| `-researcher` | **リサーチ専任**。「-analyst」より探索寄り、データ収集・整理が中心 | Low-Medium | ux-researcher, data-researcher (deprecated), market-researcher (deprecated) |
| `-manager` | **進行・調整**。タスク・リソース・関係者の管理 | Medium | senior-project-manager, product-manager, project-manager, customer-success-manager, dependency-manager |
| `-coordinator` | **連携・整合**。複数システム/ロール間の同期。**現状は pied-piper に統合**（旧 multi-agent-coordinator/error-coordinator は内部 utility） | Medium | error-coordinator (internal), context-manager (utility) |
| `-monitor` | **継続観測**。状態を見続けて異常検知・通知を返す | Medium | （現在 deprecated；performance-monitor → performance-engineer） |
| `-engine` / `-engineer` | （-engine は機能モジュール名、-engineer はロール名）混同注意 | - | behavioral-nudge-engine (deprecated, was rule) |
| `-strategist` | **戦略立案**。実装より方針・ポジショニング設計 | Low | social-media-strategist, agentic-identity-trust-architect (architect 兼用), seo-specialist (specialist 兼用) |
| `-curator` | **選別・整理**。コンテンツ・コミュニティの価値判断 | Low | （現在 deprecated；instagram-curator → content-creator） |
| `-builder` | **構築・組み立て**。新規プロダクトの ground-up 作成 | Medium | mobile-app-builder, reddit-community-builder (deprecated) |

## 命名衝突の解決順位

1. **最も狭い責務の suffix を優先**（specialist > developer > engineer の階層）
2. **ガバナンス系（-steward / -auditor）は他より優先**（境界判断は他に委譲できない）
3. **同じ責務範囲なら短い suffix を選ぶ**（-pro vs -expert で同等なら -pro）

## 新規追加時のチェックリスト

新しい rule / skill / agent を作るとき：
1. 既存ルール/エージェントに同じ責務がないか `_ROUTING_INDEX.md` で検索
2. 上表から最適な suffix を選定
3. `frontmatter` に `routing_category` / `domain` / `risk` を設定
4. 親ハブが存在する場合は `parent` を宣言
5. 兄弟エージェントが存在する場合は `sibling` を宣言
6. 言語・バージョン特化なら `language` / `version` フィールドを追加
7. 廃止する場合は `deprecated: true` + `successor: <name>` + `deprecation_reason` を frontmatter に記載

## 改名時の手順

1. 旧名を `deprecated: true` + `successor: <new>` でマーク
2. 新名のファイルを作成、内容を移行
3. 後継側に `absorbs: [<old>]` を宣言
4. `tools/generate-routing-index.ps1` を実行してインデックス再生成
5. `deploy.ps1` で deployment summary を確認
6. 2サイクル運用後（誤参照ゼロ確認後）に旧ファイル物理削除

## 名前空間に関する原則

- **kebab-case** を用いる（`ui-designer`, `senior-project-manager`）
- **数字バージョンは末尾**（`powershell-7-expert`, `dotnet-framework-4.8-expert`）
- **複合語は含めない**（`backend-and-api-developer` のような連接は禁止 → 親ハブで吸収）
- **形容詞 + 名詞**を基本とする（`senior-developer`, `inclusive-visuals-specialist`）
- **動詞名詞化は避ける**（`doing-X` 系は使わない）
