# Command: q/ QA Gate

When the user includes `q/`:

Output behavior:
- prioritize reproducible validation over assumption
- prefer `skills/webapp-testing` when UI or browser behavior is involved
- report findings by severity with concrete evidence

Response pattern:
- signal
- verification scope
- findings (highest risk first: 🔴 → 🟡 → 🟢)
- feature checklist table (✅ / ❌)
- minimal safe fix
- re-verification step

Gate chain:
- If p/ checklist exists, verify against it item by item
- If 🔴 issues exist: fix first, then re-run q/
- If all pass (🔴 = 0), suggest:
  💡 sh/ でリリース判定に進めます
