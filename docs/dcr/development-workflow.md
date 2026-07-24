# Mac Triad Maintenance Workflow

## Standard Flow

1. `.ai/` の source of truth だけを編集する。
2. `pwsh -ExecutionPolicy Bypass -File ./deploy.ps1` で mirror を生成する。
3. `pwsh -ExecutionPolicy Bypass -File ./deploy.ps1 -Check` で同期を確認する。
4. `pwsh -ExecutionPolicy Bypass -File ./tools/validate-skill-capabilities.ps1 -RepoRoot .` を実行する。
5. `pwsh -ExecutionPolicy Bypass -File ./validate.ps1` を実行する。
6. `git diff HEAD --check` と `git status --short` を確認する。

## Rules

- `AGENTS.md`, `CLAUDE.md`, `.codex/agents/`, `.claude/agents/`, `.cursor/` を直接編集しない。
- Product 開発、アプリ追加、旧 runtime 復活を同じ変更へ含めない。
- 完了済み plan / spec は archive と明示し、現行運用の正本にしない。
