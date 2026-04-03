# Instruction Governance

## 目的

共通ルールの重複を防ぎ、更新時の判断を一意にする。

## 正本と役割

- 共通正本: `.github/copilot-instructions.md`
- Claude差分: `CLAUDE.md`
- Codex差分: `AGENTS.md`
- CLI詳細: `COPILOT_CLI.md`
- 実体仕様: `.ai/kernel/`

## 優先順位

1. `.ai/kernel/` の正本
2. `.github/copilot-instructions.md`
3. 環境固有ファイル (`CLAUDE.md` / `AGENTS.md`)
4. 補助資料 (`docs/` 配下)

## 変更ルール

- 共通規則を変更する場合は、先に `.ai/kernel/` または `.github/copilot-instructions.md` を更新する。
- `CLAUDE.md` と `AGENTS.md` には差分のみを書く。
- 同一文面を複数ファイルへコピーしない。
- 競合時は「安全 > 目的 > 速度」で判断する。

## 追加時の判断基準

- ほぼ全タスクで有効: 共通正本へ記載。
- Claude専用挙動: `CLAUDE.md` に記載。
- Codex専用挙動: `AGENTS.md` に記載。
- 実行例や運用手順: `docs/` 配下へ記載。

## 段階導入の現在地

- Step 1（個人オーバーライド層）: 導入済み
- Step 2（再利用ワークフロー層）: 導入済み
	- `.claude/commands/review.md`
	- `.claude/commands/fix.md`
- Step 3（自動ガードレール層）: 導入済み（通知のみ）
	- `.claude/settings.local.json` に通知フックを設定
	- `PreToolUse` / `PostToolUseFailure` で Bash 実行時の注意喚起のみ
- Step 4（外部連携層）: 導入済み（最小）
	- `.mcp.json` に GitHub MCP の最小構成を設定
	- 認証情報はローカル環境変数で管理する（ファイルに秘密情報を保存しない）
- Step 5（環境設定層）: 導入済み（共有最小）
	- `.claude/settings.json` を追加（language / permissions の最小構成）
	- 個人差分は `.claude/settings.local.json` に維持する
- Step 6（運用入口層）: 導入済み
	- `README.md` に個人運用の入口と最短運用手順を記載
- Step 7（観測層）: 導入済み
	- `docs/dcr/operation-metrics-weekly.md` に1週間の観測テンプレートを追加

## 個人運用での扱い

- 個人専用の上書きは `CLAUDE.local.md` を使用する。
- `CLAUDE.local.md` は Git 管理対象にしない。
- ローカル専用の `.claude/settings.local.json` は Git 管理対象にしない。
- 共有したい内容は `CLAUDE.local.md` ではなく共通正本へ移す。

## 検証フロー

1. `powershell -ExecutionPolicy Bypass -File .\validate.ps1`
2. `powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check`

両方が成功した場合のみ、instruction変更を完了扱いにする。

## レビュー観点

- 参照切れがないか。
- 重複記述が再発していないか。
- 環境固有差分と共通規則が混在していないか。

## Git fetch 警告の再発時手順

`git fetch` 実行時に `incorrect old value provided` が再発した場合は、以下の順で対処する。

1. `git remote prune origin`
2. `git fetch origin`
3. `git status -sb` で `main...origin/main` を確認

解消しない場合は、無理に reset せず、現状ログを保持して原因を切り分ける。

## Step 7 運用観測ルール

- 期間: 1週間（平日5日）
- 記録先: `docs/dcr/operation-metrics-weekly.md`
- 観測項目: 検証ゲート通過率、手戻り回数、fetch警告再発有無、1タスク完了までの所要時間
- 判定: 再発が多い箇所のみルールを追加し、問題がない箇所は現状維持
