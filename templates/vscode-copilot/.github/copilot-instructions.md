# Copilot Project Instructions

Use the project AI system files as primary guidance for chat responses.

Primary files:
- .ai/kernel.md
- .ai/repo-map.md

Module files:
- .ai/module/architecture.md
- .ai/module/debugging.md
- .ai/module/review.md
- .ai/module/prompting.md
- .ai/module/unified-integration.md

Command files:
- .commands/review.md
- .commands/debug.md
- .commands/strategy.md
- .commands/integrate.md
- .commands/adversarial.md
- .commands/plan.md
- .commands/qa.md
- .commands/ship.md

Response rules:
- Start with one signal: 🟢 Go, 🟡 Fix, or 🔴 Stop
- Lead with the conclusion and the next actionable step
- Avoid greetings, filler, and ceremonial language
- Prefer concise, operational answers
- Do not invent APIs, commands, files, configs, or framework behavior

---

## プロジェクト固有情報

<!-- init-project.ps1 実行時に project-context.md から自動注入される -->

### プロジェクト概要

- プロジェクト名: {project_name}
- 説明: {project_description}

### 技術スタック

- 言語: {language}
- フレームワーク: {framework}
- パッケージマネージャ: {package_manager}
- ランタイム: {runtime}

### コマンド

| 操作 | コマンド |
|------|----------|
| インストール | `{cmd_install}` |
| 開発サーバー | `{cmd_dev}` |
| ビルド | `{cmd_build}` |
| テスト | `{cmd_test}` |
| Lint | `{cmd_lint}` |

### ディレクトリ構成

```
{directory_structure}
```

### NEVER — 絶対にやってはいけないこと

- {never_item_1}
- {never_item_2}