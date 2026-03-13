# Git Conventions — コミット & ブランチ規約

> origin: ECC common/git-workflow.md (DCR 向けに再構成)
> deploy.ps1: `_` プレフィクスのため deploy 対象外（参照ドキュメント）

## Conventional Commits

```
<type>: <description>
```

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング（動作変更なし） |
| `docs` | ドキュメント変更 |
| `test` | テスト追加・修正 |
| `chore` | ビルド・CI・依存更新 |
| `perf` | パフォーマンス改善 |
| `ci` | CI/CD 設定変更 |

## コミットメッセージ規則

- 命令形で書く: "add" not "added"
- 72 文字以内（subject line）
- 本文が必要な場合は空行で区切る
- Breaking change は `!` を付加: `feat!: remove legacy API`

## ブランチ戦略

| ブランチ | 用途 |
|----------|------|
| `main` | 安定版。直接 push 禁止（P3） |
| `feat/<name>` | 機能開発 |
| `fix/<name>` | バグ修正 |
| `docs/<name>` | ドキュメント |

## PR ルール

- 1 PR = 1 目的（混ぜない）
- レビュー前にセルフチェック
- CI パス必須
- マージ後はブランチ削除
