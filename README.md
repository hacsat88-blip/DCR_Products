# DCR Products Mac Triad

このリポジトリは、Mac 上の Codex / Claude Code / Cursor で共有する AI 開発構成の正本です。
Product データ、旧 runtime、レポート、snapshot、product template は正本に含めません。

## Source of truth

- `.ai/core/` — 共通カーネル
- `.ai/routing/` — ルーティングと gate
- `.ai/catalog/` — Rules / Skills / Agents
- `.ai/adapters/` — Codex / Claude Code / Cursor の差分

次のファイルは生成 mirror です。直接編集せず、先に `.ai/` を変更してください。

- `AGENTS.md` と `.codex/agents/` — Codex
- `CLAUDE.md` と `.claude/agents/` — Claude Code
- `.cursor/` と `.cursorignore` — Cursor

## Mac setup

PowerShell 7 (`pwsh`) が必要です。

```bash
brew install --cask powershell
pwsh -v
```

同期状態を確認します。

```bash
pwsh -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
pwsh -ExecutionPolicy Bypass -File ./tools/validate-skill-capabilities.ps1 -RepoRoot .
pwsh -ExecutionPolicy Bypass -File ./validate.ps1
git diff HEAD --check
git status --short
```

`.ai/` の変更を三面へ反映するときだけ deploy を実行します。

```bash
pwsh -ExecutionPolicy Bypass -File ./deploy.ps1
pwsh -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
```

Cursor adapter は DCR 管理下の `README.md`、`rules/dcr-kernel.mdc`、`.cursorignore` だけを更新し、
利用者が追加した `.cursor/` ファイルや MCP 設定を削除・上書きしません。

## Boundary

この正本に Product 開発やアプリを追加しません。`Product/`、`.dcr/`、`.devin/`、`.windsurf/`、
`.vscode/`、旧 assistant 用 entrypoint、生成レポートや snapshot を復活させないでください。
