# Instruction Governance

このリポジトリの AI 指示ファイルは、正本・生成物・個人上書きを分けて管理します。

## Asset Taxonomy

- `.ai/assets/rules/`: invariant、routing metadata、handoff policy を置く
- `.ai/assets/skills/`: 再利用可能な workflow、generator、analysis method を置く
- `.ai/assets/agents/`: runtime persona と execution specialist を置く
- `Product/**`: 再作中・成果物として保持する Product workspace だけを置く。shared にしたい asset だけ root 正本へ昇格する
- `templates/product/`: bootstrap 用の最小構成例を置く。実在 Product discovery の対象にはしない

## 正本

- `.ai/assets/rules/`
- `.ai/assets/skills/`
- `templates/`
- `.ai/assets/agents/`
- `.ai/kernel/`
- `.ai/core/modules/`
- `.dcr/config.json`
- `.dcr/templates/`

`.dcr/` と `docs/dcr/` はどちらも DCR の control surface だが、`.dcr/` は machine-readable config、`docs/dcr/` は human-readable governance として物理的に分離する。

## Generated mirror

以下は deploy によって再生成されます。

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.claude/agents/` (Git 管理外)
- `.codex/agents/` (Git 管理外)

大量生成される mirror は `.gitignore` で除外し、`.ai/assets/`, `.ai/kernel/` を正本として扱います。

## User-Level Managed Target

以下は repo 外ですが、`deploy.ps1` の managed target です。

- `%USERPROFILE%/.agents/skills`
- `%HOME%/.config/dcr/config.json`

これらは runtime cache ではなく、repo 正本から同期される deploy 先です。user-level 側の手編集は次回 deploy で上書きされます。

## 個人上書き

以下は Git 管理外です。

- `CLAUDE.local.md`
- `.claude/settings.local.json`

## ルール

- 共有ルールを個人ファイルで置き換えない
- 生成物を直接修正しない
- 運用手順や保存先を変える場合は、先に正本と README を更新する
- `docs/dcr/plans/` と `docs/dcr/specs/` は cross-session の共有導線として維持する
- `docs/dcr/reference/` は repo layout や glossary のような stable reference を置く
- `.dcr/` を `docs/` 配下へ物理移動しない。統合が必要な場合は `docs/dcr/reference/control-surface.md` のような stable reference で論理統合する
- 新規 active spec / plan は `docs/dcr/specs/` と `docs/dcr/plans/` の直下へ保存し、完了済み・低頻度参照の文書だけ `docs/dcr/specs/archive/` と `docs/dcr/plans/archive/` へ移す
- Product-local `.ai/` には overlay 用の source-of-truth だけを置き、generated mirror や editor-specific output は含めない
- `templates/product/` は bootstrap 用であり、実在 Product と同じ運用対象にしない
- standalone product clone は `Product/` 配下へ同居させない。shared 化したい rule / skill / agent だけ root へ昇格する
