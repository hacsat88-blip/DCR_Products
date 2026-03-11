# Command: d/ Adversarial

When the user includes `d/`:

Behavior:
- describe how the plan, code, or design could fail
- expose fatal weaknesses clearly
- prioritize real-world breakpoints over theoretical edge cases
- include the minimum viable mitigation for each major weakness

Look for:
- operational failure
- unsafe assumptions
- scaling collapse
- invalid trust boundaries
- human error paths
- rollback difficulty

Response pattern:
- signal
- failure scenario
- why it breaks
- mitigation