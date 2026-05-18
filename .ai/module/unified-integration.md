# Unified Integration Module

このモジュールは、VS Code の GitHub Copilot、GitHub Copilot CLI、Codex、Cursor、Windsurf、Claude Code の
6環境で同じ運用を再現するための共通仕様です。

## 目的

- 環境差分で運用品質がぶれないようにする
- gstack 的な「計画 → 実装 → レビュー → QA → 出荷」の流れを共通化する
- 既存の `.ai/catalog/rules/` と `.ai/catalog/skills/` を活かし、全面置換ではなく統合で進める
- 全モデルで同じ思考と実行判断を再現し、個性・口調・利用可能ツールだけを環境差分として残す

## Shared Book Rule

`.ai/kernel/_base.md` を共通正本とし、環境別 kernel は次だけを書く。

- entrypoint と自動ロード仕様
- 使えるツール・使えないツール
- セッション状態や計画の保存先
- 口調、表示密度、UI 制約

判断基準、trigger 解釈、権限、gate、外部確認条件、検証姿勢は環境別に再定義しない。差分が必要な場合も、共通正本への追加可否を先に検討する。

## Common Flow

1. `p/` Plan Gate
   - `.ai/catalog/skills/writing-plans` を優先
   - 3ステップ以上は計画を明示してから実装
2. 実装
   - 既存の skill と rules の優先順位に従う
3. `a/` Review Gate
   - 既存 review/debug ルールを適用
4. `q/` QA Gate
   - `.ai/catalog/skills/webapp-testing` を優先
   - 画面検証は証跡を残す
5. `sh/` Ship Gate
    - `.ai/catalog/skills/verification-before-completion` と
       `.ai/catalog/skills/finishing-a-development-branch` を優先

## Execution Modes (共通定義)

全環境で使用可能なキーワードプレフィクス。tmux 不要、動作戦略の宣言のみ。

| Keyword           | Mode                 | 適用環境                                    |
| ----------------- | -------------------- | ------------------------------------------- |
| `autopilot:`      | 自律実行             | VS Code / Copilot CLI / Claude Code / Codex |
| `ralph:`          | 完了保証ループ       | 同上（`ulw` 内包）                          |
| `ulw`             | 超並列バッチ処理     | 同上                                        |
| `ralplan:`        | 反復プラン精度向上   | 同上                                        |
| `deep-interview:` | ソクラテス式要件整理 | 同上                                        |
| `ultrathink:`     | 深層推論             | 同上                                        |
| `deepsearch:`     | コード全域調査       | 同上                                        |
| `team:`           | チームパイプライン   | 同上                                        |

## Team Pipeline（チームパイプライン詳細）

`team:` プレフィクス使用時、または大規模実装タスクで自動適用:

```
team-plan → team-prd → team-exec → team-verify → team-fix (loop)
```

| フェーズ    | 内容                   | DCR対応                                |
| ----------- | ---------------------- | -------------------------------------- |
| team-plan   | 要件分析・依存関係整理 | p/ Plan Gate                           |
| team-prd    | 実装仕様書（PRD）生成  | writing-plans skill                    |
| team-exec   | 実装（チャンク分割）   | P2実行                                 |
| team-verify | 全チェックリスト検証   | q/ QA Gate                             |
| team-fix    | 不合格項目修正ループ   | systematic-debugging skill → re-verify |

### Agent Inserts

`pied-piper` は primary agent を置き換えず、前後に補助 agent を挟んで品質を上げる。

```text
pied-piper
  -> codebase-onboarding-engineer
  -> primary agent
  -> qa-evidence-collector
  -> optional specialist QA
  -> pied-piper synthesis
```

| 補助 agent | 挿入位置 | 条件 |
|---|---|---|
| `codebase-onboarding-engineer` | 実装/レビュー前 | 初見領域、正本/生成物境界、Product overlay、実行経路が曖昧 |
| `qa-evidence-collector` | 実装/調査後 | 完了主張にコマンド、ログ、スクショ、差分、再現証跡が必要 |
| `accessibility-auditor` | QA | UI、キーボード、focus、semantic HTML、WCAG リスク |
| `api-tester` | QA | API / CLI / MCP / webhook / auth / contract / third-party integration |
| `performance-benchmarker` | QA | latency、throughput、memory、startup、bundle size、resource cost の変化 |

## Canonical Priority

1. ユーザーの明示要求
2. skills
3. rules
4. 直接処理

## Unified Coordinator（統一調整層）

