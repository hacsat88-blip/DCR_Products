# DCR Kernel Environment — VS Code Copilot

## Entrypoint

- `.github/copilot-instructions.md`

## Environment-specific behavior

- VS Code Chat では `.github/copilot-instructions.md` が主要 entrypoint になる
- module files と command files の参照一覧を entrypoint 内に保持する
- `COPILOT_CLI.md` を full reference として案内する
- instructions 互換性を優先し、共通ルールは [../_base.md](../_base.md) を source of truth とする

## Session plan handoff

- セッション間の計画引き継ぎは `docs/dcr/plans/` に保存する
- p/ gate で承認された計画が `docs/dcr/plans/` に存在する場合、セッション開始時に自動読み込みする
- VS Code の memory tool で `/memories/session/gate-state.md` を管理する

## Gate state interaction

- gate state は `/memories/session/gate-state.md` で管理
- p/ 承認時に `plan_approved: true` を書き込み
- q/ 通過時に `qa_passed: true` を書き込み
- sh/ は `qa_passed: true` がない場合に🔴 Stop を返す

## Notes

- VS Code 側は UI 上の tool 呼び出し制約があるため、外部参照だけに過度に依存しない
- runtime の安定性を優先し、entrypoint は十分な inline 情報を残す