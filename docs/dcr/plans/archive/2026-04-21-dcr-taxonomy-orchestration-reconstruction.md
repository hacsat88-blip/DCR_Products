# DCR Taxonomy And Orchestration Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** taxonomy drift と orchestration drift を、repo 正本・generated mirror・user-level managed target の契約を壊さず段階的に是正する。

**Architecture:** まず docs と validate で contract を固定し、その後に pilot 対象を小さく修正する。rule は invariant へ、skill は workflow へ、agent source は execution persona へ寄せる。deploy 系 script は source-of-truth を増やさず consistency gate を強める。

**Tech Stack:** Markdown, YAML frontmatter, PowerShell validation/deploy scripts

---

## Current Status (2026-04-22)

- Task 1 から Task 4 までの pilot は repo 状態へ反映済みで、`validate.ps1` と `deploy.ps1 -Check` の clean evidence を取得済み。
- Task 5 は既存の coarse bucket vocabulary を維持しつつ、policy / boundary 型の rule を `governance` へ寄せる方針で進める。
- Task 7 は `deploy.ps1` に precheck / post-verify と managed target overwrite note を追加する形で反映済み。
- Task 8 は wider audit sweep の結果を audit spec へ反映し、[.ai/catalog/rules/agents-orchestrator.md](.ai/catalog/rules/agents-orchestrator.md) と [.ai/catalog/rules/repo-boundary-steward.md](.ai/catalog/rules/repo-boundary-steward.md) の rule persona / template residue を slim 化する形で反映済み。
- wider sweep では rule persona drift が少なくとも 49 files 規模で残ること、`orchestrator|coordinator` cluster が README を除いて 6 agent sources あることを確認し、generic coordination の canonical owner を `workflow-orchestrator` とする方向を固定した。
- Task 6 は、親 repo の index から tracked `Product/dexter-jp/**` を外しつつ、`.gitignore` で local runtime clone を残す形で完了した。
- generic coordinator consolidation は着手済みで、`workflow-orchestrator` を generic owner としたまま `multi-agent-coordinator`、`error-coordinator`、`it-ops-orchestrator` を distinct scope へ寄せた。
- coordination placeholder consolidation はさらに進み、`agent-installer`、`agent-organizer`、`context-manager`、`knowledge-synthesizer`、`performance-monitor`、`task-distributor` を distinct scope へ寄せた。
- wider rule persona batch slimming も着手済みで、`project-shepherd`、`sprint-prioritizer`、`feedback-synthesizer` を policy rule へ slim 化した。これら 3 files は current quick marker sweep では hit しない。
- wider rule persona batch slimming は次の workflow / experimentation slice へも広がり、`workflow-optimizer` と `experiment-tracker` を policy rule へ slim 化した。これら 2 files も current quick marker sweep では hit しない。
- wider rule persona batch slimming は reporting / finance / executive summary slice へも広がり、`analytics-reporter`、`finance-tracker`、`executive-summary-generator` を policy rule へ slim 化した。これら 3 files も current quick marker sweep では hit しない。
- 残件は ambiguous な `pied-piper` 単独と wider rule persona batch slimming へ移った。`pied-piper` は git history 上も bulk import 由来の追加しか見えず、意図復元なしに rewrite しない方針で一旦 defer する。

## File Structure

- Modify: `docs/dcr/instruction-governance.md`
- Modify: `README.md`
- Modify: `.ai/catalog/rules/_METADATA.md`
- Modify: `validate.ps1`
- Modify: `.ai/catalog/rules/architecture-diagram-steward.md`
- Modify: `.ai/catalog/skills/architecture-diagram-generator/SKILL.md`
- Modify: `.ai/catalog/rules/agents-orchestrator.md`
- Modify: `.ai/catalog/agents-source/workflow-orchestrator.md`
- Modify: `.ai/catalog/agents-source/workflow-orchestrator.toml`
- Modify: `.ai/catalog/rules/jira-workflow-steward.md`
- Modify: `.ai/catalog/rules/ai-prompt-manager-steward.md`
- Modify: `deploy.ps1`
- Modify: `.gitignore`
- Optional Modify: `tools/deploy-all.ps1`
- Modify: `.ai/catalog/skills/x-research/SKILL.md`
- Modify: `.ai/catalog/skills/dcf-valuation/SKILL.md`
- Optional Remove: tracked `Product/dexter-jp/**`

## Task 1: Freeze the taxonomy contract

**Files:**

- Modify: `docs/dcr/instruction-governance.md`
- Modify: `README.md`
- Modify: `.ai/catalog/rules/_METADATA.md`

- [x] **Step 1: Add explicit rule / skill / agent definitions**

Document what belongs in each asset class and what must stay out.

- [x] **Step 2: Split generated boundary wording**

Differentiate `in-repo generated` from `user-level managed target`.

- [x] **Step 3: Add user-level overwrite policy**

State that `%USERPROFILE%/.agents/skills`, `%USERPROFILE%/.cursor/rules`, and `%HOME%/.config/dcr/config.json` are deploy targets and will be overwritten by deploy.

- [x] **Step 4: Run validation**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

Expected: exit 0.

## Task 2: Add taxonomy drift checks to validate

**Files:**

- Modify: `validate.ps1`

- [x] **Step 1: Add basename collision detection**

Fail when the same basename exists in both `.ai/catalog/rules/` and `.ai/catalog/skills/` unless explicitly allowlisted.

- [x] **Step 2: Add routing policy checks**

