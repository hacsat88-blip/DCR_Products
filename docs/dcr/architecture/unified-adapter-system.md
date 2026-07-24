# Mac Triad Adapter System

## Contract

`.ai/` の正本から、次の3環境だけへ一方向に配布します。

- Codex: `AGENTS.md`, `.codex/agents/`
- Claude Code: `CLAUDE.md`, `.claude/agents/`
- Cursor: `.cursor/`, `.cursorignore`

配布対応は `.ai/adapters/manifest.yaml` に宣言し、`validate.ps1` が実装との一致を検査します。

## Deployment

1. `.ai/` を変更する。
2. `deploy.ps1` を実行する。
3. `deploy.ps1 -Check` と `validate.ps1` を実行する。

生成mirrorは追跡しますが、直接編集しません。Cursor adapterは管理対象外の利用者ファイルを保持します。
