# Rules Metadata Policy

## Purpose

`rules/*.md` remains the source of truth for specialist roles.
This file defines future metadata fields so routing and editor adapters
can improve without changing every consumer independently.

## Current policy

- Metadata is optional today
- Existing rule files remain valid without any metadata block
- Auto-routing must keep working from filename, title, and task context alone
- `deploy.ps1` skips `_*.md` files and generates Cursor `.mdc` files with safe defaults

## Asset taxonomy

- `rules/*.md`: invariant、routing metadata、handoff policy の正本
- `skills/*/SKILL.md`: reusable workflow、generator、analysis method の正本
- `.ai/agents-source/*`: runtime persona と execution specialist の正本
- One concern per layer: rule に step-by-step generator body を重複させず、skill に agent persona を埋め込まない

## Basename collision policy

- `rules/<name>.md` と `skills/<name>/SKILL.md` の basename は原則として重複させない
- workflow/generator を skill が担う場合、rule 側は `*-steward` や `*-auditor` など別 basename に分ける
- 一時的な移行 overlap が必要なら `validate.ps1` の allowlist で明示し、短期間で解消する

## Reserved fields

Use these field names when metadata is introduced:

- `domain`: main specialty, such as `frontend`, `security`, `seo`
- `routing_category`: parent bucket used by skill/router orchestration, such as `documents`, `growth`, `ui-ux`, `devops`, `governance`
- `risk`: default risk level, such as `low`, `medium`, `high`
- `artifacts`: primary targets, such as `tsx`, `api`, `docs`, `ads`
- `keywords`: short trigger terms used for routing
- `pair_with`: optional companion roles that are safe to combine
- `avoid_with`: roles that should not be auto-combined

## Skill contract fields

Skills (`skills/*/SKILL.md`) can declare a `contract:` block in their YAML frontmatter.
Contracts make implicit requirements and guarantees explicit, enabling pipeline-safe composition.

### Schema

```yaml
contract:
  preconditions:
    - "short statement of what must be true before this skill runs"
  postconditions:
    - "short statement of what this skill guarantees after execution"
  invariants:
    - "constraint that holds throughout execution"
```

### Semantics

- `preconditions`: checked by the skill-router before selecting this skill. If the current context does not satisfy a precondition, the router should either ask the user for missing info or choose a different skill.
- `postconditions`: used by the next skill in a pipeline to verify its own preconditions are met.
- `invariants`: constraints the skill must not violate during execution (e.g., permission boundaries).
- All fields are optional. Skills without `contract:` remain valid.
- `validate.ps1` checks that contract blocks (when present) contain only the three allowed keys and that values are non-empty lists.

### Example

```yaml
contract:
  preconditions:
    - "implementation plan or spec exists"
    - "target files are identified"
  postconditions:
    - "all checklist items verified with evidence"
    - "risk-ordered findings report produced"
  invariants:
    - "no destructive operations without P3 approval"
```

## Rules for future adoption

- Add metadata only when it improves routing or adapter generation
- Keep values short, explicit, and editor-agnostic
- Do not require metadata for every file before using the repository
- Prefer one main `domain` over multiple overlapping domains
- Use `routing_category` only for coarse parent routing, not fine-grained skill selection
- Keep automatic role selection capped at two roles even after metadata exists
- Store non-role documentation in `_*.md` files so deploy adapters can ignore it

## Naming policy (JP display + EN identifiers)

To keep deploy and validation stable across editors, use this split:

- Internal identifier fields stay English slug (`kebab-case`)
- Display language can be Japanese in title/body/description
- Do not localize folder names or frontmatter `name` values
- Prefer clear Japanese descriptions for discoverability in chat

Recommended pattern:

```yaml
name: pricing-strategy
description: 価格戦略の設計と改善を支援する
```

Not recommended:

```yaml
name: 価格戦略
description: Pricing strategy helper
```

## Example

