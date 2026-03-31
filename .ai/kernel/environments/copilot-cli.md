# DCR Kernel Environment — GitHub Copilot CLI

## Entrypoint

- `COPILOT_CLI.md`

## Environment-specific behavior

- session initialization を持つ
- tool priority hierarchy を持つ
- plan mode と task tracking を持つ
- SQL / session-state など CLI 固有の管理フローを持つ
- 共通ルールは [../_base.md](../_base.md) を source of truth とする

## CLI-specific sections

- Session initialization
- Tool priority hierarchy
- Agent / Skill routing
- Plan mode
- Task tracking
- Troubleshooting

## Notes

- CLI 固有要素は他環境へ逆流させない
- 共通 trigger や gate chain の変更は base 側で行う