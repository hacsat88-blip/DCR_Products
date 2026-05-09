#!/usr/bin/env bash
# Update gate-state.json phase and last_commit_sha after a successful git commit.
# Runs via Claude Code PostToolUse hook on Bash tool (git commit).
set -euo pipefail

input="${CLAUDE_TOOL_INPUT:-}"
[[ -z "$input" ]] && exit 0

command=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" <<< "$input" 2>/dev/null || echo "")
[[ "$command" != *"git commit"* ]] && exit 0

# Only advance if the commit actually succeeded (exit code from tool)
exit_code="${CLAUDE_TOOL_EXIT_CODE:-0}"
[[ "$exit_code" != "0" ]] && exit 0

GATE_STATE=".ai/kernel/gate-state.json"
[[ ! -f "$GATE_STATE" ]] && exit 0

# Get the latest commit SHA
sha=$(git rev-parse HEAD 2>/dev/null || echo "")
[[ -z "$sha" ]] && exit 0

python3 - "$sha" <<'PYEOF'
import sys, json
from datetime import datetime, timezone

sha = sys.argv[1]
path = ".ai/kernel/gate-state.json"

with open(path, "r", encoding="utf-8") as f:
    state = json.load(f)

# Advance phase from plan → impl if still at plan
if state.get("phase") == "plan" and state.get("gates", {}).get("plan_passed"):
    state["phase"] = "impl"

state["last_commit_sha"] = sha
state["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

with open(path, "w", encoding="utf-8") as f:
    json.dump(state, f, ensure_ascii=False, indent=2)
    f.write("\n")
PYEOF
