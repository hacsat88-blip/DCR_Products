# Catalog Discovery Guide

このフォルダは、サトシ開発における shared source-of-truth の親フォルダです。
複数の AI エディタが同じ判断に到達したいときは、まずここから確認します。

## First Inspection Order

0. `.ai/kernel/`
   - 全環境共通の応答方針、権限、トリガー、runtime kernel を調べるとき
1. `rules/`
   - invariant、routing metadata、handoff policy、禁止事項を調べるとき
2. `skills/`
   - workflow、artifact generator、analysis method を調べるとき
3. `agents-source/`
   - runtime persona、execution specialist、handoff boundary を調べるとき

## When To Start Here

- shared rule / skill / agent source を編集したい
- どの editor にも共通する behavior を変えたい
- generated file ではなく正本を探したい
- Product 固有ではなく repo 共通の contract を確認したい

## When Not To Start Here

- Product 固有の実装や local workflow を調べるとき
  - その場合は `Product/README.md` を先に見る
- generated output の実体を確認したいだけのとき
  - `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.claude/agents/`, `.codex/agents/`, `.windsurf/` は deploy により再生成される mirror

## Promotion Rule

shared 化が必要な asset だけをここへ昇格します。

- rule は `rules/`
- skill は `skills/`
- agent source は `agents-source/`

Product 側の overlay や local setting をそのままここへ複製しません。

## Related References

- repo 全体の置き場所判断: `docs/dcr/reference/repo-layout.md`
- 日常運用と検証順: `docs/dcr/development-workflow.md`
- repo 全体の構造説明: `.ai/repo-map.md`
