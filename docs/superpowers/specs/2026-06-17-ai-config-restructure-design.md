# AI設定の概念ベース再編（single-pane化）設計

**日付:** 2026-06-17
**ステータス:** 設計レビュー待ち
**方針:** 一望性重視（既存の優れた思想を残し、低リスクで「同じ概念が複数箇所」を根絶）

---

## ゴール

マルチモデルAI指示ガバナンス・リポジトリ（DCR Products / サトシ開発）の `.ai/` を、
**抽象の層（kernel/module/book/catalog/environments）割りから「概念ゾーン」割りへ再編**し、
AIも人間も「最初の1ファイル（INDEX = ルールブック）を読めば迷わない」single-pane 構造にする。
あわせて、PC買い替えに備えた**ポータビリティの隠れ依存を解消**する。

---

## 背景・現状評価

### 現状アーキテクチャ（4層）
- **Source層（正本）:** `.ai/kernel/`, `.ai/catalog/{rules,skills,agents-source}/`, `templates/`
- **Runtime層（入口・生成物）:** `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`
- **Generated層（ミラー・生成物）:** `.claude/agents/`, `.codex/agents/`（git-ignore）
- **Workspace層:** `docs/`, `deploy.ps1`, `validate.ps1`, `init-project.ps1`

`.ai/` 内訳: `kernel/`(共通カーネル+gates+triggers), `catalog/`(rules/skills/agents), `module/`(振る舞い), `environments/`(ツール別差分), `book/`(共有正典)。

### 良い点（維持する）
- 正本の一意性（catalog=source、生成物はgit-ignore）
- エントリポイントの明示（repo-map の対応表）
- 一方向deploy + drift検出 + ルーティング精度評価（`eval-routing-accuracy.ps1`）

### 痛点（解決する）
1. **概念の分散:** 「routing」が `module/unified-router.md` / `book/routing.md` / `rule-routing-design.md` / `kernel/gates/trigger-model-route.md` の4箇所に散る。
2. **重複:** `book/`(共有正典) と `module/`(振る舞い) と `kernel/` に同種知識が少しずつ重なり、AIが「どれを正と見るか」を毎回判断。
3. **物理⇄論理の不一致:** ルート直下に `.claude/.codex/.cursor/.dcr/.github` が散在。名前から「正本か生成物か」が読めない（`.claude`は生成物、`.cursor`は一部正本）。
4. **ポータビリティの隠れ依存:** `deploy.ps1` がリポ外 `~/.config/dcr/config.json` に書き込む（リポ外書き込みはこの1件のみ）。買い替え後に deploy を流し忘れると壊れる口頭伝承手順。

### 確認済みの事実
- リポ外への書き込みは `~/.config/dcr/config.json` **の1件のみ**（`deploy.ps1:111,497,529-534`）。
- `~/.claude/agents`(85) と `~/.claude/skills` は FleetView/マーケ系の**別エコシステム**で、本リポは正本化していない（中身も別物）。
- → サトシ開発は既に約95%ポータブル。残る穴は上記 `~/.config/dcr` の隠れ手順のみ。

---

## アーキテクチャ：概念ベース4ゾーン + INDEX(ルールブック)

判断基準は1ルール: **「同じ概念は1つのホームにしか存在しない（single home per concept）」**

```
サトシ開発/
├── .ai/
│   ├── INDEX.md            ★ 唯一の入口＝ルールブック（行動規範 + 全正本地図 + 禁止事項）
│   ├── core/              不変の中核: identity / safety / permission / quality / runtime
│   ├── routing/           判断: router決定木 + gates + triggers + 実行時状態
│   ├── catalog/           道具: rules / skills / agents / playbooks（中身は不動）
│   ├── adapters/          配布: 環境差分 + テンプレ + manifest + self-bootstrap
│   └── _generated/        生成物の論理ルート（git-ignore・編集禁止印）
│
├── CLAUDE.md / AGENTS.md / .github/copilot-instructions.md   ← runtime entrypoint（生成物）
├── .claude/ .codex/ .cursor/ .dcr/                            ← 物理ミラー（生成物・編集禁止印）
└── docs/ deploy.ps1 validate.ps1 ...                          ← workspace（現状維持）
```

### 4ゾーンの役割
| ゾーン | ひとことで | 由来 |
|---|---|---|
| `core/` | 私は誰で、何をしてはいけないか（不変） | `kernel/_base,_safety,_permissions,_quality-floor`, `book/runtime,tool-contract` |
| `routing/` | いつ・何を発火するか（判断の全集約） | `module/unified-*`, `book/routing,gates`, `kernel/gates/`, `triggers-unified`, `rule-routing-design` |
| `catalog/` | 使える道具 | `catalog/{rules,skills,agents-source}`（不動）+ `module/{architecture,debugging,review,prompting}`→playbooks |
| `adapters/` | 各モデルへの翻訳・配布 | `environments/`, `templates/`, deploy対象表, 新規bootstrap |

