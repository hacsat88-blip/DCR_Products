{
  "permissions": {
    "allow": [
      "Read(*)",
      "Glob(*)",
      "Grep(*)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git branch *)",
      "Bash(cat *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(wc *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(npm run lint *)",
      "Bash(npm run test *)",
      "Bash(npm run build *)",
      "Bash(npm run typecheck *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./**/*.pem)",
      "Read(./**/*.key)",
      "Write(./.env)",
      "Write(./.env.*)",
      "Write(./production.config.*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "input=$(cat); cmd=$(echo \"$input\" | jq -r '.tool_input.command // empty'); if echo \"$cmd\" | grep -qE '\\brm\\s+-rf\\b|\\brm\\s+-r\\b|\\bdrop\\s+database\\b|\\bdrop\\s+table\\b|\\btruncate\\b|\\bformat\\b|\\bmkfs\\b'; then echo '{\"block\": true, \"message\": \"🛑 破壊的コマンドを検出しました。手動で確認してください。\"}'; fi",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "input=$(cat); file=$(echo \"$input\" | jq -r '.tool_input.file_path // .tool_input.path // empty'); if [ \"$(git branch --show-current 2>/dev/null)\" = \"main\" ] || [ \"$(git branch --show-current 2>/dev/null)\" = \"master\" ]; then echo '{\"block\": true, \"message\": \"🛑 mainブランチへの直接編集はブロックされています。作業ブランチを作成してください。\"}'; fi",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write(*.ts)|Write(*.tsx)|Edit(*.ts)|Edit(*.tsx)",
        "hooks": [
          {
            "type": "command",
            "command": "input=$(cat); file=$(echo \"$input\" | jq -r '.tool_input.file_path // .tool_input.path // empty'); if [ -n \"$file\" ] && command -v npx >/dev/null 2>&1; then npx --yes prettier --write \"$file\" 2>/dev/null; fi",
            "timeout": 15
          }
        ]
      }
    ]
  }
}