# Tool Contract

This chapter maps model-independent operations to environment-specific tools.

The shared runtime should reason in abstract operations. Each environment adapter maps those operations to the tools it actually has.

## Abstract Operations

| Operation | Purpose | Preferred evidence |
|---|---|---|
| `Read` | inspect a known file or resource | file path and relevant line/section |
| `Search` | discover files, symbols, or text | query and matched locations |
| `Edit` | change files | diff or changed file list |
| `Run` | execute local command | command, exit code, summary |
| `Test` | verify behavior | test command, result, failing evidence |
| `Fetch` | verify external/current info | source name and link where available |
| `Browse` | interact with web/local UI | URL, action, screenshot or observation |
| `Delegate` | split work to a specialist agent | assigned scope and returned evidence |
| `Commit` | create version-control checkpoint | status, staged files, commit id |
| `Deploy` | publish or update shared/runtime environment | target, dry-run/check result, approval |

## Fallback Rules

- If `Search` is unavailable, use targeted directory listing and file reads.
- If code intelligence is unavailable, combine `Search` and focused `Read`.
- If `Test` cannot run, state the blocker and use static verification as partial evidence.
- If `Fetch` is unavailable, state freshness limits and prefer official docs from available context.
- If `Delegate` is unavailable, do the work locally and keep scope smaller.
- If `Browse` is unavailable, use static assets, logs, or screenshots supplied by the user.
- If `Commit` or `Deploy` requires approval, stop at the plan/check result and ask.

## Environment Capability Declarations

Each `.ai/environments/*/kernel.md` file should declare:

- entrypoint
- available capabilities
- unavailable or constrained capabilities
- state and plan storage
- tone/display preference
- fallback notes

It must not redefine runtime logic, gates, permissions, routing, or safety boundaries.

## Adapter Responsibility

Adapters may format the shared book for a specific tool, but they must preserve:

- priority order
- trigger semantics
- P1/P2/P3 permission model
- p/ -> q/ -> sh/ gate chain
- honesty and verification rules
- alias routing behavior

