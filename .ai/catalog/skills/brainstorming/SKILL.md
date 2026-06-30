---
name: brainstorming
routing_category: governance
description: "OpenAI brainstorming baseline for creative design and intent clarification, with a thin DCR overlay for proposal gates, docs/dcr/specs artifacts, source-of-truth checks, and approval-before-implementation."
contract:
  preconditions:
    - "user request involves creating or modifying functionality"
  postconditions:
    - "clarified intent with acceptance criteria"
    - "design decision record or spec ready for writing-plans"
  invariants:
    - "no implementation code produced during brainstorming"
composable:
  input_type: intent
  output_type: spec
  chains_with:
    - writing-plans
    - dcr-pipeline
baseline:
  upstream: "openai/skills"
  role: overlay
  local_delta:
    - "DCR proposal gate"
    - "docs/dcr/specs artifact path"
    - "source-of-truth governance"
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies: []
  tags:
    - planning
    - ideation
runtime_targets:
  - codex
  - claude
  - cursor
---

# Brainstorming Ideas Into Designs

## OpenAI Baseline Overlay

Use the OpenAI official brainstorming skill as the behavioral baseline. This DCR
overlay only defines local boundaries and artifacts.

## Activation Boundary

- Use before creative or behavioral changes, including "small" config or UX changes.
- Do not write implementation code, scaffold files, or run mutating commands in this phase.
- If the user has already supplied an approved plan, skip to `writing-plans` or `dcr-pipeline`.

## DCR Local Delta

- Inspect the relevant source-of-truth first: `.ai/catalog`, `.ai/book`, `.ai/kernel`, app source, or docs.
- Turn ambiguity into a short design with acceptance criteria and non-goals.
- Save durable specs under `docs/dcr/specs/YYYY-MM-DD-<topic>-design.md` when the design needs to survive the thread.
- Keep generated mirrors out of the design source; they are refreshed by deploy.

## Handoff

- Ask for approval of the design before implementation.
- After approval, hand the spec to `writing-plans`.
- For broad repo changes, include the expected verification commands: routing index generation, `deploy.ps1`, `deploy.ps1 -Check`, and `validate.ps1`.
