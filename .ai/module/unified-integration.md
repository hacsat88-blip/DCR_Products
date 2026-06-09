# Unified Integration Module

このモジュールは、VS Code の GitHub Copilot、GitHub Copilot CLI、Codex、Cursor、Claude Code の
現行環境で同じ運用を再現するための共通仕様です。

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
3. Completion Review Proposal
   - 完成物がある場合は `a/` Review Gate / `code-reviewer` の実行を提案する
   - 自動実行せず、既存の候補提示 -> ユーザー承認 -> 発火に従う
4. `a/` Review Gate
   - ユーザー承認後に既存 review/debug ルールを適用
5. `q/` QA Gate
   - `.ai/catalog/skills/webapp-testing` を優先
   - 画面検証は証跡を残す
6. `sh/` Ship Gate
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

外部 Skill / Agent / MCP / CLI / workflow repo を提示された場合は、まず `external-capability-intake` で `skip / concept-import / selective-source-import / immutable-upstream / external-tool-poc` に分類する。かなり有用だが DCR 側で改修すると upstream 追随が壊れるものは `immutable-upstream` とし、Superpowers 型の「改修不可の外部正本」として扱う。

### Runtime memory backend

- 位置づけ: agentmemory などの MCP/REST memory backend は任意の外部補助層
- 役割: 過去判断、関連ファイル履歴、採用/非採用ポリシー、検証済みコマンドを着手前に recall する
- DCR との関係: `.ai/catalog`、`.ai/book`、docs、git 状態を正本とし、memory recall は補助情報として扱う
- 保存方針: 作業完了後に保存する場合は、決定・理由・検証結果・次回 recall trigger だけに絞る
- 禁止: secret、PII、ログ全文、中間推論、正本化すべき内容を runtime memory に保存しない

自然言語 trigger は `unified-router.md` の Runtime Memory Preflight に集約する。

### GBrain external memory/runtime candidate

- 位置づけ: `garrytan/gbrain` は memory DB、MCP、knowledge graph、skillpack、cron/dream cycle を含む外部 runtime 候補
- 採用形態: `external-tool-poc` + `concept-import`
- DCR との関係: DCR control plane、`.ai/catalog`、`.ai/book`、`pied-piper`、既存 runtime memory policy を置換しない
- 取り込む概念: brain-first recall、gap analysis、knowledge graph、skillpack doctor / skillopt の benchmark・held-out・dirty-tree gate の評価思想
- PoC 条件: repo 外または Product 単位で `gbrain init --pglite`、`gbrain doctor`、Codex MCP 接続などの非破壊確認を行ってから判断する
- 禁止: 43 skills、`RESOLVER.md`、installer、Bun runtime、MCP config、remote token、OAuth、email/calendar/voice ingestion、cron/dream cycle を DCR 正本へコピーまたは自動導入しない
- provenance: https://github.com/garrytan/gbrain

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
- 互換性: Codex / Claude / Copilot / Cursor / Gemini CLI で読めるよう、特定IDEの slash command ではなく自然言語 trigger と DCR metadata に落とす

### Addy Osmani agent-skills selective reference

- 位置づけ: addyosmani/agent-skills は 23 skills と lifecycle slash commands を含む agent workflow pack の比較対象
- 採用形態: installer、plugin、slash command、agent persona は導入せず、未充足の checklist / workflow 観点だけを DCR skill や gate の改善候補として比較する
- DCR との関係: `pied-piper`、`p/ q/ sh/`、Superpowers、OpenAI Skills official baseline を置換しない
- provenance: https://github.com/addyosmani/agent-skills

### CodeGraph external tool candidate

- 位置づけ: colbymchenry/codegraph は skill pack ではなく、local code knowledge graph / MCP code intelligence tool 候補
- 採用形態: `.ai/catalog` 正本、generated mirror、user-level MCP config へ直接入れず、必要時に `codegraph install --print-config codex` などで非破壊確認してから Product / repo 単位で PoC する
- DCR との関係: source-of-truth、routing、agent persona、memory backend を置換しない。採用する場合も optional external capability として扱う
- 禁止: この段階で `.codegraph/`、MCP 設定、PATH、依存関係を作らない
- provenance: https://github.com/colbymchenry/codegraph

### Karpathy skills covered-by-existing-policy

- 位置づけ: multica-ai/andrej-karpathy-skills は Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven Execution などの単体原則集
- 採用形態: 単体 `CLAUDE.md` や追加 runtime として導入しない
- DCR との関係: 推測しない、過剰抽象化しない、関係ない変更をしない、検証してから完了主張する方針は既存の AGENTS / kernel / editing constraints でカバーする
- provenance: https://github.com/multica-ai/andrej-karpathy-skills

### OpenUI Generative UI pattern import

- 位置づけ: thesysdev/openui は UI 生成 runtime ではなく、Generative UI 出力設計の参考実装として扱う
- 採用形態: `npx skills add`、scaffolded app、`@openuidev/*` runtime dependency は共通資産へ導入せず、component allowlist / schema-driven prompt / streaming renderer pattern だけを DCR skill に薄く記録する
- DCR との関係: rule / Skill / agent / orchestration / pipeline の制御層は置換しない。UI を生成する Product / prototype で必要になった場合だけ runtime 採用を個別判断する
- 既存導入: `structured-output` に Generative UI DSL の validation 観点、`web-artifacts-builder` に GenUI artifact の component schema / parser / fallback 観点を追加
- provenance: https://github.com/thesysdev/openui

