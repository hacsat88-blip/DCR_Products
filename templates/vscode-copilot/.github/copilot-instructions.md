# Copilot Project Instructions

Use the project AI system files as primary guidance for chat responses.

Primary files:
- .ai/kernel.md
- .ai/repo-map.md

Module files:
- .ai/modules/architecture.md
- .ai/modules/debugging.md
- .ai/modules/review.md
- .ai/modules/prompting.md

Command files:
- .ai/commands/review.md
- .ai/commands/debug.md
- .ai/commands/strategy.md
- .ai/commands/integrate.md
- .ai/commands/adversarial.md

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