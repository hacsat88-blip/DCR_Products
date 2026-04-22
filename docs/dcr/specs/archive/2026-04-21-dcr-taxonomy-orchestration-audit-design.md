# DCR Taxonomy And Orchestration Audit Design

## Goal

rule / skill / agent / orchestration / pipeline / user-level config の境界を監査し、DCR の再構成方針を決める。

今回の成果物は次を 1 つの spec に統合する。

- 分類監査レポート
- 再構成方針
- user-level config への影響境界
- 優先順位付き変更候補

## Scope

### In Scope

- `.ai/catalog/rules/*.md`
- `.ai/catalog/skills/*/SKILL.md`
- `.ai/catalog/agents-source/*`
- `.dcr/config.json`
- `.dcr/templates/*`
- `deploy.ps1`
- `tools/deploy-all.ps1`
- `tools/adapters/*.ps1`
- `validate.ps1`
- `docs/dcr/*`
- user-level managed targets
  - `%USERPROFILE%/.agents/skills`
  - `%USERPROFILE%/.cursor/rules`
  - `%HOME%/.config/dcr/config.json`

### Out Of Scope

- `AppData/Local` 配下の runtime cache や editor 内部状態の直接再構成
- `AppData/Roaming/Code/User/workspaceStorage` のような session/runtime artifact の整理
- 個別 Product の機能実装そのもの

### Boundary Decision

今回の監査では user-level config までは扱うが、`AppData/Local` は direct managed target ではなく indirect runtime layer として扱う。

つまり、再構成の直接対象は repo 正本、repo 内生成物、`%USERPROFILE%` / `%HOME%` 配下の managed target に限定する。

## Current Strengths

現状の DCR はゼロから作り直す段階ではない。以下の基盤は既に機能している。

1. [docs/dcr/instruction-governance.md](docs/dcr/instruction-governance.md) と [docs/dcr/architecture/unified-adapter-system.md](docs/dcr/architecture/unified-adapter-system.md) で source-of-truth と generated の境界が定義されている。
2. [README.md](README.md) に source layer / generated layer / configuration layer の運用境界が明記されている。
3. [validate.ps1](validate.ps1) は `inherits:`, `contract:`, `composable.chains_with`, `challenge.targets`, `package.dependencies` に加え、rule / skill basename collision と `routing_category` の allowed-set まで検証している。
4. [deploy.ps1](deploy.ps1) と [tools/deploy-all.ps1](tools/deploy-all.ps1) により、repo 正本から複数 editor へ一方向同期する構造は成立している。
5. `architecture-diagram-steward`, `agents-orchestrator`, `jira-workflow-steward` の pilot slimming はすでに landed しており、taxonomy 再構成の方向性に実証がある。

したがって、今回の主題は全面再設計ではなく taxonomy drift と orchestration drift の是正である。

## Approaches

### Option A: 1 Layer へ統合する

rule / skill / agent を 1 種類の asset に寄せる。

利点:

- 名前空間衝突は消える
- adapter 実装は単純化しやすい

欠点:

- 現在の repo と配布先の互換性を大きく壊す
- 既存 docs / deploy / validate の前提が広く崩れる
- 「不変条件」「手順」「自律実行」の区別が曖昧になる

### Option B: 3 Layer を維持し、契約を厳密化する

rule / skill / agent を残しつつ、分類基準、命名衝突、orchestrator の責務、user-level target の扱いを明確化する。

利点:

- 既存配布モデルを保ったまま drift を縮小できる
- validate と deploy の延長で安全に導入できる
- repo 境界の思想と整合する

欠点:

- 一気に綺麗にはならず、段階移行が必要

### Option C: Agent First で再編する

rule と skill を agent 中心に再編し、orchestrator に集約する。

利点:

- 自律実行の UX は派手になりやすい

欠点:

- governance と runtime persona が再び混ざる
- 現在の drift の根本原因を悪化させやすい

## Recommendation

**Option B を推奨する。**

理由:

1. 既存の source-of-truth / generated / user-level target の配布契約を壊さずに改善できる。
2. 今回見えた問題は taxonomy 自体の不在ではなく、taxonomy と実ファイル内容のズレである。
3. pilot 単位で修正し、`validate.ps1` と `deploy.ps1 -Check` で証拠を取りながら進められる。

