# handoff

Purpose: prepare a concise handoff package for a remote/cloud Devin agent or another session.

## Guardrail

Do not initiate a cloud or remote handoff unless the user explicitly asks for handoff, cloud agent, remote agent, or remote Devin.

## Handoff Package

- Goal in one sentence
- Current branch and working-tree caveat without absolute local paths
- Files touched or likely touch points, using repo-relative paths
- Source-of-truth boundaries
- Commands already run and results
- Remaining tasks
- Known risks and blocked questions

## Remote-Agent Task Style

Use a short task title under 10-20 words. Put details in context only when the handoff tool supports it. Avoid absolute local filesystem paths.