```yaml
domain: frontend
routing_category: ui-ux
risk: medium
artifacts:
  - tsx
  - css
keywords:
  - react
  - nextjs
  - ui
pair_with:
  - ux-architect
avoid_with:
  - legal-compliance-checker
```

## Trait inheritance (`inherits:`)

Rules can declare which `_*.md` trait files they extend.
This replaces the informal "extends:" comment that some trait files already use.

### Available traits

| Trait file              | Purpose                                                       | Typical heirs                    |
| ----------------------- | ------------------------------------------------------------- | -------------------------------- |
| `_coding-standards`     | コードスタイル、セキュリティベースライン、品質チェックリスト  | コードを生成する全ロール         |
| `_testing-standards`    | テスト分類、TDD原則、カバレッジ目標                           | QA・テスト系ロール、実装系ロール |
| `_typescript-standards` | TS/JS 型システム、React 規約（`_coding-standards` を前提）    | フロントエンド・UI系ロール       |
| `_python-standards`     | PEP 8、型アノテーション、ツール（`_coding-standards` を前提） | AI・データ・ML系ロール           |
| `_git-conventions`      | Conventional Commits、ブランチ戦略、PR規約                    | コミット権限を持つロール         |

### Semantics

- `inherits:` is an ordered list of trait file basenames (without `_` prefix or `.md` extension)
- Traits listed earlier take priority when guidance conflicts
- A trait may itself declare a prerequisite via a comment (`extends: _coding-standards.md`) but the consuming rule must list the full chain explicitly
- Roles that do not produce code or commits may omit `inherits:` entirely
- `deploy.ps1` does not resolve inheritance at deploy time — traits are reference context loaded by the model at runtime
- `validate.ps1` checks that every value in `inherits:` corresponds to an existing `_<name>.md` file

### Example

```yaml
inherits:
  - coding-standards
  - typescript-standards
  - testing-standards
  - git-conventions
```

## Recommended routing categories

- `growth`: 集客・成長
- `documents`: 文書・資料
- `ui-ux`: UI/体験設計
- `devops`: 開発運用
- `governance`: ルール運用・監査・境界管理

These values are intentionally English slugs so deploy and validation remain stable across editors while labels shown to users can stay in Japanese.
`governance` は delivery や extension の domain でも、asset が実装手順ではなく invariant / traceability / boundary を定義する rule である場合に優先する。
`validate.ps1` は `routing_category` をこの推奨集合に対して検証する。

## Skill composition (`composable:`)

Skills can declare composition interfaces in their YAML frontmatter.
This enables the skill-router to chain skills declaratively as composite workflows.

### Operators

| Operator    | Syntax      | Meaning                                   |
| ----------- | ----------- | ----------------------------------------- |
| Sequence    | `A → B`     | A completes, output feeds B               |
| Parallel    | `A \|\| B`  | A and B run independently, results merged |
| Conditional | `A ? B : C` | If A succeeds run B, otherwise run C      |

### Schema

```yaml
composable:
  input_type: intent | spec | code | review | artifact
  output_type: spec | code | review | artifact | report
  chains_with:
    - skill-name
```

### Semantics

- `input_type`: what this skill expects to receive (from user or prior skill)
- `output_type`: what this skill produces (feeds the next skill or final output)
- `chains_with`: explicit list of skills this skill is known to compose well with
- Composition is validated at the router level: `A.output_type` must be compatible with `B.input_type`
- Skills without `composable:` remain standalone — the router will not auto-chain them
- `validate.ps1` checks that `chains_with` references existing skill directories

### Type compatibility matrix

| output_type ↓ → input_type → | intent | spec | code | review | artifact |
| ---------------------------- | ------ | ---- | ---- | ------ | -------- |
| intent                       | ✅      | ✅    | —    | —      | —        |
| spec                         | —      | ✅    | ✅    | —      | —        |
| code                         | —      | —    | ✅    | ✅      | ✅        |
| review                       | —      | ✅    | ✅    | —      | —        |
| artifact                     | —      | —    | —    | ✅      | ✅        |