## Audit Axes

今回の監査では、各 asset を次の 6 軸で判定する。

| Axis                    | Question                                                                 | Good State                                    |
| ----------------------- | ------------------------------------------------------------------------ | --------------------------------------------- |
| Taxonomy role           | これは invariant / workflow / autonomous persona のどれか                | rule / skill / agent のいずれかに自然に収まる |
| Namespace               | basename が他分類と衝突していないか                                      | 1 つの名前が 1 つの主責務を表す               |
| Routing semantics       | `domain` と `routing_category` が意味的に噛み合うか                      | router が誤解しない                           |
| Orchestration ownership | orchestration を誰が持つか明確か                                         | rule は policy、agent は execution            |
| Boundary                | repo 正本 / repo 生成物 / user-level target / runtime が分離されているか | 直接編集経路が明確                            |
| Validation              | drift を script で検出できるか                                           | validate / deploy check で裏付け可能          |

## Classification Contract

### Rule

rule は常時守るべき不変条件、粗いルーティング情報、禁止事項、判断原則を持つ。

rule に入れてよいもの:

- invariant
- routing metadata
- non-goals
- cross-session で変えにくい判断基準

rule に入れないもの:

- 長い人格演技
- 完全な作業手順の本体
- runtime status template
- domain 専用 orchestrator の詳細実装

### Skill

skill は再利用可能な workflow、artifact generator、analysis method を持つ。

skill に入れてよいもの:

- step-by-step process
- input/output contract
- decision table
- deliverables
- reusable templates

skill に入れないもの:

- always-on governance policy
- agent persona
- editor 固有 runtime 挙動

### Agent Source

agent source は自律実行する persona、専門領域、handoff 前提、stop condition を持つ。

agent に入れてよいもの:

- concise persona
- primary focus
- handoff rules
- execution boundaries

agent に入れないもの:

- repo 共通 invariant の本体
- 長い deploy / validate 契約
- generated path の設計仕様

### Pipeline / Adapter Contract

pipeline / adapter は role ではなく execution contract である。

したがって、次は script / docs 側へ寄せる。

- 生成順序
- deploy 先
- overwrite policy
- validation gate
- user-level target の扱い

## Findings

### Finding 1: rule / skill basename collision がある

対象:

- [.ai/catalog/rules/architecture-diagram-steward.md](.ai/catalog/rules/architecture-diagram-steward.md)
- [.ai/catalog/skills/architecture-diagram-generator/SKILL.md](.ai/catalog/skills/architecture-diagram-generator/SKILL.md)

問題:

もともとは同一 basename が rule と skill の両方に存在し、分類より先に名前が衝突していた。pilot 修正では rule を `architecture-diagram-steward` へ分離し、workflow owner を skill に固定する。

判断:

- skill を primary artifact とする
- rule は distinct basename の diagram policy へ縮小する

### Finding 2: rule の中に agent persona が入り込み過ぎている

対象:

- [.ai/catalog/rules/agents-orchestrator.md](.ai/catalog/rules/agents-orchestrator.md)
- [.ai/catalog/rules/jira-workflow-steward.md](.ai/catalog/rules/jira-workflow-steward.md)

問題:

両者とも rule でありながら、agent personality、identity、mission、status report template まで抱えている。これは invariant より runtime persona の性質が強く、rule と agent の境界を曖昧にする。

判断:

- rule は policy へ縮小する
- agent が要る場合は `.ai/catalog/agents-source/` へ寄せる

### Finding 3: orchestrator が rule と agent source に分散している

対象:

- [.ai/catalog/rules/agents-orchestrator.md](.ai/catalog/rules/agents-orchestrator.md)
- `.ai/catalog/agents-source/workflow-orchestrator.{md,toml}`
- [.ai/catalog/agents-source/ai-prompt-manager-orchestrator.md](.ai/catalog/agents-source/ai-prompt-manager-orchestrator.md)
- [.ai/catalog/agents-source/architecture-diagram-orchestrator.md](.ai/catalog/agents-source/architecture-diagram-orchestrator.md)
- [.ai/catalog/agents-source/it-ops-orchestrator.md](.ai/catalog/agents-source/it-ops-orchestrator.md)

問題:

