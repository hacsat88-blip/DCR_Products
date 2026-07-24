# DCR tools

Mac triad の生成と検証は PowerShell 7 (`pwsh`) で実行します。

## Adapters

- `adapters/codex.ps1` — `AGENTS.md`
- `adapters/claude.ps1` — `CLAUDE.md`
- `adapters/cursor.ps1` — `.cursor/` と `.cursorignore`
- `adapters/agents.ps1` — `.codex/agents/` と `.claude/agents/`
- `deploy-all.ps1` — 上記 adapter の orchestrator

## Validators and generators

- `validate-skill-capabilities.ps1` — skill capability metadata
- `validate-adapter-manifest.ps1` — adapter manifest と deploy 実装の一致
- `validate-mac-triad-boundary.ps1` — 旧 runtime / Product surface の再混入防止
- `normalize-skill-capabilities.ps1` — skill capability metadata の正規化
- `manifest-compiler.ps1` と `lib/manifest.schema.json` — triad manifest の生成と schema
- `generate-routing-index.ps1` — rules / skills index の生成

通常はルートの entrypoint を使います。

```bash
pwsh -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
pwsh -ExecutionPolicy Bypass -File ./validate.ps1
```

生成物を直接編集しないでください。変更元は `.ai/` です。
