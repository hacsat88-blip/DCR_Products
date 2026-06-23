# 20 SOURCE

Purpose:
Point agents to the current canonical source files.

Machine-readable map:

- `.ai/20_SOURCE/source-layout.json`

Current primary sources:

- `.ai/assets/rules`
- `.ai/assets/skills`
- `.ai/assets/agents`
- `.ai/assets/books`
- `.ai/kernel`
- `.ai/core/modules`
- `.ai/environments`

Future and migrated physical source paths are mapped in
`.ai/compatibility/legacy-path-map.json`. Do not move additional assets into
`.ai/assets` or `.ai/core` until the map and validation scripts declare those
paths primary.