cross-cutting orchestration policy と domain-specific coordinator が同じ「orchestrator」語で共存しているが、canonical owner が定義されていない。

判断:

- cross-cutting orchestration invariant は rule
- domain-specific coordinator は agent source
- runtime template は rule から排出する

### Finding 4: routing semantics は再整理余地がある

対象:

- [.ai/catalog/rules/ai-prompt-manager-steward.md](.ai/catalog/rules/ai-prompt-manager-steward.md)
- [.ai/catalog/rules/jira-workflow-steward.md](.ai/catalog/rules/jira-workflow-steward.md)

観測:

`jira-workflow-steward` はすでに `routing_category: governance` へ移っており、`ai-prompt-manager-steward` も implementation workflow ではなく change boundary と回帰境界を定義する rule である。したがって、少なくとも current pilot scope では新しい coarse bucket を増やさず、`governance` を優先してよい。

判断:

- 既存の coarse bucket vocabulary は維持する
- delivery / extension の domain でも、rule が invariant と boundary を定義するだけなら `governance` を使う
- `devops` は implementation-heavy operational role へ寄せる

### Finding 5: Product 側に skill island がある

対象:

- [.ai/catalog/skills/x-research/SKILL.md](.ai/catalog/skills/x-research/SKILL.md)
- [.ai/catalog/skills/dcf-valuation/SKILL.md](.ai/catalog/skills/dcf-valuation/SKILL.md)

問題:

もともと `Product/dexter-jp/src/skills/...` にあった skill 形式 asset は shared registry の外にあり、global skill inventory と adapter chain から見えなかった。これは product-local というより export policy 未定義の状態だった。

判断:

- shared 化する skill は `.ai/catalog/skills/` へ昇格する
- standalone CLI clone 自体は DCR repo の正本から外し、local clone として扱う
- 親 repo では tracked `Product/dexter-jp/**` を index から外し、`.gitignore` で local runtime clone を保持する

### Finding 6: user-level target は direct managed path である

対象:

- [deploy.ps1](deploy.ps1)
- [README.md](README.md)
- [docs/dcr/instruction-governance.md](docs/dcr/instruction-governance.md)

観測:

- top-level deploy は `%USERPROFILE%/.agents/skills` を直接更新する
- top-level deploy は `%USERPROFILE%/.cursor/rules` を直接更新する
- top-level deploy は `%HOME%/.config/dcr/config.json` を同期対象に持つ

問題:

これらは runtime cache ではなく managed target だが、その overwrite policy が設計文書上で弱い。手編集が次回 deploy で消えることを user-level contract として明記する必要がある。

判断:

- user-level target は generated 扱いとして文書化する
- `AppData/Local` とは明確に分離する

### Finding 7: repo 内 generated mirror と user-level generated mirror の区別が弱い

対象:

- [README.md](README.md)
- [docs/dcr/instruction-governance.md](docs/dcr/instruction-governance.md)

問題:

repo 内 generated mirror と `%USERPROFILE%` 配下 managed target の差は script を読むと分かるが、運用文書では十分に強調されていない。

判断:

- generated を `in-repo generated` と `user-level generated target` に分けて記述する

### Finding 8: validate は強いが、taxonomy-specific drift 検出はまだ弱い

対象:

- [validate.ps1](validate.ps1)

観測:

`validate.ps1` は `inherits`, `contract`, `composable.chains_with`, `challenge.targets`, `package.dependencies` に加え、rule / skill basename collision と `routing_category` allowed-set を検証している。

不足:

- agent / role naming collision のような taxonomy drift
- `domain` と `routing_category` の deeper matrix
- deploy / validate をまたぐ managed target consistency の説明強化

判断:

- validate を捨てず、repo-local taxonomy drift detector を段階拡張する方向で進める
- user-level target の整合性は `deploy.ps1 -Check` 側で扱う

### Finding 9: wider rule persona drift は catalog 全体に残っている

対象:

- `.ai/catalog/rules/*.md` の wider sweep

観測:

PowerShell sweep では、`Agent Personality`、`Identity & Memory`、`Your Core Mission`、first-person runtime prompt などの marker を持つ rule が少なくとも 49 ファイル規模で残っていた。

追加観測:

