# DCR Documentation

このディレクトリはDCR（Development Cycle Runtime）の運用ドキュメント、仕様、計画書を管理する領域です。

## 役割定義

### docs/dcr/ の役割
- **運用ドキュメント**: 開発ワークフロー、運用手順、監査方法
- **仕様・計画**: アーキテクチャ仕様、移行計画、実験計画
- **頻繁に更新**: 進行中の作業や一時的なドキュメント
- **人間向け**: 開発者が読むための詳細な手順や説明

### .ai/book/ との違い
| 特徴 | .ai/book/ | docs/dcr/ |
|------|-----------|-----------|
| 対象 | AIモデル | 人間（開発者） |
| 更新頻度 | 低（安定した仕様） | 高（進行中の作業） |
| 内容 | 抽象的な動作契約 | 具体的な手順・仕様 |
| 例 | トリガー定義、権限モデル | ワークフロー、移行計画 |

## ディレクトリ構造

```
docs/dcr/
├── architecture/       # アーキテクチャ図、データフロー図
├── development-workflow.md  # 開発ワークフロー標準
├── instruction-governance.md  # 運用方針の正本
├── operation-metrics-weekly.md  # 運用指標の週次記録テンプレート
├── plans/             # 移行計画、実験計画（進行中）
│   └── archive/       # 完了した計画のアーカイブ
├── reference/         # 安定したリファレンスドキュメント
└── specs/             # アーキテクチャ仕様、技術仕様
```

## 配置ガイドライン

| ドキュメント種別 | 配置先 | 理由 |
|----------------|--------|------|
| トリガー・ゲートの定義 | .ai/book/gates.md | 安定したコア仕様 |
| 実行モード・権限モデル | .ai/book/runtime.md | 全環境共通の動作契約 |
| 開発ワークフロー | docs/dcr/development-workflow.md | 運用手順 |
| アーキテクチャ仕様 | docs/dcr/specs/ | 進行中の設計 |
| 移行計画 | docs/dcr/plans/ | 一時的な計画 |
| 完了した仕様 | docs/dcr/reference/ | 安定したリファレンス |

## 運用ルール

- 新規仕様・計画は `specs/` または `plans/` の直下に保存
- 完了したドキュメントは `reference/` へ移動
- 古いプランは `plans/archive/` へ移動
- 週次運用指標は `operation-metrics-weekly.md` のテンプレートを使用
