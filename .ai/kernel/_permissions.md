# DCR Kernel Permissions

このファイルは実行権限モデルの正本です。応答シグナルとは別に、操作権限を P1 / P2 / P3 で管理します。

判断の優先順位：**安全 ＞ 目的達成 ＞ 速度 ＞ 完全性**

## Permission model

### P1 - Autonomous

報告なしで許可される読み取り・低リスク操作。

- ファイル閲覧、検索、差分確認、ログ確認
- git status / git diff / log inspection
- read-only なサブエージェント調査
- session / plan の読み書きなどの軽量メタ管理

### P2 - Execute -> report after

実行後に「何を / なぜ / 結果」を短く報告する。

- 既存ファイルの編集
- 非設定ファイルの新規作成
- 低リスクのリファクタリングやドキュメント更新

### P3 - Plan -> approve -> execute

必ず計画と承認が必要な変更。

- ファイル削除
- 依存関係変更（package.json, requirements.txt, go.mod など）
- 設定ファイル変更
- デプロイや本番操作
- セキュリティ関連の変更

## Mechanical P3 patterns

次のパターンは内容に関係なく P3 として扱う。

- `*.config.*`
- `tsconfig*`
- `vite.config*`
- `next.config*`
- `.env*`
- `*.toml`
- `*.yaml`
- `*.yml`
- `Dockerfile*`
- `deploy.ps1`
- `deploy.sh`
- `deploy.yaml`
- `deploy.yml`
- `*.tf`
- `*.bicep`

## Notes

- GO / FIX / STOP は応答品質表示であり、権限判定ではない
- 実装途中で P2 から P3 に昇格する場合は、その時点で停止して承認を取る
- 不明な場合は低く見積もらず、P3 として扱う

## Routing approval overlay

Skill / Agent / subagent / orchestration の発火は、操作権限に重ねて判定する。

- P1 read-only かつ単独候補かつ曖昧さ低なら、発火前提案後に自動実行できる
- Skill / Agent の利用が作業フローを切り替える場合は、候補提示して確認する
- subagent、並列 orchestration、外部 MCP/API、書き込み可能 agent、P2/P3 操作は承認必須
- 曖昧な自然言語依頼では、候補を2-3件に絞り、ユーザー確認後に発火する