first project / product / governance batch として [.ai/catalog/rules/project-shepherd.md](.ai/catalog/rules/project-shepherd.md)、[.ai/catalog/rules/sprint-prioritizer.md](.ai/catalog/rules/sprint-prioritizer.md)、[.ai/catalog/rules/feedback-synthesizer.md](.ai/catalog/rules/feedback-synthesizer.md) を slim 化した結果、これら 3 files は current quick marker sweep (`Agent Personality`, `Identity & Memory`, `Your Core Mission`, `Role Definition`) では hit しなくなった。一方で exact な残数は marker set に依存するため、ここでは systemic drift という結論を優先し、単一カウントの再ベースラインは保留する。

subsequent workflow / experimentation batch として [.ai/catalog/rules/workflow-optimizer.md](.ai/catalog/rules/workflow-optimizer.md) と [.ai/catalog/rules/experiment-tracker.md](.ai/catalog/rules/experiment-tracker.md) も slim 化した結果、これら 2 files も current quick marker sweep では hit しなくなった。

代表例:

- [.ai/catalog/rules/accessibility-auditor.md](.ai/catalog/rules/accessibility-auditor.md)
- [.ai/catalog/rules/ai-engineer.md](.ai/catalog/rules/ai-engineer.md)
- [.ai/catalog/rules/backend-architect.md](.ai/catalog/rules/backend-architect.md)
- [.ai/catalog/rules/developer-advocate.md](.ai/catalog/rules/developer-advocate.md)
- [.ai/catalog/rules/devops-automator.md](.ai/catalog/rules/devops-automator.md)

問題:

persona bloat は orchestrator 系の局所問題ではなく、legacy catalog 全体に残る taxonomy drift である。rule が invariant ではなく runtime persona と long-form coaching prompt を抱えているため、rule / agent source の境界が still blurry なままになっている。

判断:

- wider sweep の結論は `few exceptions` ではなく `systemic legacy drift` として扱う
- remediation は domain batch 単位で進め、無差別な一括 rewrite は行わない
- governance / boundary rule を先に slim 化し、implementation-heavy catalog は別 batch へ送る

### Finding 10: orchestrator / coordinator agent source には generic overlap cluster がある

対象:

- [.ai/catalog/agents-source/workflow-orchestrator.md](.ai/catalog/agents-source/workflow-orchestrator.md)
- [.ai/catalog/agents-source/multi-agent-coordinator.md](.ai/catalog/agents-source/multi-agent-coordinator.md)
- [.ai/catalog/agents-source/error-coordinator.md](.ai/catalog/agents-source/error-coordinator.md)
- [.ai/catalog/agents-source/it-ops-orchestrator.md](.ai/catalog/agents-source/it-ops-orchestrator.md)
- [.ai/catalog/agents-source/ai-prompt-manager-orchestrator.md](.ai/catalog/agents-source/ai-prompt-manager-orchestrator.md)
- [.ai/catalog/agents-source/architecture-diagram-orchestrator.md](.ai/catalog/agents-source/architecture-diagram-orchestrator.md)

観測:

initial sweep では README を除いて 6 agent source を返し、このうち `ai-prompt-manager-orchestrator` と `architecture-diagram-orchestrator` は domain-specific な primary focus を持つ一方、`workflow-orchestrator`、`multi-agent-coordinator`、`error-coordinator`、`it-ops-orchestrator` は description と working rules がほぼ同型だった。その後の differentiation slice で `workflow-orchestrator` を generic owner に残し、`multi-agent-coordinator`、`error-coordinator`、`it-ops-orchestrator` は distinct scope へ寄せた。

追加観測:

subsequent differentiation で `agent-installer`、`agent-organizer`、`context-manager`、`knowledge-synthesizer`、`performance-monitor`、`task-distributor` は basename に沿った distinct scope へ寄せた。exact な placeholder wording が残るのは `pied-piper` と、canonical generic owner として意図的に broad wording を残した `workflow-orchestrator` だけになった。

問題:

named orchestrator cluster と clear-name placeholder family の ambiguity は大きく減ったが、`pied-piper` は basename だけでは責務が判別しづらく、catalog discovery と future routing の両方で ambiguity が残る。

補足:

