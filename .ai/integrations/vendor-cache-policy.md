# Vendor Cache Policy

Home and app vendor caches are not source of truth.

Examples include:

- `C:\Users\hacsa\.codex\plugins`
- `C:\Users\hacsa\.codex\anthropic-skills`
- `C:\Users\hacsa\.claude\plugins`
- Cursor extension folders

Rules:

- Do not import whole vendor caches into `.ai/`.
- Do not delete vendor caches as part of source consolidation unless the user explicitly approves cleanup.
- If a cache contains a useful pattern, classify it as `candidate-import`, extract the concept, and add it through `.ai/control-plane/source-registry.json` and source-of-truth files.
- Never read credential-like files while auditing caches.
