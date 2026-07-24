# Instruction Governance

## Source Of Truth

共有 AI 構成の正本は `.ai/` です。

- `.ai/core/`: 共通動作と安全境界
- `.ai/routing/`: routing と gate
- `.ai/catalog/`: rules、skills、agents source
- `.ai/adapters/`: Codex / Claude Code / Cursor の環境差分と配布契約

## Generated Mirrors

- `AGENTS.md`, `.codex/agents/`
- `CLAUDE.md`, `.claude/agents/`
- `.cursor/`, `.cursorignore`

生成 mirror は追跡しますが、直接編集しません。変更は `.ai/` から始め、`deploy.ps1` で再生成します。

## Boundary

- Product、個別アプリ、product template を正本へ含めない。
- Codex / Claude Code / Cursor 以外の runtime entrypoint や adapter を追加しない。
- repo 外への書き込みを追加する場合は `.ai/adapters/external-footprint.md` を先に更新する。
- `docs/dcr/` は補助文書であり、`.ai/` の契約を上書きしない。