`git log --follow` と `git blame` で見える履歴は bulk import commit に留まり、`pied-piper` 固有の意図を回収できなかった。このため、現時点では推測ベースの差別化より defer の方が安全である。

判断:

- generic coordination の canonical owner は [.ai/catalog/agents-source/workflow-orchestrator.md](.ai/catalog/agents-source/workflow-orchestrator.md) とする
- `multi-agent-coordinator`、`error-coordinator`、`it-ops-orchestrator` は initial differentiation 済みとして retained する
- `agent-installer`、`agent-organizer`、`context-manager`、`knowledge-synthesizer`、`performance-monitor`、`task-distributor` は differentiated 済みとして retained する
- `pied-piper` は naming clarification か deprecation plan が無い限り overlap candidate として扱う
- domain-specific orchestrator は retained してよいが、generic coordination wording を減らして役割差を明示する

## Resolved Pilot Decisions (2026-04-22)

- `architecture-diagram-generator` collision は、rule を [.ai/catalog/rules/architecture-diagram-steward.md](.ai/catalog/rules/architecture-diagram-steward.md) へ分離し、generator workflow の owner を skill 側へ固定して解消した。
- [.ai/catalog/rules/agents-orchestrator.md](.ai/catalog/rules/agents-orchestrator.md) は policy rule へ縮小し、generic execution ownership は `.ai/catalog/agents-source/workflow-orchestrator.{md,toml}` に委譲した。
- [.ai/catalog/rules/jira-workflow-steward.md](.ai/catalog/rules/jira-workflow-steward.md) は slimmed rule として維持し、`routing_category: governance` へ再分類した。
- [.ai/catalog/rules/repo-boundary-steward.md](.ai/catalog/rules/repo-boundary-steward.md) は workflow/template-heavy rule から boundary policy rule へ slim 化し、execution workflow の owner を [.ai/catalog/skills/repo-boundary-hygiene/SKILL.md](.ai/catalog/skills/repo-boundary-hygiene/SKILL.md) へ固定した。
- user-level overwrite policy は [docs/dcr/instruction-governance.md](docs/dcr/instruction-governance.md) に明文化し、managed target と runtime cache の境界を固定した。
- [.ai/catalog/rules/ai-prompt-manager-steward.md](.ai/catalog/rules/ai-prompt-manager-steward.md) は `domain: extension` を維持したまま `routing_category: governance` へ揃える。
- wider sweep の結果、rule persona drift は 49 rule files に残る systemic issue と判定し、generic coordinator overlap は `workflow-orchestrator` を canonical owner とする方向で整理した。
- `workflow-orchestrator` は generic owner として明示し、`multi-agent-coordinator`、`error-coordinator`、`it-ops-orchestrator` は multi-agent dispatch / failure recovery / IT ops runbook へそれぞれ scope を寄せた。
- `agent-installer`、`agent-organizer`、`context-manager`、`knowledge-synthesizer`、`performance-monitor`、`task-distributor` は installation / catalog organization / context recovery / synthesis / performance tracking / task decomposition へそれぞれ scope を寄せた。
- [.ai/catalog/rules/project-shepherd.md](.ai/catalog/rules/project-shepherd.md)、[.ai/catalog/rules/sprint-prioritizer.md](.ai/catalog/rules/sprint-prioritizer.md)、[.ai/catalog/rules/feedback-synthesizer.md](.ai/catalog/rules/feedback-synthesizer.md) は長い persona / template body を落とし、scope boundary と invariant に寄せた first project/product/governance batch として反映した。
- [.ai/catalog/rules/workflow-optimizer.md](.ai/catalog/rules/workflow-optimizer.md) と [.ai/catalog/rules/experiment-tracker.md](.ai/catalog/rules/experiment-tracker.md) は長い persona / template body を落とし、workflow / experimentation の判断基準を rule 本体へ残す second adjacent batch として反映した。
- [.ai/catalog/rules/analytics-reporter.md](.ai/catalog/rules/analytics-reporter.md)、[.ai/catalog/rules/finance-tracker.md](.ai/catalog/rules/finance-tracker.md)、[.ai/catalog/rules/executive-summary-generator.md](.ai/catalog/rules/executive-summary-generator.md) は reporting / finance / executive summary の判断基準だけを rule 本体へ残す third adjacent batch として反映した。これら 3 files も current quick marker sweep では hit しない。
- tracked `Product/dexter-jp/**` は親 repo の index から removal を staged し、`.gitignore` 下の local runtime clone を残す形で DCR 正本から外した。

