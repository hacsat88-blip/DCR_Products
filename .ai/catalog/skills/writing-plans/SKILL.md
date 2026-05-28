---
name: writing-plans
routing_category: documents
description: "OpenAI writing-plans baseline with a thin DCR overlay for docs/dcr/plans artifacts, source-of-truth boundaries, Windows/PowerShell commands, and deploy/check/validate gates."
contract:
  preconditions:
    - "spec, requirements, or user request with clear goal exists"
  postconditions:
    - "implementation plan with numbered tasks and verification steps"
    - "file structure map with responsibilities"
  invariants:
    - "each task is independently testable and committable"
composable:
  input_type: spec
  output_type: spec
  chains_with:
    - tdd-workflow
    - subagent-driven-development
baseline:
  upstream: "openai/skills"
  role: overlay
  local_delta:
    - "docs/dcr/plans artifact path"
    - "DCR source-of-truth and mirror checks"
    - "PowerShell verification commands"
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies: []
  tags:
    - planning
    - workflow
targets:
  - vscode
  - cursor
  - claude
  - codex
runtime_targets:
  - codex
  - claude
  - copilot
  - cursor
  - windsurf
  - opencode
  - gemini-cli
---

# Writing Plans

## OpenAI Baseline Overlay

Use the OpenAI official writing-plans skill as the behavioral baseline. This DCR
overlay only defines local artifact, verification, and source-of-truth rules.

## Activation Boundary

- Use after a spec or clear goal exists and before implementation begins.
- The plan must be decision-complete: no hidden choices left for the implementer.
- For trivial one-step work, keep the plan inline instead of creating a file.

## DCR Local Delta

- Save durable plans under `docs/dcr/plans/YYYY-MM-DD-<feature-name>.md` unless the user specifies another location.
- Mark source-of-truth files separately from generated mirrors.
- Use PowerShell command forms for repo verification.
- Include generated-entrypoint verification when `.ai/catalog`, `.ai/book`, `.ai/kernel`, adapters, or templates change.

## Required Plan Shape

- Summary of the intended change.
- Key implementation tasks ordered by dependency.
- Files or subsystems only where needed to remove ambiguity.
- Verification commands and expected success signals.
- Explicit assumptions and out-of-scope items.

## Handoff

- For implementation, hand the plan to `dcr-pipeline` or `subagent-driven-development`.
- For catalog/routing changes, require `_SKILLS_ROUTING_INDEX.md`, `deploy.ps1`, `deploy.ps1 -Check`, and `validate.ps1` in the test plan.