### Predefined compositions

Standard workflow chains are defined in `.dcr/compositions.yaml`.
The skill-router references these when detecting multi-step intent.

### Example

```yaml
composable:
  input_type: intent
  output_type: spec
  chains_with:
    - writing-plans
    - code-review
```

## Adversarial review (`challenge:`)

Rules can declare adversarial relationships to enable automatic challenger workflows.
When a primary agent completes work, the router can auto-spawn a challenger agent for review.

## Lifecycle management (`deprecated:` / `prefer:`)

Rules and skills can declare lifecycle status to manage graceful transitions.

### Schema

```yaml
deprecated: true          # This rule/skill is deprecated
prefer: "new-rule-name"   # Replacement rule/skill name
sunset_date: "2025-09-01" # Planned removal date (optional)
```

### Semantics

- `deprecated: true` marks a rule/skill as no longer recommended
- `prefer` points to the replacement — the skill-router auto-substitutes it during selection
- `sunset_date` is the ISO date after which the rule/skill is hard-blocked from execution
- Rules/skills without `deprecated:` are assumed active
- `validate.ps1` warns on deprecated rules that lack a `prefer` value
- `validate.ps1` errors on rules past their `sunset_date` that have not been removed
- The skill-router shows `⚠️ [name] は非推奨です。代わりに [prefer] を推奨します。` when a deprecated rule is explicitly requested

Rules can declare adversarial relationships to enable automatic challenger workflows.
When a primary agent completes work, the router can auto-spawn a challenger agent for review.

### Schema

```yaml
challenge:
  targets:
    - role-name
  aspects:
    - "security" | "performance" | "correctness" | "architecture" | "ux"
  auto_trigger: on-completion | on-pr | manual
```

### Semantics

- `targets`: roles whose output this rule is qualified to challenge
- `aspects`: specific dimensions of quality this challenger focuses on
- `auto_trigger`: when the adversarial review fires
  - `on-completion`: automatically after the target role finishes
  - `on-pr`: when a PR is created from code produced by the target
  - `manual`: only when explicitly requested
- The challenged agent does not block the primary — it produces a separate findings report
- The skill-router presents adversarial findings with `⚔️` prefix to distinguish from primary output
- Adversarial pairs are also defined centrally in `.dcr/adversarial-pairs.yaml`
- Rules without `challenge:` are never auto-invoked as challengers

### Example

```yaml
challenge:
  targets:
    - backend-architect
    - frontend-developer
  aspects:
    - security
    - architecture
  auto_trigger: on-completion
```

## Skill packaging (`package:`)

Skills can declare packaging metadata for cross-repository sharing.
This enables a federated marketplace where skills are versioned, discovered, and installed.

### Schema

```yaml
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies: []
  tags:
    - "category-tag"
```

### Semantics

- `version`: semver string for the skill's current release
- `compat`: minimum DCR framework version required (currently informational)
- `exports`: files included when packaging (SKILL.md is always included)
- `dependencies`: other skills that must be present for this skill to function
- `tags`: discovery tags used by the federated registry
- Skills without `package:` are local-only and not listed in the registry
- `validate.ps1` checks that `dependencies` reference existing skill directories
- The registry manifest is maintained in `.dcr/registry.yaml`

### Example

```yaml
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies:
    - verification-before-completion
  tags:
    - planning
    - workflow
```

## Removed niche domains (history)

The following specialized domains were intentionally removed from `rules/` during consolidation.
Keep this list as a reintroduction checklist when requirements expand.

- game-audio-engineer
- game-designer
- level-designer
- narrative-designer
- technical-artist
- xr-cockpit-interaction-specialist
- xr-immersive-developer
- xr-interface-architect

Reintroduction criteria:

- Clear recurring demand exists in real requests
- A stable parent routing category is defined (or explicitly excluded from auto-routing)
- Metadata and router mapping are prepared before re-adding files
