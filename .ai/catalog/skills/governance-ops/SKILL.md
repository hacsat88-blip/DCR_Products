---
name: governance-ops
routing_category: governance
description: "Governance umbrella skill for evaluation, agent evaluation, agent overload recovery, context compression/degradation/optimization, decision-complete planning, domain decision grilling, namespace skill routing, parallel agent patterns, parallel wave execution, phase-state artifacts, rules distillation, and strategic compacting. Use this as the active DCR governance entrypoint for non-core governance patterns; DCR source-of-truth, routing, memory, model route, and harness audit skills remain active overlays."
contract:
  preconditions:
    - "governance, evaluation, context, planning, routing pattern, or parallel execution guidance is requested"
  postconditions:
    - "the request is routed to a compact governance lane without activating many narrow skills"
    - "DCR core source-of-truth and routing skills remain authoritative"
  invariants:
    - "do not replace DCR source-of-truth, proposal gate, routing index, or generated mirror governance"
    - "do not use umbrella guidance to bypass user approval, P2/P3 gates, or current-state verification"
composable:
  input_type: governance-brief
  output_type: governance-plan-or-checklist
  chains_with:
    - harness-audit
    - unified-router
    - dcr-pipeline
metadata:
  origin: DCR local
  imported_at: "2026-05-28"
  adapted_from: "DCR governance skill umbrella for OpenAI Skills baseline slimming."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - cursor
absorbs:
  - advanced-evaluation
  - agent-evaluation
  - agent-overload-recovery
  - context-compression
  - context-degradation
  - context-optimization
  - decision-complete-planning
  - domain-decision-grilling
  - namespace-skill-routing
  - parallel-agent-patterns
  - parallel-wave-execution
  - phase-state-artifacts
  - rules-distill
  - strategic-compact
---

# Governance Ops

OpenAI Skills baseline へのスリム化では、外部由来・汎用的な governance pattern を個別発火せず、この umbrella で受ける。旧 skill は本文を参照用に残し、routing は `governance-ops` を優先する。

DCR 中核の `harness-audit`、`unified-router`、`dcr-pipeline`、`mem-search`、`model-route`、`eval-harness`、`openai-skills-catalog-audit` は active overlay として残す。

## Lanes

| Lane | Former skills | 用途 |
|---|---|---|
| Evaluation | `advanced-evaluation`, `agent-evaluation` | rubric, eval strategy, agent behavior checks |
| Agent Load and Context | `agent-overload-recovery`, `context-compression`, `context-degradation`, `context-optimization`, `strategic-compact` | context health, summarization, degradation recovery, token pressure |
| Decision and Planning | `decision-complete-planning`, `domain-decision-grilling`, `phase-state-artifacts` | clarify tradeoffs, preserve phase state, make plans decision-complete |
| Routing Patterns | `namespace-skill-routing`, `rules-distill` | routing namespace hygiene and rule distillation |
| Parallel Work | `parallel-agent-patterns`, `parallel-wave-execution` | parallel agent decomposition and wave execution patterns |

## Flow

1. Identify whether the request is evaluation, context health, planning, routing hygiene, or parallel work.
2. Use active DCR core skills for source-of-truth checks, routing decisions, model routing, and deploy/validate gates.
3. Pull only the needed checklist or pattern from the former skill.
4. Produce a short plan, checklist, routing recommendation, or governance note.
5. Confirm which active DCR gate or verification command proves the outcome.

## Output Template

```markdown
GOVERNANCE OPS
- lane:
- decision:
- DCR core skill/gate:
- checklist:
- verification:
```