### Taste Skill frontend design reference

- 位置づけ: `Leonxlnx/taste-skill` は frontend / visual design skillpack の selective reference
- 採用形態: `concept-import`
- DCR との関係: DCR `DESIGN.md`、`ui-ux-pro-max`、frontend / accessibility rules を優先し、DCR control plane や active Skill catalog を置換しない
- 取り込む概念: design read、anti-default discipline、variance / motion / density dials、redesign audit、visual quality が主目的のときの image-first reference workflow
- 非採用: `npx skills add`、外部 SKILL.md 群のコピー、`design-taste-frontend` / `gpt-taste` / `image-to-code` の active skill 化、Tailwind v4 / Motion / icon library など外部既定の強制
- provenance: https://github.com/Leonxlnx/taste-skill

### React Doctor quality gate import

- 位置づけ: millionco/react-doctor は React 専用 diagnostic CLI / CI action であり、DCR の制御層や汎用 QA framework ではない
- 採用形態: `npx react-doctor@latest install` や自動 agent skill 配置は使わず、React 変更後の advisory quality gate として DCR skill に薄く記録する
- DCR との関係: `static-analysis`、`webapp-testing`、`performance-profiling`、`accessibility-auditor` の前段または補助に置く。React / Next.js / Expo / React Native Product 単位でのみ実行する
- 既存導入: `react-quality-gate` を追加し、diff scan、score regression、`--no-score`、advisory-first CI 判断を明文化する
- provenance: https://github.com/millionco/react-doctor

### OpenAI Skills official baseline

- 位置づけ: openai/skills は DCR skill catalog の置換用コピー元ではなく、公式 baseline として扱う
- 採用形態: curated / system / primary-runtime 相当を比較対象にし、DCR skill は `keep`、`replace-with-openai`、`merge-into-overlay`、`fold-into-pipeline`、`deprecate` に分類する
- DCR との関係: `.ai/catalog/skills` を正本に保ち、OpenAI official skill は plugin/cache または upstream として参照する。user-level installer や generated mirror を正本化しない
- Exact overlap: 同名 skill は自動置換しない。比較済み decision を優先し、DCR の `docs/dcr/*`、proposal/approval gate、source-of-truth/mirror governance が残る場合は `merge-into-overlay` とする
- Pipeline consolidation: QA / ship / review / drift / security / performance 系の個別 skill は、物理削除前に `successor: dcr-pipeline` の deprecated alias として畳む
- Growth umbrella: marketing / CRO / SEO / copy / email / analytics / pricing 系は `growth-ops` を active umbrella にし、旧 skill は `successor: growth-ops` の deprecated alias として残す。金融データ連携など DCR 固有のものは keep する
- Documents umbrella: docs / ADR / API docs / diagrams / Office / PDF / spreadsheet / research 系は `documents-ops` を active umbrella にし、旧 skill は `successor: documents-ops` の deprecated alias として残す。`writing-plans` は OpenAI Superpowers baseline + DCR plans overlay として active に保つ
- Governance umbrella: 汎用 evaluation / context / planning / routing pattern / parallel wave 系は `governance-ops` を active umbrella にし、DCR source-of-truth、routing、memory、model-route、harness audit は active overlay として残す
- 既存導入: `openai-skills-catalog-audit` と `tools/audit-openai-skills.ps1` で、約 140 skill から約 70 skill へ向かう段階移行候補を出す
- 非採用: `.experimental` の初回採用、公式 skill の wholesale copy、内容比較前の同名 skill deprecated 化
- provenance: https://github.com/openai/skills

### 12-factor-agents principle imports

- 位置づけ: humanlayer/12-factor-agents は agent framework ではなく、production-grade agentic software の設計原則として参照する
- 採用形態: dependency、installer、runtime wrapper、外部 command は導入せず、DCR の判断基準として薄く要約する
- DCR との関係: `.ai/catalog` / `.ai/book` / `.ai/kernel` を正本にし、外部原則は source-of-truth を置換しない
- provenance: https://github.com/humanlayer/12-factor-agents

採用する設計チェック:

1. Own prompts/context: durable な prompt、routing、context 仕様は DCR 正本に置き、黒箱 framework に隠さない
2. State/control flow: `gate-state.json` は現在の proposal、`router-decisions.jsonl` は監査履歴として分離し、tool selection と invocation の間で停止できる
3. Human approval: P2/P3、外部送信、設定変更、削除、並列 orchestration は approval event を経てから実行する
4. Small focused agents: agent は小さく責務を明確にし、万能化しそうなものは親ハブ化、表示抑制、bundle proposal で束ねる
5. Trigger from anywhere: CLI/IDE 差分は薄くし、自然言語 trigger と proposal state machine を共通正本から読む

非採用:

- 12要素の文言をそのまま正本へコピーしない
- 既存 DCR の V10.1 proposal / bundle / telemetry pipeline を置き換えない
- 新しい orchestration runtime や自動実行 layer を増やさない

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
- Claude Code は `CLAUDE.md` を優先
- ただし、上記5つはこのモジュールを共通参照し、差分を最小化する
