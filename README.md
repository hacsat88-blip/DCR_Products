# DCR Products

AI エージェント設定・ルール・スキルの一元管理リポジトリ。

## 対応エディタ / CLI

| ツール | エントリポイント |
|--------|---------|
| VS Code Copilot | `.github/copilot-instructions.md` |
| GitHub Copilot CLI | `AGENTS.md` → `COPILOT_CLI.md` |
| Codex | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursor/rules/` |
| Gemini / Antigravity | `.gemini/settings.json` |

## 構造

```
.ai/           共通カーネル・モジュール・構造マップ
.commands/     トリガーコマンド (a/ i/ r/ s/ d/)
rules/         エージェントルール (84件) — 正本
skills/        スキル定義 (51件) — 正本
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
