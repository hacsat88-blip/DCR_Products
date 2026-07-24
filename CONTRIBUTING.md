# Contributing to DCR Products

DCR Products は、Mac 上の Codex / Claude Code / Cursor で共有する AI 構成を管理します。
正本は `.ai/` であり、Product、旧 runtime、個別アプリはこのリポジトリへ追加しません。

## 編集対象

- 共通動作: `.ai/core/`
- routing / gate: `.ai/routing/`
- rules / skills / agents: `.ai/catalog/`
- runtime 差分と配布契約: `.ai/adapters/`

次は生成 mirror です。直接編集しないでください。

- Codex: `AGENTS.md`, `.codex/agents/`
- Claude Code: `CLAUDE.md`, `.claude/agents/`
- Cursor: `.cursor/`, `.cursorignore`

## 変更フロー

1. `.ai/` の正本を変更する。
2. `pwsh -ExecutionPolicy Bypass -File ./deploy.ps1` で mirror を生成する。
3. 次の検証をすべて実行する。

```bash
pwsh -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
pwsh -ExecutionPolicy Bypass -File ./tools/validate-skill-capabilities.ps1 -RepoRoot .
pwsh -ExecutionPolicy Bypass -File ./validate.ps1
git diff HEAD --check
git status --short
```

不要な runtime、Product helper、生成レポート、snapshot、product template を復活させないでください。
