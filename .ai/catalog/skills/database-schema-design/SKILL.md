---
name: database-schema-design
routing_category: devops
description: データベーススキーマ設計、マイグレーション戦略、インデックス最適化の実践ガイド。データモデルの品質と変更容易性を確保する。
contract:
  preconditions:
    - "対象ドメインのエンティティ関係が把握されている"
    - "想定されるクエリパターンが明確"
  postconditions:
    - "正規化されたスキーマ定義が生成される"
    - "マイグレーション手順が定義される"
  invariants:
    - "既存データを破壊する変更は明示的に警告する"
    - "ロールバック可能なマイグレーションを優先する"
composable:
  input_type: domain-model
  output_type: schema-spec
  chains_with:
    - api-design
    - deployment-patterns
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies: []
  tags:
    - database
    - schema
    - migration
runtime_targets:
  - codex
  - claude
  - copilot
  - cursor
  - windsurf
  - opencode
  - gemini-cli
---

# Database Schema Design

## 目的

変更に強く、パフォーマンスが予測可能なデータベーススキーマを設計する。

## いつ使うか

- 新規テーブル/コレクションの設計
- 既存スキーマのリファクタリング
- パフォーマンス問題の原因がデータモデルにある場合
- マイグレーション戦略の策定

## 設計原則

### 正規化 vs 非正規化

- **OLTP**: 第3正規形を基本とし、測定済みのパフォーマンス問題に対してのみ非正規化
- **OLAP/読み取り重視**: スター/スノーフレークスキーマで非正規化を許容
- 非正規化する場合は更新anomalyの影響範囲を文書化する

### 命名規約

- テーブル名: 複数形のスネークケース (`user_accounts`)
- カラム名: スネークケース (`created_at`)
- 外部キー: `<参照テーブル単数形>_id` (`user_id`)
- インデックス: `idx_<テーブル>_<カラム>` (`idx_orders_user_id`)
- 制約: `chk_<テーブル>_<目的>` (`chk_orders_positive_amount`)

### 型選択

| 用途 | 推奨型 | 避ける型 |
|------|--------|---------|
| 主キー | UUID v7 / BIGINT AUTO_INCREMENT | INT (範囲不足) |
| 金額 | DECIMAL(19,4) | FLOAT/DOUBLE |
| 日時 | TIMESTAMPTZ | TIMESTAMP (TZなし) |
| 短文 | VARCHAR(N) with CHECK | TEXT (制約なし) |
| 真偽値 | BOOLEAN | TINYINT |
| JSON data | JSONB (PostgreSQL) | TEXT + parse |

## マイグレーション戦略

### 安全なマイグレーションパターン

1. **カラム追加**: NULL許可 or DEFAULT値付きで追加 → アプリ更新 → NOT NULL制約追加
2. **カラム削除**: アプリから参照を削除 → カラムを NULL 許可に → 十分な期間後に DROP
3. **テーブルリネーム**: 新テーブル作成 → 二重書き込み → 読み取り切替 → 旧テーブル削除
4. **型変更**: 新カラム追加 → バックフィル → アプリ切替 → 旧カラム削除

### 危険な操作

- 🔴 本番での `ALTER TABLE ... ADD COLUMN ... NOT NULL` (デフォルトなし)
- 🔴 大テーブルへの排他ロック (`LOCK TABLE`)
- 🔴 `DROP COLUMN` のアプリ更新前実行
- 🟡 大量データの `UPDATE` (バッチ分割を推奨)

## インデックス設計

- 主キーインデックスは自動（明示不要）
- WHERE/JOIN/ORDER BY に頻出するカラムにインデックスを追加
- 複合インデックスではカーディナリティが高いカラムを先頭に
- カバリングインデックスで不要なテーブルアクセスを回避
- 過剰なインデックスは INSERT/UPDATE を遅くする（テーブル当たり5-7個を目安）

## チェックリスト

- [ ] エンティティ関係図 (ERD) を作成した
- [ ] 正規化レベルを意図的に決定した
- [ ] 命名規約に従っている
- [ ] 型選択が適切（金額にDECIMAL、日時にTIMESTAMPTZ等）
- [ ] マイグレーションがロールバック可能
- [ ] インデックスが主要クエリパターンをカバー
- [ ] 制約（NOT NULL, CHECK, FK）が設定されている
- [ ] テストデータでクエリプランを確認した