### 重要な設計判断
- `book/` と `module/` の重複は、概念ごとに core/routing/adapters の**いずれか1つへ吸収して解消**。
- `_generated/` と物理ミラーは先頭印で「編集禁止の生成物」がディレクトリ名から自明に。
- `catalog/` の実ファイル（rules/skills/agents）は**移動しない**＝移行リスク最小化。動かすのは説明・routing・kernel系ドキュメントのみ。

---

## 移行マッピング

実ファイル（rules/skills/agents）は不動。動かすのは説明・routing・kernel系ドキュメントだけ。重複は統合(merge)で根絶。

### → `core/`
| 移行元 | 移行先 |
|---|---|
| `kernel/dcr-kernel.md` | `core/kernel.md` |
| `kernel/_base.md` | `core/identity.md` |
| `kernel/_safety-boundaries.md` | `core/safety.md` |
| `kernel/_permissions.md` + `book/permissions.md` | `core/permissions.md`（**2→1統合**） |
| `kernel/_quality-floor.md` | `core/quality-floor.md` |
| `kernel/_context-efficiency.md` | `core/context-efficiency.md` |
| `book/runtime.md` | `core/runtime.md` |
| `book/tool-contract.md` | `core/tool-contract.md` |

### → `routing/`
| 移行元 | 移行先 |
|---|---|
| `module/unified-router.md` + `book/routing.md` + `rule-routing-design.md` | `routing/router.md`（**3→1統合**、設計詳細は `routing/design.md` 分離可） |
| `module/unified-coordinator.md` | `routing/coordinator.md` |
| `module/unified-integration.md` | `routing/integration.md` |
| `kernel/gates/*` + `book/gates.md` | `routing/gates/`（**統合**） |
| `kernel/triggers-unified.md` | `routing/triggers.md` |
| `kernel/_auto-escalation.md` / `_module-behaviors.md` / `_parallel-execution.md` | `routing/`（発火・並列判断系） |
| `kernel/gate-state.json` + `.schema.json` + `router-decisions.jsonl` | `routing/state/`（実行時状態・ログ、内容不変で移設のみ） |

### → `catalog/`
| 移行元 | 移行先 |
|---|---|
| `catalog/{rules,skills,agents-source}/` | **そのまま（移動なし）** |
| `module/{architecture,debugging,review,prompting}.md` | `catalog/playbooks/` |

### → `adapters/`
| 移行元 | 移行先 |
|---|---|
| `environments/{claude-code,codex,copilot-cli,cursor,vscode-copilot}/` | `adapters/<env>/` |
| `templates/{各env, product}/` + `project-context.md` | `adapters/<env>/templates/` |
| deploy対象表（repo-mapの散文） | `adapters/manifest.yaml`（**新規・機械可読の配布地図**） |
| （新規） | `adapters/bootstrap.ps1`（**新規・ポータビリティ用**） |
| （新規） | `adapters/external-footprint.md`（**新規・リポ外依存の台帳**） |

### → 行き先の曖昧さ解消
- `module/{deprecation-lifecycle, hub-promotion-criteria}.md`（ガバナンス工程）→ `docs/dcr/`（運用知識は docs、動く設定は `.ai/` と役割分離）。
- `ARCHITECTURE.md` / `repo-map.md` → `.ai/INDEX.md` に吸収（地図役はINDEXが継承）。

---

## INDEX.md（ルールブック）フォーマット

AIが常に最初に読む1ファイル。4ブロック構成:

```markdown
# .ai INDEX — 唯一の入口・ルールブック

## 0. 行動規範（ルールブック本体）
- 判断順序: core(不変) → routing(発火判断) → catalog(道具選択) → adapters(配布)
- 発火前プロトコル: 候補・理由・期待効果を提示 → 承認 → 発火（P1 read-onlyのみ自動）
- 絶対禁止(hard-no): 生成物(_generated/.claude/.codex)の直接編集 / 一発move+delete移行 / リポ外への無断書き込み
- 完了前: a/ Review Gate + code-reviewer 相当を提案

## 1. これは何か / どう動くか（30秒の全体像）
4ゾーン: core(不変) / routing(判断) / catalog(道具) / adapters(配布)。
正本は .ai/ のみ。_generated/ と .claude/.codex/.cursor は編集禁止の生成物。

## 2. 概念 → 正本ファイル（single home 表）
| 知りたいこと          | 唯一の正本                    |
|----------------------|------------------------------|
| 安全境界・禁止事項     | core/safety.md               |
| 権限モデル P1/P2/P3   | core/permissions.md          |
| いつ何を発火するか     | routing/router.md            |
| Gate/Trigger 一覧     | routing/gates/ + triggers.md |
| 使えるrule/skill/agent | catalog/                     |
| 各モデルへの配布        | adapters/manifest.yaml       |

## 3. エントリポイント対応表
| ツール          | 入口(生成物)                    | 由来(正本) |
|----------------|--------------------------------|-----------|
| Claude Code    | CLAUDE.md                      | core/ + routing/ + adapters/claude-code |
| Codex/CLI      | AGENTS.md                      | 同上 + adapters/codex |
| VS Code Copilot| .github/copilot-instructions.md | 同上 + adapters/vscode-copilot |
```

