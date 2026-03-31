# DCR Kernel Environment — VS Code Copilot

## Entrypoint

- `.github/copilot-instructions.md`

## Environment-specific behavior

- VS Code Chat では `.github/copilot-instructions.md` が主要 entrypoint になる
- module files と command files の参照一覧を entrypoint 内に保持する
- `COPILOT_CLI.md` を full reference として案内する
- instructions 互換性を優先し、共通ルールは [../_base.md](../_base.md) を source of truth とする

## Notes

- VS Code 側は UI 上の tool 呼び出し制約があるため、外部参照だけに過度に依存しない
- runtime の安定性を優先し、entrypoint は十分な inline 情報を残す