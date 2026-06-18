#!/usr/bin/env bash
# Auto-initialize gate-state.json when a p/ trigger is detected.
# Runs via Claude Code UserPromptSubmit hook.
set -euo pipefail

input="${CLAUDE_TOOL_INPUT:-}"
[[ -z "$input" ]] && exit 0

# Extract the user prompt text
prompt=$(python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('prompt', '') or d.get('message', '') or '')
" <<< "$input" 2>/dev/null || echo "")

# Only act on messages that start with p/ (Plan Gate trigger)
if ! echo "$prompt" | grep -qP '^\s*p/'; then
  exit 0
fi

GATE_STATE=".ai/routing/state/gate-state.json"

# If gate-state.json already exists with plan_passed=true, leave it alone
if [[ -f "$GATE_STATE" ]]; then
  plan_passed=$(jq -r '.gates.plan_passed // false' "$GATE_STATE" 2>/dev/null || echo "false")
  if [[ "$plan_passed" == "true" ]]; then
    exit 0
  fi
fi

SESSION_ID="session-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p ".ai/routing/state"

python3 - <<PYEOF
import json, os
from datetime import datetime, timezone

state = {
    "session_id": "$SESSION_ID",
    "phase": "plan",
    "gates": {
        "plan_passed": False,
        "review_passed": False,
        "qa_passed": False,
        "ship_ready": False
    },
    "findings": {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
    },
    "selected_assets": [],
    "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
}
with open("$GATE_STATE", "w", encoding="utf-8") as f:
    json.dump(state, f, ensure_ascii=False, indent=2)
    f.write("\n")
PYEOF

echo "INFO gate-state.json を初期化しました (session: $SESSION_ID)" >&2