## External Boundary Inventory

| Path Class                | Paths                                                                                                                                                          | Notes                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Source of truth           | `.ai/catalog/rules/`, `.ai/catalog/skills/`, `.ai/catalog/agents-source/`, `.ai/kernel/`, `.ai/module/`, `.dcr/config.json`, `.dcr/templates/`, `templates/`   | 変更はここから始める           |
| In-repo generated         | `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/*.mdc`, `.claude/agents/`, `.codex/agents/`, `.ai/catalog/rules/_ROUTING_INDEX.md` | repo 内 mirror。直接編集しない |
| User-level managed target | `%USERPROFILE%/.agents/skills`, `%USERPROFILE%/.cursor/rules`, `%HOME%/.config/dcr/config.json`                                                                | deploy が直接上書きする        |
| Local overrides           | `CLAUDE.local.md`, `.claude/settings.local.json`                                                                                                               | Git 管理外の個人設定           |
| Runtime / cache           | `AppData/Local`, `workspaceStorage`, editor cache                                                                                                              | 今回の再構成対象外             |

## Reconstruction Direction

### 1. Name Collision Policy

同一 basename を cross-class で使わない。

許容する例外:

- generated mirror の prefix 差分

許容しない例:

- `.ai/catalog/rules/foo.md` と `.ai/catalog/skills/foo/SKILL.md`

### 2. Rule Slimming Policy

rule から次を除外する。

- 長い persona
- full workflow body
- report template 本体
- domain-specific execution choreography

rule は以下に集中する。

- invariant
- routing metadata
- scope boundary
- non-goals

### 3. Orchestrator Policy

`orchestrator` を名乗る asset は次のいずれかに限定する。

- policy orchestrator: rule
- execution orchestrator: agent source

1 つの asset が両方を持たない。

### 4. Product Export Policy

Product 側の skill 形式 asset は次のどちらかへ明示分類する。

- product-local and not exported
- shared candidate and scheduled for promotion to `.ai/catalog/skills/`

放置して第 3 の状態を作らない。

### 5. User-Level Target Policy

`%USERPROFILE%/.agents` と `%USERPROFILE%/.cursor` と `%HOME%/.config/dcr` は local source ではなく deploy target とする。

このため、再構成時のリスクは次の通り。

- path を変えると user environment の即時 break を起こしうる
- generated file 名を変えると旧 managed file cleanup が必要
- 誤った deploy は repo だけでなく user environment にも波及する

## Remaining Priority Candidates

| Priority | Candidate                            | Direction                                                                           | Risk   |
| -------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ------ |
| P1       | deploy consistency gate              | add clearer overwrite messaging and stronger pre/post checks in deploy path         | medium |
| P2       | taxonomy drift expansion in validate | add agent / rule naming collision checks and optional category-domain matrix        | low    |
| P2       | generic coordinator consolidation    | clarify or retire the remaining ambiguous `pied-piper` around workflow-orchestrator | medium |
| P2       | wider rule persona batch slimming    | slim the remaining 49 rule files in reviewable domain batches                       | medium |

## Rollout Strategy

### Phase 1: Contract First

- fix spec / docs / naming policy
- add validation for collision and boundary drift

### Phase 2: Pilot Reclassification (completed)

- resolve `architecture-diagram-generator`
- split `agents-orchestrator`
- slim `jira-workflow-steward`
- reclassify `ai-prompt-manager-steward` to `governance`

### Phase 3: Boundary Hardening

- document user-level overwrite policy
- clarify Product skill export path
- harden deploy consistency gates

### Phase 4: Wider Audit Sweep

- review remaining rule files for persona bloat
- review remaining orchestrator agents for overlap
- extend taxonomy drift detection where false-positive risk stays low

## Acceptance Criteria

- rule / skill / agent の役割分担を 1 ページで説明できる
- user-level managed target と runtime cache を混同しない
- basename collision を validate で検出できる方針が定まる
- priority candidate がリスク順に並び、pilot から着手できる
- `AppData/Local` を直接いじらずに再構成方針を進められる