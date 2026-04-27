---
name: api-design
routing_category: devops
description: "REST API 設計の実務チェックリスト。命名、HTTP semantics、エラー形式、認可、レート制限、バージョニングを定義する。"
---

# API Design

## チェックリスト

- URL は resource 名詞、複数形、kebab-case
- HTTP method と status code を正しく使う
- 入力バリデーションを schema で実装
- エラー応答は code/message を統一
- 認証と認可を分離して確認
- 一覧 API は pagination 必須
- レート制限と監査ログを定義

## バージョニング

- 非破壊変更は同バージョン
- 破壊変更は新バージョン
- Sunset と移行期間を明示
