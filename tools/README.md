# Tools

Utility scripts for build, deployment, and maintenance operations.

## Core Scripts

### `deploy-all.ps1` (Orchestrator)

**Purpose:** Unified deployment coordinator for all environments

**Delegates to:**
- `manifest-compiler.ps1` (frontmatter → JSON manifest)
- `adapters/vscode.ps1` → `.github/copilot-instructions.md`
- `adapters/claude.ps1` → `CLAUDE.md`
- `adapters/codex.ps1` → `AGENTS.md`
- `adapters/windsurf.ps1` → `.windsurf/rules/*.md` + `.windsurf/workflows/*.md` + `.windsurf/hooks.json` + `.windsurf/mcp_config.example.json` (Git 管理外)
- `adapters/agents.ps1` → `.codex/agents/*.toml` + `.claude/agents/*.md` (Git 管理外)
- `adapters/opencode.ps1` → `opencode.json` + `.opencode/kernel.md` while preserving `.opencode/agents/` and `.opencode/skills/`

**Usage:**
```powershell
.\deploy-all.ps1                    # Deploy to all targets
.\deploy-all.ps1 -Target vscode     # Deploy to VS Code only
.\deploy-all.ps1 -Target agents     # Generate Codex/Claude agent mirrors only
.\deploy-all.ps1 -Target opencode   # Generate OpenCode project config/kernel only
.\deploy-all.ps1 -DryRun            # Preview without executing
```

**Related:** `deploy.ps1` (root) delegates to `deploy-all.ps1`

---

### `manifest-compiler.ps1`

**Purpose:** Compile frontmatter from `.ai/catalog/rules/*.md`, `.ai/catalog/skills/*/SKILL.md`, and `.ai/catalog/agents-source/` into a unified JSON manifest

**Input:** YAML frontmatter with `targets: [vscode, claude, codex, windsurf]` field

**Output:** `manifest.json` (generated artifact, not versioned)

**Usage:**
```powershell
.\tools\manifest-compiler.ps1 -RepoRoot . -OutputPath ./manifest.json
```

**Schema:** See `lib/manifest.schema.json`

---

### `adapters/` (Per-Environment Converters)

Each adapter reads `manifest.json` and generates tool-specific formats:

#### `adapters/vscode.ps1`
Generates `.github/copilot-instructions.md` for VS Code Copilot

#### `adapters/claude.ps1`
Generates `CLAUDE.md` for Claude Code environment

#### `adapters/codex.ps1`
Generates `AGENTS.md` for Codex (GitHub CLI) environment

#### `adapters/windsurf.ps1`
Generates `.windsurf/rules/*.md`, `.windsurf/workflows/*.md`, `.windsurf/hooks.json`, and `.windsurf/mcp_config.example.json` for Windsurf Cascade.
The generated `.windsurf/` mirror is ignored by Git; edit `.ai/kernel/`, `.ai/catalog/rules/`, `.claude/commands/`, or `templates/windsurf/` instead.
The adapter fails fast if Windsurf templates contain machine-local MCP paths, invalid JSON, unused rule templates, or generated rule files without required frontmatter.

Workflow sources:
- `.claude/commands/*.md`
- `templates/windsurf/.windsurf/workflows/*.md`

#### `adapters/agents.ps1`
Generates `.codex/agents/*.toml` and `.claude/agents/*.md` from `.ai/catalog/agents-source/`.
The generated agent mirrors are ignored by Git; edit `.ai/catalog/agents-source/` instead.

#### `adapters/opencode.ps1`
Generates the root `opencode.json` project config and `.opencode/kernel.md` from `.ai/environments/opencode/`.
The adapter preserves OpenCode-local `.opencode/agents/` and `.opencode/skills/` overlays.

---

## Utility Scripts

### `generate-routing-index.ps1`

**Purpose:** Auto-generate `.ai/catalog/rules/_ROUTING_INDEX.md` from rule frontmatter

**Input:** `.ai/catalog/rules/*.md` metadata

**Output:** `.ai/catalog/rules/_ROUTING_INDEX.md` (searchable index)

**Called by:** `validate.ps1`

**Usage:**
```powershell
.\tools\generate-routing-index.ps1
```

---

### `skill-package.ps1`

**Purpose:** Package skills for distribution and versioning

**Input:** `.ai/catalog/skills/` directory

**Output:** Versioned package archive (`.zip` or `.tar.gz`)

**Usage:**
```powershell
.\tools\skill-package.ps1 -Version "1.0.0" -OutputDir "./releases/"
```

---

### `aggregate-intent.ps1`

**Purpose:** Aggregate intent logs from sessions for observability and ML feedback

**Input:** Copilot chat logs (structured JSON)

**Output:** Aggregated intent summary

**Usage:**
```powershell
.\tools\aggregate-intent.ps1 -LogDir "./logs/" -OutputFile "./intent-summary.json"
```

---

## Library

### `lib/manifest.schema.json`

JSON Schema for validating manifest structure. Used by:
- `manifest-compiler.ps1` (output validation)
- `validate.ps1` (schema check)

---

## Adding New Tools

1. Create `tools/<new-name>.ps1`
2. Document in this README under appropriate section
3. If it's a deployment adapter, add to `adapters/` and register in `deploy-all.ps1`
4. Update `validate.ps1` if the script should be tested
5. Add to version control: `git add tools/<new-name>.ps1`

---

## Maintenance

All scripts use UTF-8 encoding and PowerShell 7+.

For updates to adapter logic, see [docs/dcr/architecture/unified-adapter-system.md](../docs/dcr/architecture/unified-adapter-system.md).
