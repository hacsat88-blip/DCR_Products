# DCR Intent Log Schema
#
# Records which skills/rules were selected per request,
# enabling learning-based routing weight adjustment.
#
# Location: .dcr/intent-log.jsonl (JSON Lines format)
# Each line is one routing decision record.

## Record Schema

```jsonc
{
  // ISO 8601 timestamp
  "ts": "2026-04-10T14:30:00+09:00",

  // User intent summary (1 line, no PII)
  "intent": "frontendのレスポンシブ対応を修正",

  // Routing category matched
  "category": "ui-ux",

  // Candidates proposed (ordered by score)
  "candidates": [
    { "name": "frontend-developer", "score": 12, "type": "rule" },
    { "name": "ui-ux-pro-max", "score": 9, "type": "skill" }
  ],

  // Final selection
  "selected": "frontend-developer",

  // How was it selected
  "route": "orchestration",  // "orchestration" | "direct" | "fallback"

  // Outcome (filled post-execution, nullable)
  "outcome": "success",      // "success" | "partial" | "miss" | null

  // Phase at time of routing
  "phase": "sprint-mid",

  // Optional: user override (if user changed the selection)
  "override": null            // skill/rule name if overridden, null otherwise
}
```

## Aggregation

`tools/aggregate-intent.ps1` reads `.dcr/intent-log.jsonl` and produces:

1. **Frequency table**: skill/rule → selection count
2. **Success rate**: skill/rule → success / total
3. **Override rate**: skill/rule → override count / selection count
4. **Category accuracy**: category → correct first-pick rate
5. **Weight suggestions**: adjustments to base scoring weights based on outcomes

## Weight Adjustment Formula

For each skill/rule `s`:

```
dynamic_weight(s) = base_score(s) + adjustment(s)

adjustment(s) = round(
  (success_rate(s) - 0.5) * 4     // range: -2 to +2
  - override_rate(s) * 3           // penalty for frequent overrides
)
```

- `adjustment` is clamped to [-3, +3]
- Applied only when sample size ≥ 5 decisions for that skill
- Recomputed weekly or on-demand via `aggregate-intent.ps1`

## Privacy

- `intent` field must not contain PII, secrets, or file paths with usernames
- Log file is `.gitignore`-listed (local only, not committed)
- Aggregation outputs are anonymized and safe to commit
