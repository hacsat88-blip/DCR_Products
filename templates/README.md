# templates/

`init-project.ps1` が使用するテンプレートディレクトリ。

## 構成

| ディレクトリ | 内容 | 生成先 |
|---|---|---|
| `claude-code/` | Claude Code 用テンプレート | `<project>/.claude/CLAUDE.md` |
| `codex/` | Codex 用テンプレート | `<project>/AGENTS.md` |
| `vscode-copilot/` | VS Code Copilot 用テンプレート | `<project>/.github/copilot-instructions.md` |
| `project-context.md` | プレースホルダーのキー一覧サンプル | プロジェクトごとにコピーして編集 |

## ルール

- **テンプレートのみ配置する** — 実動作する設定ファイルはルートに置く
- **プレースホルダーは `{key}` 形式** — `project-context.md` のキーと対応
- **共有リソース（.ai/, .commands/）はここに置かない** — `init-project.ps1` がルートからコピーする
- **.vscode/ はここに不要** — プロジェクト固有設定は `init-project.ps1` のスコープ外

## 使い方

```powershell
.\init-project.ps1 -ProjectPath .\my-project
```

詳細は `init-project.ps1 -?` を参照。
