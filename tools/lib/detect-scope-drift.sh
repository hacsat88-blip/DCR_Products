#!/usr/bin/env bash
# Warn when a Write/Edit targets a file outside the planned scope.
# Runs via Claude Code PostToolUse hook on Write and Edit tools.
# Emits a warning (not a block) after 3 out-of-scope edits in a session.
set -euo pipefail

input="${CLAUDE_TOOL_INPUT:-}"
[[ -z "$input" ]] && exit 0

file_path=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" <<< "$input" 2>/dev/null || echo "")
[[ -z "$file_path" ]] && exit 0

GATE_STATE=".ai/routing/state/gate-state.json"
[[ ! -f "$GATE_STATE" ]] && exit 0

# Only enforce when a plan has been approved
plan_passed=$(jq -r '.gates.plan_passed // false' "$GATE_STATE")
[[ "$plan_passed" != "true" ]] && exit 0

# Read planned scope files from gate-state (optional field)
scope_files=$(jq -r '.scope_files // [] | .[]' "$GATE_STATE" 2>/dev/null || echo "")
[[ -z "$scope_files" ]] && exit 0

# Check if the edited file is in scope
if echo "$scope_files" | grep -qF "$file_path"; then
  exit 0
fi

# Increment drift counter
drift_count=$(jq -r '.drift_count // 0' "$GATE_STATE")
drift_count=$((drift_count + 1))

python3 - "$drift_count" "$file_path" <<'PYEOF'
import sys, json
from datetime import datetime, timezone

drift_count = int(sys.argv[1])
file_path = sys.argv[2]
path = ".ai/routing/state/gate-state.json"

with open(path, "r", encoding="utf-8") as f:
    state = json.load(f)

state["drift_count"] = drift_count
state["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

with open(path, "w", encoding="utf-8") as f:
    json.dump(state, f, ensure_ascii=False, indent=2)
    f.write("\n")
PYEOF

if [[ "$drift_count" -ge 3 ]]; then
  echo "STOP スコープドリフト: 計画外ファイルへの編集が ${drift_count} 回に達しました。" >&2
  echo "   対象: $file_path" >&2
  echo "   p/ でスコープを再確認するか、計画に追加してください。" >&2
else
  echo "WARN  スコープ外編集 (${drift_count}/3): $file_path" >&2
  echo "   このファイルは承認済みスコープに含まれていません。" >&2
fi
