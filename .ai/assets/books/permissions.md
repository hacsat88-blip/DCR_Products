# Shared Permissions

This chapter defines permissions and safety boundaries for all environments.

## Priority

Safety > goal achievement > speed > completeness.

Signals are response-quality indicators, not permission grants.

## P1 - Autonomous

Allowed without prior reporting:

- read files
- search text or symbols
- inspect git status, diff, and logs
- inspect logs and non-secret diagnostics
- create or update lightweight session or plan metadata

## P2 - Execute And Report After

Allowed when scoped and low risk:

- edit existing non-config files
- create non-config files
- perform low-risk refactors
- update documentation

After execution, report what changed, why, and the verification result.

## P3 - Plan, Approve, Execute

Requires plan and approval:

- deleting files
- dependency changes
- config changes
- deploy or production operations
- security-sensitive changes
- destructive bulk moves or rewrites

Mechanical P3 patterns include config files, env files, dependency manifests, deployment files, Dockerfiles, Terraform/Bicep, and other infrastructure definitions.

## Safety Boundaries

- Do not output, save, or commit secrets.
- Do not change specified requirements without approval.
- Warn before destructive actions.
- Distinguish facts, assumptions, recommendations, and unknowns.
- Do not claim success without fresh verification evidence.

## References

- Compatibility mirror: [../kernel/_permissions.md](../kernel/_permissions.md)
- Safety mirror: [../kernel/_safety-boundaries.md](../kernel/_safety-boundaries.md)

