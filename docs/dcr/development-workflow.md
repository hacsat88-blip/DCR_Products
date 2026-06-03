# Development Workflow Standard

DCR Products の最小運用フローです。迷ったときはこのファイルを正本にします。

## 日常フロー

1. 正本層だけを編集する
2. `pwsh -ExecutionPolicy Bypass -File .\validate.ps1` を実行する
3. 生成物に影響する変更なら `pwsh -ExecutionPolicy Bypass -File .\deploy.ps1` を実行する
4. `pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check` でドリフトを確認する
5. 問題がなければコミットする

## 正本層

- `.ai/catalog/rules/`
- `.ai/catalog/skills/`
- `.ai/catalog/agents-source/`
- `templates/`
- `.ai/kernel/`, `.ai/module/`
- `.dcr/` の設定ファイルとテンプレート

## 生成物層

以下は直接編集しません。

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.claude/agents/` (Git 管理外)
- `.codex/agents/` (Git 管理外)

## 計画と仕様の保存先

- 実装計画: `docs/dcr/plans/`
- 設計仕様: `docs/dcr/specs/`

active な計画と仕様は上記の直下へ保存し、完了済み・低頻度参照文書だけ `docs/dcr/plans/archive/` と `docs/dcr/specs/archive/` へ移す。

## Repo Layout Reference

- stable reference: `docs/dcr/reference/repo-layout.md`
- control surface reference: `docs/dcr/reference/control-surface.md`
- root DCR core に置くか `Product/<product>/` に置くか迷ったら、先にこの reference を確認する

## 変更の原則

- 小さく直す
- 正本を直してから deploy する
- 生成物を手編集しない
- パス移行は旧パス併存期間を置く
