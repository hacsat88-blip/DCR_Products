#!/usr/bin/env bash
# Gate chain enforcement — blocks git push when QA gate is not passed
# Runs via Claude Code PreToolUse hook. Soft-passes when gate-state.json is absent (bootstrap).
set -euo pipefail

input="${CLAUDE_TOOL_INPUT:-}"
[[ -z "$input" ]] && exit 0

command=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" <<< "$input" 2>/dev/null || echo "")
[[ "$command" != *"git push"* ]] && exit 0

GATE_STATE=".ai/kernel/gate-state.json"

# Bootstrap mode: no gate-state.json means no enforcement yet
[[ ! -f "$GATE_STATE" ]] && exit 0

qa_passed=$(jq -r '.gates.qa_passed // false' "$GATE_STATE")
critical=$(jq -r '.findings.critical // 0' "$GATE_STATE")

if [[ "$qa_passed" != "true" ]]; then
  echo "🔴 q/ QA Gate が未通過です。push をブロックします。" >&2
  echo "   先に q/ トリガーで検証を完了し、gate-state.json を更新してください。" >&2
  exit 1
fi

if [[ "$critical" -gt 0 ]]; then
  echo "🔴 Critical findings が ${critical} 件残存しています。push をブロックします。" >&2
  echo "   q/ で指摘事項をすべて解消してから再試行してください。" >&2
  exit 1
fi
