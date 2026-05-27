---
name: openai-skills-catalog-audit
routing_category: governance
description: "DCR の skill catalog が飽和している、OpenAI 公式 skills を土台にしたい、既存 skill を半減したい、重複 skill を deprecated/overlay/pipeline に分類したい、または openai/skills と .ai/catalog/skills の差分棚卸しが必要なときに使う。"
contract:
  preconditions:
    - "DCR skill catalog または OpenAI skills cache を参照できる"
    - "分類・移行方針を先に決め、物理削除は lifecycle 判定後に行う段階である"
  postconditions:
    - "DCR skill が keep / replace-with-openai / merge-into-overlay / fold-into-pipeline / deprecate に分類される"
    - "OpenAI official baseline と DCR local overlay の境界が残る"
    - "Stage 4 削除候補は deprecation dashboard で確認され、次の migration wave が明確になる"
  invariants:
    - "OpenAI official skill を丸ごと DCR 正本にコピーしない"
    - "generated mirror や user-level install を source-of-truth にしない"
    - "同名 skill は内容比較が終わるまで deprecated 化しない"
composable:
  input_type: catalog
  output_type: audit-report
  chains_with:
    - harness-audit
    - repo-boundary-hygiene
    - dcr-generated-mirror-drift
    - verification-before-completion
metadata:
  origin: DCR local
  upstream_url: "https://github.com/openai/skills"
  imported_at: "2026-05-27"
  adapted_from: "OpenAI official skills catalog as baseline; DCR keeps only overlay/pipeline governance."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - copilot
    - cursor
    - windsurf
    - opencode
    - gemini-cli
---

# OpenAI Skills Catalog Audit

## 目的

DCR の skill catalog を OpenAI 公式 skills を土台にスリム化する。最初の目標は、約 140 skill を最終的に約 70 skill へ近づけるための分類と移行導線を作ること。

この skill は削除を実行しない。分類、優先順位、deprecation 候補、overlay 候補、pipeline 統合候補を出す。

## Baseline

