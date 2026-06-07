---
name: systematic-debugging
routing_category: devops
description: "OpenAI systematic-debugging baseline with a thin DCR overlay for feedback-loop-first diagnosis, generated mirror drift, and Windows/PowerShell failure modes."
contract:
  preconditions:
    - "observable symptom or failing test exists"
  postconditions:
    - "root cause identified with evidence"
    - "minimal fix applied and verified"
  invariants:
    - "no speculative fixes without reproducing the issue first"
composable:
  input_type: code
  output_type: code
  chains_with:
    - verification-before-completion
    - dcr-pipeline
baseline:
  upstream: "openai/skills"
  role: overlay
  local_delta:
    - "DCR feedback-loop ordering"
    - "generated mirror drift checks"
    - "PowerShell/Windows diagnosis paths"
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies: []
  tags:
    - debugging
    - diagnosis
metadata:
  origin: superpowers + mattpocock/skills
  upstream_sources:
    - "superpowers/systematic-debugging"
    - "https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnose/SKILL.md"
  upstream_license: "mixed; preserve original notices when copying upstream text"
  imported_at: "2026-05-16"
  adapted_from: "diagnose feedback-loop pattern; no skills.sh installer or slash command imported."
  model_neutral: true
runtime_targets:
  - codex
  - claude
  - copilot
  - cursor
  - gemini-cli
---

# Systematic Debugging

## OpenAI Baseline Overlay

Use the OpenAI official systematic-debugging skill as the behavioral baseline.
This DCR overlay only adds repo-specific diagnosis seams.

## Activation Boundary

- Use for bugs, failing tests, build failures, drift failures, and unexpected behavior.
- Do not propose a fix until the symptom is reproduced or a clear artifact proves it.
- If the issue is a broad implementation/release gate, route through `dcr-pipeline`.

## DCR Local Delta

- Build the fastest reliable pass/fail loop first.
- For generated-entrypoint problems, classify each path as source-of-truth, generated mirror, or user-level mirror before changing anything.
- On Windows/PowerShell failures, preserve exact command, exit code, path, and permission context.
- Treat memory as a hint, not proof; current repo files and command output win.

## Handoff

- Apply the smallest fix that addresses the proven root cause.
- Verify with the command that reproduced the failure.
- For DCR catalog/mirror changes, follow with `deploy.ps1 -Check` and `validate.ps1`.
