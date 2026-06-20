# 引き継ぎ: プラットフォーム側エコシステムの集約方針タスク

**作成日:** 2026-06-19
**ステータス:** ✅ 完了（2026-06-19）
**成果:** 台帳 [docs/dcr/external-ecosystem-registry.md](external-ecosystem-registry.md) + drift検出 `tools/check-external-ecosystem.ps1`。intake 精査の結果、~/.claude 側はほぼ全件 `immutable-upstream`（追跡）が正と確定し、**selective-import は「取込なし」**。可視化（track-only）で「全体像が分かる」ゴール達成。`feat/external-ecosystem-registry` ブランチ。
**前提作業:** `.ai/` 概念ベース再編は完了・マージ済み（後述）

> 以下は実施時の計画ブリーフ（記録）。実際の結論は上記「成果」を参照。

---

## 🎯 ゴール（明確な到達点）

`~/.claude/` 側の **プラットフォーム/プラグイン・エコシステム**（サトシ開発の管理外にある skills / agents / plugins）を棚卸しし、**既存の「Vendor / Catalog / Skip」3レーン方針に当てはめて、どれをサトシ開発の管理下に取り込むか・追跡するか・放置するかを確定する**。最終的に「自分の AI 資産はサトシ開発を見れば全体像が分かる」状態に一歩近づける。

**完了の定義:**
1. `~/.claude/` の skills(50) / agents(85) / plugins を一覧化し、各々を Vendor（取込）/ Catalog（参照追跡）/ Skip（対象外）に分類した台帳がある。
2. 取込対象（Catalog レーン）と決めたものは `.ai/catalog/` へ正本化、または「追跡のみ」の参照表に登録されている。
3. 「これはサトシ開発で管理、これはプラットフォーム任せ」の線引きがドキュメント化され、INDEX か docs から辿れる。

> 注意: 全部を取り込むのが正解とは限らない。プラグイン（superpowers 等）が供給する skill は Claude Code 本体の更新で変わるため、**「取込（コピー）」より「参照追跡（どこに何があるか地図化）」が適切な場合が多い**。方針判断自体がこのタスクの主目的。

---

## 📍 現状（コンテキスト）

### サトシ開発側 = 自分の DCR 資産（集約済み・正本）
- `.ai/catalog/` が single source-of-truth: **rules 54 / skills 70 / agents 117**。全エディタ（Claude Code / Codex / Copilot / Cursor）へ `deploy.ps1` で一方向配布。
- 概念ゾーン構成: `core / routing / catalog / adapters` + `.ai/INDEX.md`（ルールブック）。最初に読むのは INDEX。
- 外部 Skill は既に「Vendor / Catalog / Skip」3レーンで管理する仕組みがある（drift checker パターン）。

### ~/.claude 側 = 別エコシステム（管理外・今回の対象）
| 種別 | 場所 | 規模 | 性質 |
|---|---|---|---|
| 個人 skills | `~/.claude/skills/` | **50**（ad-creative, ai-seo, copywriting 等） | マーケ/デザイン系の個人 skill |
| 個人/marketplace agents | `~/.claude/agents/` | **85**（accounts-payable-agent 等） | FleetView/マーケ系。サトシ開発の117とは**完全に別物・重複なし** |
| plugins | `~/.claude/plugins/`（repos/marketplaces/cache 配下） | 複数（superpowers, claude-plugins-official 等） | `deep-research` / `code-review` / `superpowers:*` 等の skill を供給 |

---

## 🔧 再利用すべき既存ツール（サトシ開発内）

このタスクはゼロから作らず、以下を活用すること:
- `tools/audit-openai-skills.ps1` — 外部 skill の監査
- `tools/check-external-superpowers.ps1` — superpowers 系の外部チェック
- `tools/skill-graph-report.ps1` — skill 関係のレポート
- `tools/validate-skill-capabilities.ps1` / `tools/normalize-skill-capabilities.ps1` — capability 検証/正規化
- `tools/skill-package.ps1` — skill のパッケージング
- 3レーン管理・drift checker の既存パターン（外部Skillリポ管理）

---

## 📋 次回セッションの手順（指示）

1. **着手前に確認:**
   - この引き継ぎ文書と `.ai/INDEX.md` を読む。
   - メモリ（`MEMORY.md`）の `project_external_skill_vendors`（3レーン管理）と `project_custom_skill_agent`（自作配置先）を参照。
2. **棚卸し（インベントリ）:**
   - `~/.claude/skills/`(50)・`~/.claude/agents/`(85)・`~/.claude/plugins/` を一覧化。各 skill/agent の name・出所（個人作 / marketplace / plugin）・用途を表に。
   - 上記の既存監査ツールを流して機械的に拾えるものは拾う。
3. **分類（Vendor / Catalog / Skip）:**
   - Vendor＝サトシ開発に正本コピーして管理 / Catalog＝場所と存在だけ追跡（コピーしない）/ Skip＝対象外。
   - プラグイン供給物は原則 Catalog（追跡のみ）を推奨（本体更新で変動するため）。
4. **実装:**
   - Catalog 追跡表 or 取込を実施。INDEX か docs から辿れるようにする。
   - drift checker / 3レーン管理の既存パターンに乗せる。
5. **検証:**
   - 既存 skill 系テスト（`tools/validate-skill-capabilities.ps1` 等）と `validate.ps1` が緑のままであることを確認。
   - 取込した場合は `deploy.ps1 -Check` で drift 0。

---

## ⚠️ この作業とは別の小さな未了タスク（忘れないため）

`.ai/` 再編本体は完了しているが、以下は保留中:
1. **ブランチの push / PR**: 再編＋レビュー修正は `chore/remove-devin-windsurf-mirrors` に**ローカルコミット済み・未 push**。main へ統合するなら push → PR が必要。
2. **新PC bootstrap 実走確認**: 買い替え後に `pwsh -ExecutionPolicy Bypass -File .ai/adapters/bootstrap.ps1` で復元できるかを実機で一度確認（UTF-8ハードニング済みなので CP932 でも entrypoint は壊れないはず）。

---

## 🔗 参照

- 再編設計: `docs/superpowers/specs/2026-06-17-ai-config-restructure-design.md`
- 再編実装計画: `docs/superpowers/plans/2026-06-17-ai-config-restructure.md`
- ルールブック（最初に読む）: `.ai/INDEX.md`
- 配布地図: `.ai/adapters/manifest.yaml` / リポ外依存台帳: `.ai/adapters/external-footprint.md`
- メモリ: `project_external_skill_vendors`, `project_custom_skill_agent`, `reference_deploy_encoding_cp932`, `feedback_eliminate_noise`
