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
.ai/           共通カーネル・モジュール・構造マップ
.commands/     トリガーコマンド (a/ i/ r/ s/ d/)
rules/         エージェントルール (62件) — 正本
skills/        スキル定義 (57件, DCR 統合済み) — 正本
deploy.ps1     エディタへの一方向同期
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

- 正本として編集する: `rules/`, `skills/`, `.ai/agents-source/`
- 生成物として扱う: `.claude/agents/`, `.codex/agents/`, `.cursor/rules/*.mdc` (直接編集しない)
- `.cursor/rules/` は deploy による生成ミラーとして管理する（差分は `deploy.ps1 -Target cursor` の結果のみを許容する）
- 外部/検証系リポジトリは DCR 本体と分離する

安全フロー:

1. 正本を編集する
2. `deploy.ps1 -Target ...` で反映する
3. `deploy.ps1 -Check` で整合性を確認する
4. 問題なければコミットする

注意:

- `prototypes/` や外部クローンを同じルートに置く場合、検索・コミット対象を毎回明示して誤操作を防ぐ
- `.dcr/`（互換で `.superpowers/`）などの実行時生成物は Git 管理対象にしない
