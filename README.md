# DCR Products

AI エージェント設定・ルール・スキルの一元管理リポジトリ。

## 対応エディタ / CLI

| ツール | エントリポイント |
| -------- | --------- |
| VS Code Copilot | `.github/copilot-instructions.md` |
| GitHub Copilot CLI | `AGENTS.md` → `COPILOT_CLI.md` |
| Codex | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursor/rules/` |
| Gemini / Antigravity | `.gemini/settings.json` |

## 運用クイックガイド

- Execution Modes を全環境で共通運用: タスク先頭に `autopilot:`, `ralph:`, `ulw`, `ralplan:`, `deep-interview:`, `ultrathink:`, `deepsearch:`, `team:` を付けて実行戦略を宣言する
- **日次更新**: 毎朝 `deploy.ps1 -Check` でドリフト確認 → 変更があれば `deploy.ps1` で同期 → `validate.ps1` で全通過を確認してからコミットする
- **検証ゲート**: 実装後は `validate.ps1`（195 passed, 0 failed）と `deploy.ps1 -Check`（全 in sync）を通過してからコミット・PR を作成する
- Azure Skills は DCR の置換ではなく、Azure 専用タスクのための external capability pack として扱う
- Azure architecture / deploy / diagnostics / compliance / cost / RBAC / Kusto / Foundry は、まず Azure Skills plugin の利用可否を確認する
- Azure Skills を使えない場合は、DCR の `azure-infra-engineer`, `mcp-builder`, `security-engineer`, `devops-automator` などへフォールバックする

詳細な共通仕様は `.ai/module/unified-integration.md` を参照。

## 構造

```text
Source layer
	.ai/           共通カーネル・モジュール・構造マップ
	.ai/kernel/gates/ トリガーゲート (a/ i/ r/ s/ d/ p/ q/ sh/)
	rules/         エージェントルール (62件) — 正本
	skills/        スキル定義 (57件, DCR 統合済み) — 正本
	templates/     init-project.ps1 用テンプレート入力

Runtime / generated layer
	.github/       VS Code Copilot 実行エントリポイント
	.cursor/rules/ Cursor 用生成ミラー (.mdc)
	.claude/agents/ Claude 用生成ミラー
	.codex/agents/ Codex 用生成ミラー
	AGENTS.md      Codex / Copilot CLI 実行エントリポイント
	CLAUDE.md      Claude Code 実行エントリポイント

Workspace / operations layer
	.vscode/       ワークスペース設定
	docs/          設計・仕様・計画書
	deploy.ps1     エディタへの一方向同期
	validate.ps1   source assets の構造検証
	init-project.ps1 新規プロジェクト初期化
```

詳細は [.ai/repo-map.md](.ai/repo-map.md) を参照。

## デプロイ

```powershell
.\deploy.ps1                    # 全エディタへ同期
.\deploy.ps1 -Target vscode     # VS Code のみ
.\deploy.ps1 -Target cursor     # Cursor のみ
.\deploy.ps1 -DryRun            # 確認のみ
.\deploy.ps1 -Check             # ドリフト検出
```

## 迷わない運用境界 (推奨)

- 正本として編集する: `rules/`, `skills/`, `templates/`, `.ai/agents-source/`
- 生成物として扱う: `.claude/agents/`, `.codex/agents/`, `.cursor/rules/*.mdc` (直接編集しない)
- `.cursor/rules/` は deploy による生成ミラーとして管理する（差分は `deploy.ps1 -Target cursor` の結果のみを許容する）
- `.github/` は VS Code Copilot の runtime entrypoint であり、`rules/` や `skills/` の置き換え先ではない
- `templates/` は `init-project.ps1` の入力契約であり、スクリプト更新なしに削除しない
- 外部/検証系リポジトリは DCR 本体と分離する

unsafe migration と見なすもの:

- `rules/` を `.cursor/` 配下へ移す
- `skills/` を `.cursor/` 配下へ移す
- `templates/` を削除する
- `templates/vscode-copilot/.github/copilot-instructions.md` で `.github/copilot-instructions.md` を上書きする

上記は `deploy.ps1`, `validate.ps1`, `init-project.ps1` の参照先を同時に更新しない限り実施しない。

安全フロー:

1. 正本を編集する
2. `deploy.ps1 -Target ...` で反映する
3. `deploy.ps1 -Check` で整合性を確認する
4. 問題なければコミットする

注意:

- `prototypes/` や外部クローンを同じルートに置く場合、検索・コミット対象を毎回明示して誤操作を防ぐ
- `.dcr/`（互換で `.superpowers/`）などの実行時生成物は Git 管理対象にしない

将来 `.github/instructions/` を追加することは可能だが、これは VS Code Copilot 専用の補助レイヤーであり、このリポジトリでは `rules/` や `skills/` の正本を置き換えない。

構成移行が必要になった場合の安全な順序:

1. 新パスへ copy する
2. `deploy.ps1`, `validate.ps1`, `init-project.ps1` を両対応にする
3. `deploy.ps1 -Check` と `validate.ps1` を通す
4. ドキュメントを切り替える
5. 後続変更で旧パスを削除する

move と overwrite と delete を一発で行うコマンドによる構成移行は、このリポジトリでは許容しない。
