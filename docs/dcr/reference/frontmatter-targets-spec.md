# Frontmatter Targets Specification

## Rules & Skills

既存の `rules/*.md` と `skills/*/SKILL.md` に以下を追加:

```yaml
targets:
  - vscode       # VS Code Copilot
  - cursor       # Cursor
  - claude       # Claude Code
  - codex        # Codex
  - zed          # Zed (future)
  - windsurf     # Windsurf (future)
```

### Example: rules/api-design.md

```markdown
---
name: api-design
description: REST API 設計の実務チェックリスト...
targets:
  - vscode
  - cursor
  - claude
  - codex
---

[rule content...]
```

### Default Behavior

ファイルに `targets` が指定されていない場合：
- **rules/*.md**: `[vscode, cursor, claude, codex]` を使用（全ツール対応）
- **skills/*/SKILL.md**: `[vscode, cursor, claude, codex]` を使用（全ツール対応）
- **.ai/agents-source/*.md**: `[codex, claude]` を使用（Codex/Claude のみ）

## Agents

`.ai/agents-source/*.md` と `.ai/agents-source/*.toml` に:

```yaml
targets:
  - codex        # Codex (LLM Agent Registry)
  - claude       # Claude (Agents Marketplace)
```

## Adding New Tools

When adding support for a new tool (e.g., Zed):

1. Add tool name to all `rules/*.md` and `skills/*/SKILL.md` frontmatter:
   ```yaml
   targets:
     - vscode
     - cursor
     - claude
     - codex
     - zed        # ← Add here
   ```

2. Create `tools/adapters/zed.ps1` (see cursor.ps1 for template)

3. Add dispatcher to `tools/deploy-all.ps1`:
   ```powershell
   if ($Target -eq "all" -or $Target -eq "zed") {
       & "$ToolsDir\adapters\zed.ps1" -ManifestPath $ManifestPath -RepoRoot $RepoRoot
   }
   ```

4. Run `.\validate.ps1` and `.\deploy.ps1 -Target zed`

---

## Schema Validation

All `targets` values must be from the allowed set:
- `vscode`, `cursor`, `claude`, `codex`, `zed`, `windsurf`

Invalid targets will be caught by `manifest-compiler.ps1` during compilation.

---

## Maintenance Notes

- **No hardcoding**: Tools are defined in adapter list, not in spec
- **Declarative**: Each file declares which tools it targets (adapters decide how to handle)
- **Extensible**: Adding a new tool requires no changes to existing rules/skills (only adapter addition)
