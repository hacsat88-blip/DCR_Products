# .ai INDEX — 唯一の入口・ルールブック

正本は `.ai/` のみ。`_generated/` と `.claude/ .codex/ .cursor/` は編集禁止の生成物。

## 0. 行動規範（ルールブック本体・AIはまずここを読む）
- 判断順序: core(不変) → routing(発火判断) → catalog(道具選択) → adapters(配布)
- 発火前プロトコル: 候補・理由・期待効果を提示 → ユーザー承認 → 発火（P1 read-only単独低リスクのみ短い事前報告で自動）
- 絶対禁止(hard-no):
  - 生成物（`_generated/`・`.claude/`・`.codex/`・`.cursor/`・`CLAUDE.md`・`AGENTS.md`）の直接編集
  - 一発の move+overwrite+delete 移行（必ず Copy→Verify→Remove・旧新並走）
  - `external-footprint.md` に無いリポ外への書き込み
- 完了前: `a/` Review Gate + `code-reviewer` 相当のレビューを提案

## 1. 全体像（30秒）
4ゾーン: core(不変) / routing(判断) / catalog(道具) / adapters(配布)。

## 2. 概念 → 正本ファイル（single home）
| 知りたいこと            | 唯一の正本                       |
|------------------------|---------------------------------|
| 安全境界・禁止事項       | core/safety.md                  |
| 権限モデル P1/P2/P3     | core/permissions.md             |
| 不変の中核(identity)     | core/identity.md                |
| 共通実行原則             | core/operating-principles.md    |
| いつ何を発火するか       | routing/router.md               |
| 設計背景・単一ソース原則 | routing/design.md               |
| Gate/Trigger            | routing/gates/ + routing/triggers.md |
| 使えるrule/skill/agent  | catalog/                        |
| 専門プレイブック         | catalog/playbooks/              |
| triad への配布契約         | adapters/manifest.yaml          |
| リポ外依存・復元手順      | adapters/external-footprint.md  |
| マシン上の外部AI資産(~/.claude) | docs/dcr/external-ecosystem-registry.md |

## 3. エントリポイント対応表
| ツール          | 入口(生成物)                     | 由来(正本) |
|----------------|---------------------------------|-----------|
| Claude Code    | CLAUDE.md                       | core/ + routing/ + adapters/claude-code |
| Codex/CLI      | AGENTS.md                       | core/ + routing/ + adapters/codex |
| Cursor         | .cursor/rules/dcr-kernel.mdc   | core/ + routing/ + adapters/cursor |
