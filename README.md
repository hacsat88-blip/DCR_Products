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

## 最近の統合ポイント

- Execution Modes を全環境に共通導入: `autopilot:`, `ralph:`, `ulw`, `ralplan:`, `deep-interview:`, `ultrathink:`, `deepsearch:`, `team:`
- Azure Skills は DCR の置換ではなく、Azure 専用の external capability pack として統合
- Azure architecture / deploy / diagnostics / compliance / cost / RBAC / Kusto / Foundry は Azure Skills を優先確認
- Azure Skills 未導入時は DCR の `azure-infra-engineer`, `mcp-builder`, `security-engineer`, `devops-automator` などへフォールバック

詳細な共通仕様は `.ai/module/unified-integration.md` を参照。

## 構造

```text
.ai/           共通カーネル・モジュール・構造マップ
.commands/     トリガーコマンド (a/ i/ r/ s/ d/)
rules/         エージェントルール (84件) — 正本
skills/        スキル定義 (68件, superpowers 統合済み) — 正本
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
- 外部/検証系リポジトリは DCR 本体と分離する

安全フロー:

1. 正本を編集する
2. `deploy.ps1 -Target ...` で反映する
3. `deploy.ps1 -Check` で整合性を確認する
4. 問題なければコミットする

注意:

- `prototypes/` や外部クローンを同じルートに置く場合、検索・コミット対象を毎回明示して誤操作を防ぐ
- `.superpowers/` などの実行時生成物は Git 管理対象にしない
