# Instruction Governance

## 目的

共通ルールの重複を防ぎ、更新時の判断を一意にする。

## 正本と役割

- 共通正本: `.github/copilot-instructions.md`
- Claude差分: `CLAUDE.md`
- Codex差分: `AGENTS.md`
- CLI詳細: `COPILOT_CLI.md`
- 実体仕様: `.ai/kernel/`

## 優先順位

1. `.ai/kernel/` の正本
2. `.github/copilot-instructions.md`
3. 環境固有ファイル (`CLAUDE.md` / `AGENTS.md`)
4. 補助資料 (`docs/` 配下)

## 変更ルール

- 共通規則を変更する場合は、先に `.ai/kernel/` または `.github/copilot-instructions.md` を更新する。
- `CLAUDE.md` と `AGENTS.md` には差分のみを書く。
- 同一文面を複数ファイルへコピーしない。
- 競合時は「安全 > 目的 > 速度」で判断する。

## 追加時の判断基準

- ほぼ全タスクで有効: 共通正本へ記載。
- Claude専用挙動: `CLAUDE.md` に記載。
- Codex専用挙動: `AGENTS.md` に記載。
- 実行例や運用手順: `docs/` 配下へ記載。

## 検証フロー

1. `powershell -ExecutionPolicy Bypass -File .\validate.ps1`
2. `powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check`

両方が成功した場合のみ、instruction変更を完了扱いにする。

## レビュー観点

- 参照切れがないか。
- 重複記述が再発していないか。
- 環境固有差分と共通規則が混在していないか。
