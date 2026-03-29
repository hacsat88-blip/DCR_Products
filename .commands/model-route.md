# Command: model-route

When the user requests model routing guidance:

Behavior:
- classify task complexity (low/medium/high)
- suggest cheapest safe model tier first
- define escalation/de-escalation rule

Output pattern:
- signal
- chosen tier
- reason
- fallback/escalation condition