**効果:** 「routing理解に4ファイル探索」が「INDEX §2 で正本1ファイルへ直行」に。AIの探索が **O(n)検索 → O(1)参照**。`deploy.ps1` が INDEX §2/§3 と `adapters/manifest.yaml` を突き合わせれば、**地図と実配布のdriftも自動検出**（地図が嘘をつかない）。

---

## ポータビリティ（self-bootstrap）

**穴:** `deploy.ps1` がリポ外 `~/.config/dcr/config.json` に書き、実行時に読まれる隠れ手順。

**設計（リポ内を正・外部は任意ミラーへ格下げ）:**
1. **正本をリポ内固定:** 実行時設定は `.dcr/config.json`（リポ内）を第一参照。探索順「①リポ相対 → ②`~/.config/dcr`」。リポ外が無くても動く。
2. **`adapters/bootstrap.ps1`（新規・冪等な単一入口）:** 新PCで実行する唯一のコマンド。
   - git hooks パス設定（`install-git-hooks.ps1` 内包）
   - `deploy.ps1` を1回流し entrypoint/ミラー再生成
   - `~/.config/dcr` を要するツール向けに任意でミラー再作成
   - 最後に「外部依存ゼロか」を自己検査して表示
   - → 移譲手順が「フォルダを移す → `pwsh adapters/bootstrap.ps1`」の2ステップに固定。
3. **`adapters/external-footprint.md`（新規・台帳）:** リポ外に触れるものを明示列挙（現状 `~/.config/dcr` の1件）。`validate.ps1` が列挙外のリポ外書き込みを検出したら警告＝隠れ依存を二度と作らない。

---

## 安全な移行手順＋検証

rule: 「一発の move+overwrite+delete 禁止 / 旧新パス並走 / 生成物は直接編集しない」を厳守。**Copy-then-Verify-then-Remove**。

| フェーズ | 内容 | 検証ゲート |
|---|---|---|
| **P0 ベースライン** | 現状で全テスト緑を記録 | `validate.ps1` / `eval-routing-accuracy.ps1` / `audit-system.ps1` の結果保存 |
| **P1 新ゾーン併設** | core/routing/catalog/adapters を**コピーで**作成。旧パス残置。INDEX + manifest 追加 | 新旧両存＝無破壊 |
| **P2 統合の検証** | dedup（permissions 2→1, router 3→1 等）を**diffで内容欠落ゼロ確認** | merge前後を `git diff` 精査。欠落あれば中断 |
| **P3 配線切替** | `deploy.ps1`/`validate.ps1`/`init-project.ps1` を新パス参照に。旧パスはfallback併走 | `eval-routing-accuracy.ps1` で精度がP0同等以上 |
| **P4 旧パス撤去** | 全緑確認後、旧 kernel/module/book/environments/templates を削除 | `validate.ps1 -Check`（drift 0）+ 全 `test-*.ps1` 緑 |

**統合(merge)の安全規約:**
- `permissions`（kernel+book）統合前に両者を diff し、片方にしか無い記述を全て新ファイルへ取り込む。1概念=1コミットで取りこぼし防止。
- routing 3→1 も同様。`router-decisions.jsonl`（ログ）は内容不変で移設のみ。

**回帰検証の主軸:** 既存 `eval-routing-accuracy.ps1` + `eval-routing-fixtures.json` を移行前後の同一テストとして使い「AIの判断が変わっていない」ことを定量保証。

---

## スコープ外（YAGNI）

- `catalog/` 内の rules/skills/agents の中身の改訂（再編とは別タスク）。
- Capability パッケージ化（機能割り）への移行（今回は型割り維持）。
- `~/.claude` 配下の FleetView/マーケ系エコシステムの取り込み（本リポの責務外）。
- 新モデル（Gemini等）アダプタの新規追加（構造が整ってから別タスク）。

---

## 成功基準

1. AIが `.ai/INDEX.md` 1ファイルから全正本に到達でき、同概念の重複参照が消える。
2. `eval-routing-accuracy.ps1` のルーティング精度が再編前と同等以上。
3. `validate.ps1 -Check` で drift 0。全 `test-*.ps1` 緑。
4. 「フォルダ移動 → `bootstrap.ps1`」の2ステップで新PC上に復元でき、リポ外依存は `external-footprint.md` の台帳と一致する。