Validate that `routing_category` values come from the documented set and that any exception is deliberate.

- [x] **Step 3: Add user-target consistency checks**

Add repo-local checks only: basename collisions, policy violations, and other taxonomy drift that can be evaluated without reading user home state.

- [x] **Step 4: Run validation**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

Expected: new checks run without false positives on unaffected files.

## Task 3: Resolve the architecture-diagram-generator collision

**Files:**

- Modify: `.ai/catalog/rules/architecture-diagram-steward.md`
- Modify: `.ai/catalog/skills/architecture-diagram-generator/SKILL.md`
- Modify: `.ai/catalog/rules/_ROUTING_INDEX.md` (generated)

- [x] **Step 1: Choose the canonical owner**

Keep the workflow/artifact generator in the skill layer.

- [x] **Step 2: Rename or slim the rule**

Either rename the rule to diagram policy guidance or reduce it to a narrow invariant rule with a distinct basename.

- [x] **Step 3: Regenerate routing outputs**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\generate-routing-index.ps1
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

Expected: no collision remains; routing index is up to date.

## Task 4: Split orchestration policy from execution persona

**Files:**

- Modify: `.ai/catalog/rules/agents-orchestrator.md`
- Modify: `.ai/catalog/agents-source/workflow-orchestrator.md`
- Modify: `.ai/catalog/agents-source/workflow-orchestrator.toml`
- Modify: `.ai/catalog/rules/jira-workflow-steward.md`

- [x] **Step 1: Reduce `agents-orchestrator` rule to policy**

Keep invariants, scope, and handoff expectations; remove long runtime templates and agent identity text.

- [x] **Step 2: Map execution ownership to the existing generic orchestrator**

Either reuse `.ai/catalog/agents-source/workflow-orchestrator.{md,toml}` as the canonical generic execution orchestrator, or define a full rename/deprecation migration that includes both Claude and Codex source pairs.

- [x] **Step 3: Slim `jira-workflow-steward`**

Retain Jira traceability invariants in the rule; decide separately whether a dedicated agent source is needed.

- [x] **Step 4: Run deploy and validation**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
powershell -ExecutionPolicy Bypass -File .\validate.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```

Expected:

- generated entrypoints update cleanly
- validate exits 0
- deploy check exits 0

## Task 5: Reclassify routing semantics if the new taxonomy requires it

**Files:**

- Modify: `.ai/catalog/rules/ai-prompt-manager-steward.md`
- Modify: `.ai/catalog/rules/jira-workflow-steward.md`
- Modify: `.ai/catalog/rules/_METADATA.md`

- [x] **Step 1: Decide the coarse bucket vocabulary**

Keep the current documented set and use `governance` for rule-level boundary / traceability assets, reserving `devops` for implementation-heavy operational roles.

- [x] **Step 2: Update affected rules**

Make the metadata reflect actual responsibility, not incidental implementation surface.

- [x] **Step 3: Re-run validation**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

Expected: metadata stays valid and routing docs remain coherent.

## Task 6: Decide the Product skill export policy

**Files:**

- Modify: `.ai/catalog/skills/x-research/SKILL.md`
- Modify: `.ai/catalog/skills/dcf-valuation/SKILL.md`
- Modify: `.gitignore`
- Optional Remove: tracked `Product/dexter-jp/**`
- Optional Modify: `docs/dcr/instruction-governance.md`

- [x] **Step 1: Promote shared-worthy Product skills**

Promote `x-research` and `dcf-valuation` into root `.ai/catalog/skills/` with canonical names and explicit preconditions.

- [x] **Step 2: Remove the tracked standalone clone from DCR source-of-truth**

Keep `Product/dexter-jp/` out of the repo by ignoring the path and removing the tracked subtree, while leaving any local ignored runtime clone untouched.

- [x] **Step 3: Verify search and deploy behavior**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```

Expected: the decision is explicit and no hidden skill island remains.

## Task 7: Harden deploy consistency gates

**Files:**

- Modify: `deploy.ps1`
- Optional Modify: `tools/deploy-all.ps1`

- [x] **Step 1: Add pre/post deploy checks**

Verify that generated assets and user-level targets reflect the current source-of-truth before claiming success.

- [x] **Step 2: Make overwrite semantics explicit in output**

Emit a concise note when user-level managed targets are updated.

- [x] **Step 3: Verify end-to-end**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

Expected: deploy output is clearer and checks still pass.

## Task 8: Execute a wider audit sweep

**Files:**

- Modify: `docs/dcr/specs/2026-04-21-dcr-taxonomy-orchestration-audit-design.md`
- Optional Modify: additional `.ai/catalog/rules/*.md`
- Optional Modify: additional `.ai/catalog/agents-source/*.md`

- [x] **Step 1: Search for rule persona bloat**

Review remaining rule files for agent-like identity text and long runtime templates.

- [x] **Step 2: Search for orchestrator overlap**

Review remaining orchestrator and coordinator agents for duplicate scopes.

- [x] **Step 3: Record each decision**

Update the audit spec with resolved findings and deferred items.

- [x] **Step 4: Final verification**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```

Expected: final state is documented and verified.

## Verification Commands

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\generate-routing-index.ps1
powershell -ExecutionPolicy Bypass -File .\validate.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```

## Success Criteria

- basename collision policy が validate で enforce される
- rule と agent の責務分離 pilot が少なくとも 1 件成立する
- user-level target の overwrite policy が文書化される
- Product skill island の扱いが明示される
- deploy / validate / deploy check の証拠で再構成を進められる