**全タスクの入口**は [pied-piper](../catalog/agents-source/pied-piper.md) agent で受ける。
詳細は [unified-coordinator.md](unified-coordinator.md) と [unified-router.md](unified-router.md) を参照。

発火前に以下3行の提案を必ず先に出す：

```
採用候補：<rule|skill|agent名>（信頼度 0.XX / mode）
理由：<routing_category 一致 + match keywords/domain + risk/scale/ambiguity>
期待効果：<1行で見込まれる成果物・短縮時間・品質ゲート>
```

Skill、Agent、サブエージェント、並列 orchestration、外部 MCP/API、P2/P3 操作は、原則として候補提示 → ユーザー承認 → 発火の順に進める。P1 read-only の単独低リスク探索のみ、事前提案後に自動実行できる。

旧オーケストレーター（workflow-orchestrator / multi-agent-coordinator / task-distributor）は
すべて pied-piper に統合済み。alias 経由で旧名呼び出しも動作する。

## External Capability Packs

外部 plugin / skill pack は DCR の置換ではなく、ドメイン特化の拡張として扱う。

### Runtime memory backend

- 位置づけ: agentmemory などの MCP/REST memory backend は任意の外部補助層
- 役割: 過去判断、関連ファイル履歴、採用/非採用ポリシー、検証済みコマンドを着手前に recall する
- DCR との関係: `.ai/catalog`、`.ai/book`、docs、git 状態を正本とし、memory recall は補助情報として扱う
- 保存方針: 作業完了後に保存する場合は、決定・理由・検証結果・次回 recall trigger だけに絞る
- 禁止: secret、PII、ログ全文、中間推論、正本化すべき内容を runtime memory に保存しない

自然言語 trigger は `unified-router.md` の Runtime Memory Preflight に集約する。

### GSD pattern imports

- 位置づけ: GSD は spec-driven / context engineering / phase-state pattern の参照元
- 採用形態: runtime command、`.planning/`、installer は導入せず、DCR skill として薄く移植する
- DCR との関係: `pied-piper`、`unified-router`、`.ai/book` を置換しない
- 既存導入: `decision-complete-planning`、`phase-state-artifacts`、`parallel-wave-execution`、`uat-verification-gate`、`namespace-skill-routing`

### Matt Pocock skills pattern imports

- 位置づけ: mattpocock/skills は small, adaptable, composable な engineering method の参照元
- 採用形態: `skills.sh`、setup command、Claude 固有 slash command は導入せず、DCR skill として薄く移植する
- DCR との関係: `pied-piper` と `unified-router` を置換せず、pre-plan / pre-impl / debug / handoff の補助 skill として使う
- 既存導入: `domain-decision-grilling`、`architecture-zoom-out`、`systematic-debugging` 補強、`phase-state-artifacts` handoff 補強、`improve-codebase-architecture` provenance 補強
- 互換性: Codex / Claude / Copilot / Cursor / Windsurf / OpenCode / Gemini CLI で読めるよう、特定IDEの slash command ではなく自然言語 trigger と DCR metadata に落とす

### Azure Skills plugin

- 位置づけ: Azure 専用 capability pack
- 役割: Azure workflows, Azure MCP Server, Foundry MCP を提供する実行専門層
- DCR との関係: DCR が制御層、Azure Skills が Azure 専門層

### Routing Rule

以下に強く一致する場合、Azure Skills plugin の利用可否を先に確認する:

- Azure architecture / service selection
- Azure prepare / validate / deploy workflows
- Azure diagnostics / observability / compliance
- Azure cost optimization
- Azure RBAC / storage / Kusto
- Microsoft Foundry / model deployment / agent workflows

利用可能な場合:

- Azure 専用 guidance と MCP 実行は Azure Skills を優先
- ただし signal protocol, permission model, p/ → q/ → sh/ は DCR を維持する

利用不可の場合:

- `azure-infra-engineer`, `mcp-builder`, `security-engineer`, `devops-automator` など既存 DCR 資産へフォールバックする

## Notes

- Copilot CLI は `AGENTS.md` を入口とし、CLI 固有差分は `.ai/environments/copilot-cli/kernel.md` を参照する
- VS Code Copilot は `.github/copilot-instructions.md` を優先
- Codex は `AGENTS.md` を優先
- Cursor は `.cursor/rules/`（`deploy.ps1` 生成）を優先
- Windsurf は `.windsurf/rules/`（`deploy.ps1` 生成）を優先
- Claude Code は `CLAUDE.md` を優先
- ただし、上記5つはこのモジュールを共通参照し、差分を最小化する
