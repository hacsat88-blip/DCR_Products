#!/usr/bin/env bash
# Conventional Commits validation hook - runs via Claude Code PreToolUse on git commit
set -euo pipefail

input="${CLAUDE_TOOL_INPUT:-}"
[[ -z "$input" ]] && exit 0

command=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" <<< "$input" 2>/dev/null || echo "")
[[ "$command" != *"git commit"* ]] && exit 0

# HEREDOC 形式 (cat <<'EOF') からはメッセージ抽出できないため skip
if echo "$command" | grep -q "<<"; then
  exit 0
fi

# -m '...' または -m "..." からメッセージを抽出
msg=$(python3 -c "
import sys, re
cmd = sys.argv[1]
m = re.search(r\"-m\s+['\\\"](.+?)['\\\"](?:\s|$)\", cmd)
print(m.group(1) if m else '')
" "$command" 2>/dev/null || echo "")

[[ -z "$msg" ]] && exit 0

pattern='^(feat|fix|docs|refactor|test|chore|ci|perf|build|revert)(\(.+\))?: .{1,72}$'
if ! echo "$msg" | grep -qP "$pattern"; then
  echo "STOP コミットメッセージが Conventional Commits 規約に違反しています" >&2
  echo "   形式: <type>(<scope>): <summary>  (最大 72 文字)" >&2
  echo "   type: feat|fix|docs|refactor|test|chore|ci|perf|build|revert" >&2
  echo "   入力値: $msg" >&2
  exit 1
fi
