# templates/

`init-project.ps1` が使用するテンプレートディレクトリ。

これは legacy 退避場所ではなく、`init-project.ps1` の入力契約です。`templates/` の削除や runtime 配下への吸収は、`init-project.ps1` の参照先変更と互換期間を伴う移行が完了するまで行いません。

## 構成

| ディレクトリ                    | 内容                                       | 生成先                                         |
| ------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| `claude-code/`                  | Claude Code 用 project context 断片と周辺設定 | `<project>/.claude/CLAUDE.md`                  |
| `codex/`                        | Codex 用 project context 断片と周辺設定    | `<project>/AGENTS.md`                          |
| `product/`                      | 新規 Product 用の最小構成テンプレート      | `Product/<name>/` へ手動コピー                 |
| `vscode-copilot/`               | VS Code Copilot 用 project context 断片と周辺設定 | `<project>/.github/copilot-instructions.md`    |
| `project-context.md`            | プレースホルダーのキー一覧サンプル         | プロジェクトごとにコピーして編集               |
| `supermemory-project-policy.md` | project 単位の memory 運用方針テンプレート | プロジェクトごとにコピーして編集               |

### Claude Code テンプレートの生成先

- `<project>/.claude/CLAUDE.md`
- `<project>/.claude/settings.local.json`
- `<project>/.claude/commands/*.md`
- `<project>/.claude/mcp_config.example.json`
- `<project>/.claude/hooks.example.json`

### Codex テンプレートの生成先

- `<project>/AGENTS.md`
- `<project>/.codex/workflows/*.md`
- `<project>/.codex/mcp_config.example.json`
- `<project>/.codex/hooks.example.md`

### VS Code Copilot テンプレートの生成先

- `<project>/.github/copilot-instructions.md`
- `<project>/.github/prompts/*.md`
- `<project>/.vscode/mcp.json`
- `<project>/.vscode/tasks.hooks.json`

## ルール

- **テンプレートのみ配置する** — 実動作する設定ファイルはルートに置く
- **Product 雛形は `templates/product/` に置く** — `Product/` 配下は実在 Product だけを置く
- **プレースホルダーは `{key}` 形式** — `project-context.md` のキーと対応
- **共有リソース（.ai/, .ai/kernel/gates/）はここに置かない** — `init-project.ps1` がルートからコピーする
- **kernel 本文は置かない** — `init-project.ps1` が `.ai/kernel/dcr-kernel.md` と `.ai/environments/` を読み、各テンプレートの project context 断片を連結する
- **.vscode/ はここに不要** — プロジェクト固有設定は `init-project.ps1` のスコープ外
- **runtime entrypoint をここから直接上書きしない** — `.github/copilot-instructions.md` などの実運用ファイルはテンプレートと別管理
- **`templates/` を単独で削除しない** — `init-project.ps1` が `templates/claude-code/`, `templates/codex/`, `templates/vscode-copilot/` を読むため

## 使い方

```powershell
.\init-project.ps1 -ProjectPath .\my-project
```

詳細は `init-project.ps1 -?` を参照。
