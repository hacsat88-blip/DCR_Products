# External Ecosystem Registry — マシン上の外部AI資産 台帳

**スナップショット日:** 2026-06-19
**目的:** サトシ開発（DCR）が正本管理する `.ai/catalog/` とは別に、このマシンの `~/.claude/` 側に存在する**外部 vendor/marketplace 由来の AI 資産**（skills / agents / plugins）の「何があり・どこ由来で・どう管理するか」を1枚で可視化する台帳。`.ai/adapters/external-footprint.md` と同じ「台帳」思想。

**分類フレーム:** [.ai/catalog/skills/external-capability-intake/SKILL.md](../../.ai/catalog/skills/external-capability-intake/SKILL.md)（skip / concept-import / selective-source-import / immutable-upstream / external-tool-poc）
**drift 検出:** `pwsh -File tools/check-external-ecosystem.ps1`（この台帳のベースラインと実機の乖離を検出）

> 原則: 外部 vendor 物は DCR catalog に丸ごとコピーしない。出所と管理方針を記録し、更新は upstream に追随、drift だけ監視する（`immutable-upstream`）。価値が高く DCR で完全管理したい少数だけ `selective-source-import` で provenance 付き取込。

---

## 1. Skills（~/.claude/skills、計 50）

- **正本:** `~/.agents/.skill-lock.json`（v3。各 skill の source / sourceUrl / skillPath / hash / installedAt を保持。drift check は `source` で照合）
- **状態の注意:** `~/.claude/skills/*` は `~/.agents/skills/`(不在) を指す **broken symlink**。実体の出所は上記 lock。drift check が壊れを警告する。
- **分類:** 全 50 件 `immutable-upstream`（外部 git 由来）。うちサトシ catalog と名前重複する 7 件（find-skills, mcp-builder, remotion-best-practices, skill-creator, theme-factory, ui-ux-pro-max, web-artifacts-builder）は catalog 側を正本とし `skip`。

| Source repo | 件数 | sourceType | 分類 |
|---|---:|---|---|
| `coreyhaines31/marketingskills` | 28 | github | immutable-upstream |
| `anthropics/skills` | 17 | github | immutable-upstream |
| `vercel-labs/agent-skills` | 2 | github | immutable-upstream |
| `vercel-labs/skills` | 1 | github | immutable-upstream |
| `remotion-dev/skills` | 1 | github | immutable-upstream |
| `nextlevelbuilder/ui-ux-pro-max-skill` | 1 | github | immutable-upstream |
| **計** | **50** | | |

**更新方法:** Claude Code の skill 管理（lock 経由の再取得）。DCR 側では改修しない。

---

## 2. Agents（~/.claude/agents、計 85）

- **正本:** なし（loose `.md` ファイル群。**lock/manifest 不在＝provenance 追跡なし**）。
- **リスク:** 出所が記録されておらず、失うと復元不能。published ライブラリ（一貫した命名/記述形式）に見えるが出所未確定。
- **分類:** サトシ catalog と重複する `compliance-auditor` 1 件は `skip`（catalog が正本）。残り 84 件は出所未確定のため、暫定 `immutable-upstream`（DCRにコピーせず追跡のみ）。価値の高い少数を後述の `selective-source-import` 候補とする。
- **ドメイン内訳（参考）:** Engineering / Design / Marketing(地域SNS含む) / Product / PM / Ops / QA / GameDev / XR / Identity-Arch など（詳細はインベントリ）。

**対応:** drift check は件数と名前セットのスナップショット一致を監視。出所が判明したら本台帳に source を追記。

---

## 3. Plugins（~/.claude/plugins、計 5 / marketplace 2）

- **正本:** `~/.claude/plugins/installed_plugins.json`（v2）/ `~/.claude/plugins/known_marketplaces.json`
- **分類:** 全 `immutable-upstream`（marketplace が自動更新）。DCR は導入場所と提供物だけ記録。

| Plugin | scope | version | marketplace | 提供物（主） |
|---|---|---|---|---|
| `superpowers` | user | 5.0.7 | claude-plugins-official | skills 14（brainstorming, writing-plans, …）+ agent code-reviewer |
| `github` | user | unknown | claude-plugins-official | MCP tools（`mcp__plugin_github_github__*`） |
| `agent-sdk-dev` | user | unknown | claude-plugins-official | agents 2（py/ts verifier）+ command new-sdk-app |
| `claude-code-setup` | **project**(サトシ開発) | 1.0.0 | claude-plugins-official | skill claude-automation-recommender |
| `warp` | user | 2.1.0 | claude-code-warp | Warp ターミナル統合 |

| Marketplace | repo |
|---|---|
| `claude-plugins-official` | `anthropics/claude-plugins-official` |
| `claude-code-warp` | `warpdotdev/claude-code-warp` |

**別途追跡（既存）:** `obra/superpowers` 外部 checkout は `tools/check-external-superpowers.ps1` で drift 監視。

---

## 4. サトシ catalog との関係

- catalog（正本）: rules 54 / skills 70 / agents 116。`~/.claude` 側 135 件との**名前重複は 8 件（skills 7 + agent 1）= 約6%**。両者はほぼ独立。
- 重複分は catalog を正本とし `~/.claude` 側を `skip` 扱い（二重管理しない）。

## 5. selective-source-import で DCR 取込したもの

| Name | 種別 | upstream | 取込日 | 備考 |
|---|---|---|---|---|
| （未取込。価値の高い候補を承認のうえ追記する） | | | | |

## 6. drift / 更新の運用

- 乖離監視: `pwsh -File tools/check-external-ecosystem.ps1`（本台帳§1-3のベースラインと実機を照合）
- superpowers 個別: `pwsh -File tools/check-external-superpowers.ps1`
- ベースラインを意図的に変えた場合（skill/plugin の追加削除）は、本台帳の件数・セットを更新してから再チェック。

## 7. 関連
- 入口: [.ai/INDEX.md](../../.ai/INDEX.md)
- リポ外依存台帳: [.ai/adapters/external-footprint.md](../../.ai/adapters/external-footprint.md)
- 分類フレーム: [.ai/catalog/skills/external-capability-intake/SKILL.md](../../.ai/catalog/skills/external-capability-intake/SKILL.md)
