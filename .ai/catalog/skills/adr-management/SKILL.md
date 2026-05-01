---
name: adr-management
routing_category: documents
description: "Architecture Decision Records管理：Nygard形式・ステータス管理・ADR検索・設計漂流防止"
disable-model-invocation: true
---

# ADR Management

## 基本原則

- アーキテクチャ決定は「なぜ」を記録する（「何を」はコードが示す）
- 古くなったADRは削除せずに Deprecated として残す（歴史が重要）
- ADRはチームの共有知識——全エンジニアが参照・作成できる

## ADR ファイル構造

```
docs/adr/
  0001-use-postgresql-for-main-db.md
  0002-adopt-nextjs-for-frontend.md
  0003-supersedes-0001-migrate-to-aurora.md
```

## Nygard 形式テンプレート

```markdown
# ADR-0001: PostgreSQL をメインDBとして採用

## ステータス
Accepted（2024-01-15）

## コンテキスト
ユーザーデータの ACID 準拠が必要。
MySQL と PostgreSQL を比較検討した。

## 決定
PostgreSQL 16 を採用する。

## 理由
- JSON型のサポートが優れている
- チームの習熟度が高い
- 拡張機能（pgvector等）が豊富

## 結果
### ポジティブ
- スキーマ変更が柔軟
### ネガティブ
- MySQL より運用エンジニアのスキル要求が高い

## 関連ADR
- ADR-0005（接続プール設計）
```

## ステータス管理

| ステータス | 意味 |
|-----------|------|
| Proposed | 提案中（レビュー待ち） |
| Accepted | 採用・有効 |
| Deprecated | 非推奨（後継ADRあり） |
| Superseded by ADR-XXXX | 後継ADRに置き換え済み |

## ADR 番号採番規則

- ゼロパディング4桁: `0001`, `0002`, ...
- 番号は単調増加（欠番OK、再利用禁止）
- ファイル名: `{番号}-{短い説明（ハイフン区切り）}.md`

## ADR 検索・依存関係トレース

```bash
# 特定技術に関するADRを検索
grep -r "PostgreSQL" docs/adr/

# Superseded 状態のADRを一覧
grep -l "Superseded" docs/adr/
```

## 設計漂流防止チェックリスト

- [ ] 新機能の技術選定前にADR検索を実施
- [ ] ADRと矛盾する実装はPRレビューで指摘
- [ ] 四半期ごとにADRの有効性を見直し
- [ ] ADRをオンボーディング資料に含める
- [ ] 重要な設計変更にはADR作成をPRの条件にする