- OpenAI official baseline: `openai/skills` とローカル OpenAI plugin cache
- 初回対象: curated / system / primary-runtime 相当
- 初回対象外: experimental
- DCR source-of-truth: `.ai/catalog/skills`
- Generated mirrors: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.agents/skills`

## 分類

| Classification | 意味 |
|---|---|
| `keep` | DCR 固有。正本/生成 mirror、proposal gate、Windows/PowerShell、Product 固有導線など |
| `replace-with-openai` | OpenAI official skill と重複し、公式 baseline へ寄せる候補 |
| `merge-into-overlay` | 公式 skill に DCR 固有観点だけを薄く足す候補 |
| `fold-into-pipeline` | 個別 skill より p/q/sh、QA、ship、drift、review pipeline へ畳む候補 |
| `deprecate` | 既に deprecated、または successor が明確な alias 候補 |

## 手順

1. `tools/audit-openai-skills.ps1` を実行する。
2. exact overlap を確認する。比較済み decision がある場合はそれを優先する。
3. DCR 固有 skill は `keep` または `merge-into-overlay` に残す。
4. QA / ship / review / drift / verification 系は `fold-into-pipeline` を優先する。
5. OpenAI official と同名の skill は内容比較前に deprecated 化しない。
6. `tools/deprecation-dashboard.ps1` を実行し、Stage 4 削除候補だけを物理削除候補にする。
7. `Removal eligible: 0` のときは、削除ではなく alias を寝かせて次の観測 window に回す。

## Exact overlap policy

同名 skill は自動置換しない。OpenAI official と名前が一致しても、DCR 側の `docs/dcr/*` パス、proposal/approval gate、source-of-truth/mirror governance、Windows/PowerShell 運用が残る場合は `merge-into-overlay` とする。

同名 overlay は、DCR 固有差分を frontmatter の `baseline.role: overlay` と `baseline.local_delta` に明記する。本文は OpenAI official の汎用手順を再コピーせず、DCR 固有の成果物、承認、検証、Windows/PowerShell 差分だけを保つ。

比較済みの初回 exact overlap は次の扱いにする。

| Skill | Decision | 理由 |
|---|---|---|
| `brainstorming` | `merge-into-overlay` | DCR の `docs/dcr/specs`、approval gate、spec reviewer loop を残す |
| `finishing-a-development-branch` | `merge-into-overlay` | OpenAI 側の worktree/detached-head detection を取り込みつつ、DCR ship gate を残す |
| `security-scan` | `merge-into-overlay` | 名前衝突。DCR は shallow config/secrets scan、OpenAI は full security orchestrator |
| `subagent-driven-development` | `merge-into-overlay` | OpenAI の continuous execution を取り込みつつ、DCR の approval/model routing を残す |
| `systematic-debugging` | `merge-into-overlay` | DCR の feedback-loop-first 補強と provenance を残す |
| `using-git-worktrees` | `merge-into-overlay` | OpenAI の native worktree/submodule guard を取り込みつつ、DCR workspace conventions を残す |
| `verification-before-completion` | `merge-into-overlay` | OpenAI の rationalization-prevention を取り込みつつ、DCR ship-gate contract を残す |
| `writing-plans` | `merge-into-overlay` | DCR の `docs/dcr/plans` と target metadata を残す |

## Pipeline consolidation wave

QA / ship / review / drift / security / performance 系は個別 skill を物理削除せず、`deprecated: true` と `successor: dcr-pipeline` で pipeline alias にする。旧本文は参照用に残し、routing は `dcr-pipeline` を優先する。

初回 pipeline alias:

| Successor | Former skills |
|---|---|
| `dcr-pipeline` | `code-review`, `contract-testing`, `data-pipeline-orchestration`, `mobile-cicd`, `mobile-performance`, `multimodal-pipeline`, `performance-profiling`, `security-deepdive`, `static-analysis`, `uat-verification-gate`, `webapp-testing`, `autonomous-qa-loop`, `model-debate-stress-test`, `supply-chain-security` |

## Growth umbrella wave

Growth 系は `growth-ops` を active umbrella にし、旧 skill は `deprecated: true` と `successor: growth-ops` で alias 化する。`j-quants` は金融データ連携の DCR 固有 skill として keep する。

初回 growth umbrella alias:

| Successor | Former skills |
|---|---|
| `growth-ops` | `ad-creative`, `ai-seo`, `analytics-tracking`, `churn-prevention`, `cold-email`, `competitor-alternatives`, `content-strategy`, `conversion-optimization-hub`, `copy-editing`, `copywriting`, `dcf-valuation`, `email-marketing-flow`, `email-sequence`, `form-cro`, `free-tool-strategy`, `launch-strategy`, `marketing-ideas`, `marketing-psychology`, `onboarding-cro`, `page-cro`, `paid-ads`, `paywall-upgrade-cro`, `persuasive-content-craft`, `popup-cro`, `pricing-strategy`, `product-analytics`, `product-marketing-context`, `programmatic-seo`, `referral-program`, `schema-markup`, `seo-audit`, `signup-flow-cro`, `social-content`, `strategic-messaging` |

## Documents umbrella wave

Documents 系は `documents-ops` を active umbrella にし、旧 skill は `deprecated: true` と `successor: documents-ops` で alias 化する。`writing-plans` は OpenAI Superpowers と DCR `docs/dcr/plans` overlay の exact overlap として active のまま残す。

初回 documents umbrella alias:

| Successor | Former skills |
|---|---|
| `documents-ops` | `adr-management`, `api-docs-automation`, `architecture-diagram-generator`, `canvas-design`, `doc-coauthoring`, `docs-update`, `docx`, `pdf`, `pptx`, `prd-to-issues`, `ubiquitous-language`, `x-research`, `xlsx` |

## Governance umbrella wave

Governance 系は DCR 中核を残し、外部由来・汎用 pattern だけを `governance-ops` に畳む。`harness-audit`、`unified-router`、`dcr-pipeline`、`mem-search`、`model-route`、`eval-harness`、`openai-skills-catalog-audit` は active overlay として残す。

初回 governance umbrella alias:

| Successor | Former skills |
|---|---|
| `governance-ops` | `advanced-evaluation`, `agent-evaluation`, `agent-overload-recovery`, `context-compression`, `context-degradation`, `context-optimization`, `decision-complete-planning`, `domain-decision-grilling`, `namespace-skill-routing`, `parallel-agent-patterns`, `parallel-wave-execution`, `phase-state-artifacts`, `rules-distill`, `strategic-compact` |

## Physical deletion wave

物理削除は OpenAI baseline 移行とは別の Stage 4 操作として扱う。`deprecated: true` と `successor` があるだけでは削除しない。

削除候補の条件:

- `tools/deprecation-dashboard.ps1` が `ELIGIBLE-FOR-REMOVAL` を返す
- `docs/deprecation-candidates.md` に候補として出る
- 直近 window の alias 呼び出しが 0
- 外部参照が 0
- `docs/deprecation-removed.md` に削除実績を追記できる

`Removal eligible: 0` のときは削除を進めず、alias を残して routing の安定性を観測する。

## コマンド

```powershell
.\tools\audit-openai-skills.ps1
.\tools\audit-openai-skills.ps1 -ShowCandidates
.\tools\audit-openai-skills.ps1 -AsJson
.\tools\deprecation-dashboard.ps1
.\tools\deprecation-dashboard.ps1 -OutputMarkdown
```

## 出力テンプレート

```markdown
OPENAI SKILLS CATALOG AUDIT
- baseline:
- DCR skills:
- OpenAI skills:
- exact overlaps:
- reviewed exact overlaps:
- deprecated pipeline aliases:
- deprecated growth umbrella aliases:
- deprecated documents umbrella aliases:
- deprecated governance umbrella aliases:
- Stage 4 removal candidates:
- target reduction:
- replace-with-openai:
- merge-into-overlay:
- fold-into-pipeline:
- keep:
- deprecate:
- next wave:
```
