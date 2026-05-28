---
name: verification-before-completion
routing_category: devops
description: "OpenAI verification-before-completion baseline with a thin DCR overlay for deploy/check/validate evidence, generated mirror drift evidence, and P3 approval constraints."
contract:
  preconditions:
    - "implementation work is believed to be complete"
  postconditions:
    - "all verification commands executed with captured output"
    - "pass/fail status confirmed with evidence"
  invariants:
    - "never claim success without running verification commands"
    - "no P3 operations without explicit approval"
composable:
  input_type: code
  output_type: report
  chains_with:
    - dcr-pipeline
baseline:
  upstream: "openai/skills"
  role: overlay
  local_delta:
    - "DCR deploy/check/validate evidence"
    - "generated mirror drift evidence"
    - "P3 approval constraints"
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies: []
  tags:
    - verification
    - quality
---

# Verification Before Completion

## OpenAI Baseline Overlay

Use the OpenAI official verification-before-completion skill as the behavioral
baseline. This DCR overlay only adds local proof requirements.

## Activation Boundary

- Use before claiming work is done, fixed, deployed, synced, or safe.
- Do not rely on prior runs, generated text, or agent reports as proof.
- If verification requires deletion, push, external write, or P3 action, confirm approval first.

## DCR Local Delta

- For catalog/routing changes, verify `_SKILLS_ROUTING_INDEX.md`, `deploy.ps1`, `deploy.ps1 -Check`, and `validate.ps1`.
- For generated mirrors, report whether drift is in tracked entrypoints or user-level mirrors.
- For Windows permission failures, state whether the rerun required elevated/out-of-sandbox execution.

## Output

Report each command with pass/fail status, the relevant count or success line, and any residual risk. If a command was skipped, state why.
