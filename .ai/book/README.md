# DCR Shared Book

This directory is the shared source of truth for model-independent thinking and execution behavior.

All AI environments should read this book first. Environment files may describe capabilities, entrypoints, storage, tone, and UI limits, but must not redefine the shared thinking contract.

## 役割定義

### .ai/book/ の役割
- **安定した仕様**: モデルに依存しない共通思考と実行動作の正本
- **頻繁に更新しない**: 変更頻度の低いコア仕様のみ配置
- **全環境共通**: どのAI環境でも最初に読むべきドキュメント
- **抽象化された契約**: 具体的な実装詳細ではなく、抽象的な動作契約を定義

### docs/dcr/ の役割
- **運用ドキュメント**: 開発ワークフロー、運用手順、監査方法
- **仕様・計画**: アーキテクチャ仕様、移行計画、実験計画
- **頻繁に更新**: 進行中の作業や一時的なドキュメント
- **人間向け**: 開発者が読むための詳細な手順や説明

## 配置ガイドライン

| ドキュメント種別 | 配置先 | 理由 |
|----------------|--------|------|
| トリガー・ゲートの定義 | .ai/book/gates.md | 安定したコア仕様 |
| 実行モード・権限モデル | .ai/book/runtime.md | 全環境共通の動作契約 |
| 開発ワークフロー | docs/dcr/development-workflow.md | 運用手順 |
| アーキテクチャ仕様 | docs/dcr/specs/ | 進行中の設計 |
| 移行計画 | docs/dcr/plans/ | 一時的な計画 |
| 完了した仕様 | docs/dcr/reference/ | 安定したリファレンス |

## Chapters

- [runtime.md](runtime.md): shared behavior, response contract, freshness, triggers, execution modes
- [routing.md](routing.md): Rule / Skill / Agent selection and alias handling
- [gates.md](gates.md): trigger and gate chain behavior
- [permissions.md](permissions.md): P1 / P2 / P3 permissions and safety boundaries
- [tool-contract.md](tool-contract.md): abstract tool operations and fallbacks across environments
- [mac-migration.md](mac-migration.md): Windows to macOS migration, Product boundary, UTF-8/LF policy

## Compatibility Layer

The legacy runtime files under `.ai/kernel/` remain available for adapters and tools that already load them.

- `.ai/kernel/_base.md` mirrors the runtime chapter for common execution behavior.
- `.ai/kernel/dcr-kernel.md` is the inline runtime distributed to rule-loader style adapters.
- `.ai/module/unified-router.md` remains the detailed router implementation referenced by [routing.md](routing.md).

