# Shared Routing

This chapter defines model-independent Rule / Skill / Agent selection.
The routing experience should reduce cognitive load: shrink candidates, show the recommended path first, and keep detailed scoring in telemetry instead of the normal user response.

The detailed implementation remains in [../../core/modules/unified-router.md](../../core/modules/unified-router.md). This file is the shared book chapter that every environment should read before applying local capability constraints.

## Priority

1. Local personal settings, when present and non-conflicting with safety
2. Explicit user selection
3. Deprecated alias resolution
4. Routing category match
5. Keyword / description / domain match
6. Risk and phase fit
7. Direct processing when no asset has enough confidence

Skills win over rules when both match the same task, unless the user explicitly asks for a rule or role.

## Alias Resolution

If a requested rule, skill, or agent has `deprecated: true`, silently use its `successor` field and log the old name internally. User-facing reporting should name the successor.

## Confidence Bands

Confidence ranks candidates, but it does not by itself authorize execution.

- `auto`: P1 read-only, single clear candidate, low ambiguity, no external send.
- `propose`: multiple candidates, ambiguous intent, medium+ scale, or a Skill/Agent would materially help.
- `approve_required`: P2/P3, subagent, parallel orchestration, external MCP/API, config/deletion/dependency/security/finance/legal work.

When approval is required, present the recommended candidate first and wait for user confirmation before firing the Skill, Agent, subagent, or orchestration path.

## Cognitive Load Contract

- Show at most 3 user-facing candidates; prefer 1 recommended candidate when the route is clear.
- Use the shared proposal shape: `採用候補 / 理由 / 期待効果`, with `承認が必要な理由` only for `approve_required`.
- Add a short selection line when multiple paths are plausible: `A) おすすめで進める / B) 軽めに見る / C) 別案を見る`.
- Treat `それで`, `おすすめで`, `Aで`, `1で`, `進めて`, and `承認` as approval only when the previous proposal target is unambiguous.
- Treat `いい感じに`, `任せる`, `よさそう`, and `たぶん` as ambiguous; propose or reconfirm instead of firing.
- Store internal candidate count, status, selected option, and reply classification in `router-decisions.jsonl`.

## Agent Design Lens

12-factor-agents is treated as a principle source, not a runtime dependency.

- Keep prompts, routing, and approval rules owned by DCR source-of-truth files.
- Keep selection, approval, rejection, refinement, and execution visible through proposal state and router decision logs.
- Stop between asset selection and invocation when risk, scale, external send, or ambiguity requires approval.
- Prefer small focused agents; when a candidate is too broad, use parent hubs, display policy, or bundle proposal before adding more visible choices.

## Proposal State

When `.ai/kernel/gate-state.json` contains `proposal_state.status = proposed|refined`, short follow-up replies are interpreted as responses to the active proposal before normal routing.

- approve updates the active proposal to `approved` only when one option is clearly selected.
- reject updates it to `rejected` and does not fire anything.
- refine keeps the same proposal context and asks for an updated proposal.
- ambiguous keeps execution blocked and asks a short confirmation.

The active proposal lives in gitignored `gate-state.json`; durable audit history lives in `router-decisions.jsonl`.

## Parent Hubs

Parent hubs are preferred over direct variants unless the user names the variant.

- `conversion-optimization-hub` absorbs page, popup, form, signup, onboarding, and paywall upgrade CRO flows.
- `strategic-messaging` absorbs content strategy and marketing psychology flows.

## Cross-Environment Consistency

Routing must not depend on the model vendor. Environment files may only remove an execution path if the required tool or capability is unavailable, and must then use [tool-contract.md](tool-contract.md) fallback behavior.

## Fixture Evaluation

Canonical routing examples live in [../../../tools/eval-routing-fixtures.json](../../../tools/eval-routing-fixtures.json). [../../../tools/eval-routing-accuracy.ps1](../../../tools/eval-routing-accuracy.ps1) validates that expected assets exist, aliases resolve, and frontmatter supports the route.

