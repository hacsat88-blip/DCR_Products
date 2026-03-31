# templates/

`init-project.ps1` が使用するテンプレートディレクトリ。

これは legacy 退避場所ではなく、`init-project.ps1` の入力契約です。`templates/` の削除や runtime 配下への吸収は、`init-project.ps1` の参照先変更と互換期間を伴う移行が完了するまで行いません。

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
- **共有リソース（.ai/, .ai/kernel/gates/）はここに置かない** — `init-project.ps1` がルートからコピーする
- **.vscode/ はここに不要** — プロジェクト固有設定は `init-project.ps1` のスコープ外
- **runtime entrypoint をここから直接上書きしない** — `.github/copilot-instructions.md` などの実運用ファイルはテンプレートと別管理
- **`templates/` を単独で削除しない** — `init-project.ps1` が `templates/claude-code/`, `templates/codex/`, `templates/vscode-copilot/` を読むため

## 使い方

```powershell
.\init-project.ps1 -ProjectPath .\my-project
```

詳細は `init-project.ps1 -?` を参照。
