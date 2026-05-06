# opencode-bridge MCP server

OpenCode Go API backed MCP server for delegating bounded OSS-model tasks from Claude Code and other MCP clients.

The `task` and `context` arguments are sent to the external OpenCode Go API. Do not include secrets, credentials, private customer data, unreleased business plans, or source code that cannot be shared with that provider.

## Tools

| Tool | Default model | Intended use |
|---|---|---|
| `oss_explore` | `kimi-k2.6` | Read-only code exploration, summaries, call-site checks |
| `oss_document` | `deepseek-v4-flash` | Documentation, changelog drafts, translation, comments |
| `oss_implement` | `deepseek-v4-pro` | Test scaffolds, small refactor suggestions, boilerplate generation |

Use this server for bounded assistance. Keep security-sensitive work, cross-module edits, schema migrations, and CI/CD changes in the primary agent. The server does not return provider `reasoning_content`; only final model content and usage metadata are exposed.

## Setup

1. Install dependencies:

   ```powershell
   python -m pip install -r tools/mcp-servers/opencode-bridge/requirements.txt
   ```

2. Create a local environment file:

   ```powershell
   Copy-Item tools/mcp-servers/opencode-bridge/.env.example tools/mcp-servers/opencode-bridge/.env
   ```

3. Edit `.env` and set `OPENCODE_GO_API_KEY`.

`.env` is ignored by Git. `.env.example` must never contain a real API key.

## Claude Code project config

The repository-level `.mcp.json` defines:

```json
{
  "mcpServers": {
    "opencode-bridge": {
      "command": "python",
      "args": ["tools/mcp-servers/opencode-bridge/server.py"]
    }
  }
}
```

The server loads `tools/mcp-servers/opencode-bridge/.env` itself, so the project config does not need to embed secrets.

## Maintenance checks

Run the checks from the repository root unless noted otherwise:

```powershell
python -m py_compile tools/mcp-servers/opencode-bridge/server.py tools/mcp-servers/opencode-bridge/client.py tools/mcp-servers/opencode-bridge/models.py
python tools/mcp-servers/opencode-bridge/server.py --list-tools
python tools/mcp-servers/opencode-bridge/server.py --self-test
claude mcp list
```

`--list-tools` does not call the OpenCode API and is useful for confirming that the MCP tool definitions load. `--self-test` calls the API and requires a valid `OPENCODE_GO_API_KEY`.

If `claude mcp list` does not show `opencode-bridge`, restart Claude Code from the repository root and confirm the project is trusted. If needed, register the same config with `claude mcp add-json -s project`.
