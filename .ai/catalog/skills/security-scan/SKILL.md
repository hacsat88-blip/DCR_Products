---
name: security-scan
routing_category: devops
description: "Shallow DCR catalog/config security overlay for secrets, permissions, injection risk, external packs, and source-of-truth replacement risks. Use OpenAI codex-security or dcr-pipeline for deep code security review."
audit_depth: shallow
audit_scope: config-and-secrets
sibling: security-deepdive
disable-model-invocation: true
baseline:
  upstream: "openai/skills"
  role: overlay
  local_delta:
    - "DCR catalog/config shallow scan"
    - "external skill/plugin collision checks"
    - "source-of-truth replacement guardrails"
contract:
  preconditions:
    - "The request matches this skill's description or routing category."
  postconditions:
    - "The response names the result, reasoning, and verification or handoff path."
  invariants:
    - "Do not treat generated mirrors or runtime caches as DCR source of truth."
composable:
  input_type: task
  output_type: artifact-or-decision
  chains_with:
    - verification-before-completion
runtime_targets:
  - codex
  - claude
  - cursor
---

# Security Scan

## OpenAI Baseline Overlay

Use OpenAI `codex-security:security-scan` as the full security baseline. This
DCR overlay is only the shallow catalog/config scan.

## Activation Boundary

- Use for rules, skills, adapters, hooks, MCP config, generated entrypoints, and external skill/plugin intake.
- Do not use this as the sole review for OWASP, authentication, crypto, dependency, or application-code security.
- Route deep security work to `dcr-pipeline` and the OpenAI security baseline.

## DCR Local Delta

- Check for hardcoded secrets, tokens, passwords, or local-only paths.
- Check excessive permissions, shell execution, install hooks, telemetry, and automatic writes.
- Check prompt/template injection surfaces in rules, skills, and generated files.
- Confirm external packs do not replace `.ai/catalog`, `.ai/kernel`, or `.ai/book` as source-of-truth.

## Output

```markdown
SECURITY SCAN: PASS/FAIL
- critical:
- high:
- medium:
- info:
- remediation:
```
