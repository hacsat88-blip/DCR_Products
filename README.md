# DCR Triad Core

このリポジトリは、Mac移行用の AI 開発共通資産です。正本は Codex、Claude Code、Cursor の三面だけに絞ります。

## Source of Truth

- `.ai/book/` - 共通方針、移行境界、運用ルール
- `.ai/kernel/` - 三面で共有する基本カーネル
- `.ai/catalog/rules/` - ルール正本
- `.ai/catalog/skills/` - Skill 正本
- `.ai/catalog/agents-source/` - Agent 正本

## Generated Entrypoints

- `AGENTS.md` - Codex
- `CLAUDE.md` - Claude Code
- `.cursor/` - Cursor
- `.codex/agents/` - Codex agents
- `.claude/agents/` - Claude Code agents

生成物は直接編集しません。変更は `.ai/` 配下の正本に入れてから、次のコマンドで再生成します。

```powershell
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
pwsh -ExecutionPolicy Bypass -File .\validate.ps1
```

## Mac Migration Boundary

Macへ移行する正本は Codex、Claude Code、Cursor を構成するファイルだけです。Product、レポート、旧エディタミラー、外部PoC、ローカル実行成果物はこの正本に含めません。

三面構成の考え方は [.ai/book/mac-migration.md](.ai/book/mac-migration.md) を参照してください。
