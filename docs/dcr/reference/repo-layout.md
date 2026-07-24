# DCR Mac Triad Repo Layout

| Layer | Paths | Responsibility |
| --- | --- | --- |
| Source of truth | `.ai/core/`, `.ai/routing/`, `.ai/catalog/`, `.ai/adapters/` | 共通契約とtriad配布元 |
| Generated mirrors | `AGENTS.md`, `CLAUDE.md`, `.codex/agents/`, `.claude/agents/`, `.cursor/`, `.cursorignore` | 各runtimeが読む追跡済み出力 |
| Operations | `deploy.ps1`, `validate.ps1`, 必要な `tools/` | 生成、drift確認、検証 |
| Supporting docs | `README.md`, `docs/dcr/` | 人間向け手順と補助資料 |

Product、個別アプリ、旧 runtime、生成レポート、snapshot、product template はこの配置へ含めません。

## Editing Rule

`.ai/` を先に変更し、`deploy.ps1` で mirror を再生成してください。生成先の直接編集は禁止です。
