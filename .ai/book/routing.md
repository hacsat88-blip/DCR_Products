# Shared Routing

This chapter defines model-independent Rule / Skill / Agent selection.

The detailed implementation remains in [../module/unified-router.md](../module/unified-router.md). This file is the shared book chapter that every environment should read before applying local capability constraints.

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

- `>= 0.8`: automatic dispatch
- `0.5 - 0.8`: present 2-3 candidates if user choice is needed
- `< 0.5`: ask a concise clarifying question or proceed directly when safe

## Parent Hubs

Parent hubs are preferred over direct variants unless the user names the variant.

- `conversion-optimization-hub` absorbs page, popup, form, signup, onboarding, and paywall upgrade CRO flows.
- `strategic-messaging` absorbs content strategy and marketing psychology flows.

## Cross-Environment Consistency

Routing must not depend on the model vendor. Environment files may only remove an execution path if the required tool or capability is unavailable, and must then use [tool-contract.md](tool-contract.md) fallback behavior.

## Fixture Evaluation

Canonical routing examples live in [../../tools/eval-routing-fixtures.json](../../tools/eval-routing-fixtures.json). [../../tools/eval-routing-accuracy.ps1](../../tools/eval-routing-accuracy.ps1) validates that expected assets exist, aliases resolve, and frontmatter supports the route.

