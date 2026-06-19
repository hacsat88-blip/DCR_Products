# Hooks Equivalent for Codex

Codex では Claude と同名の hooks 機構がない環境があります。
その場合は以下を手動運用ルールとして使います。

## Post-change checks

- `powershell -ExecutionPolicy Bypass -File .\\validate.ps1`
- `powershell -ExecutionPolicy Bypass -File .\\deploy.ps1 -Check`

## Suggested automation entry points

- Git pre-commit hook
- CI workflow check jobs
- Local task runner aliases
