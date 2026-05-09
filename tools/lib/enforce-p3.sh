#!/usr/bin/env bash
# P3 pattern enforcement - blocks Write/Edit on config/infra files without plan_passed
# Runs via Claude Code PreToolUse hook on Write and Edit tools.
set -euo pipefail

input="${CLAUDE_TOOL_INPUT:-}"
[[ -z "$input" ]] && exit 0

file_path=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" <<< "$input" 2>/dev/null || echo "")
[[ -z "$file_path" ]] && exit 0

# P3 patterns from .ai/kernel/_permissions.md
p3_patterns=(
  "*.config.*"
  "tsconfig*"
  "vite.config*"
  "next.config*"
  ".env*"
  "*.toml"
  "*.yaml"
  "*.yml"
  "Dockerfile*"
  "deploy.ps1"
  "deploy.sh"
  "*.tf"
  "*.bicep"
)

basename_path=$(basename "$file_path")
is_p3=false
for pattern in "${p3_patterns[@]}"; do
  # shellcheck disable=SC2254
  case "$basename_path" in
    $pattern) is_p3=true; break ;;
  esac
done

$is_p3 || exit 0

GATE_STATE=".ai/kernel/gate-state.json"

# Bootstrap mode: no gate-state.json means no enforcement yet
[[ ! -f "$GATE_STATE" ]] && exit 0

plan_passed=$(jq -r '.gates.plan_passed // false' "$GATE_STATE")

if [[ "$plan_passed" != "true" ]]; then
  echo "STOP P3 操作がブロックされました: $file_path" >&2
  echo "   設定・インフラファイルの変更には p/ Plan Gate の承認が必要です。" >&2
  echo "   先に p/ トリガーでスコープと変更計画を確定してください。" >&2
  exit 1
fi
