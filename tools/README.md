# Tools

Utility scripts for build, deployment, and maintenance operations.

## Core Scripts

### `deploy-all.ps1` (Orchestrator)

**Purpose:** Unified deployment coordinator for all environments

**Delegates to:**
- `manifest-compiler.ps1` (frontmatter → JSON manifest)
- `adapters/vscode.ps1` → `.github/copilot-instructions.md`
- `adapters/cursor.ps1` → `.cursor/rules/*.mdc`
- `adapters/claude.ps1` → `CLAUDE.md`
- `adapters/codex.ps1` → `AGENTS.md`

**Usage:**
```powershell
.\deploy-all.ps1                    # Deploy to all targets
.\deploy-all.ps1 -Target vscode     # Deploy to VS Code only
.\deploy-all.ps1 -DryRun            # Preview without executing
```

**Related:** `deploy.ps1` (root) delegates to `deploy-all.ps1`

---

### `manifest-compiler.ps1`

**Purpose:** Compile frontmatter from `rules/*.md`, `skills/*/SKILL.md`, and `.ai/agents-source/` into a unified JSON manifest

**Input:** YAML frontmatter with `targets: [vscode, cursor, claude, codex]` field

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

#### `adapters/cursor.ps1`
Generates `.cursor/rules/*.mdc` files in Cursor MDC format

#### `adapters/claude.ps1`
Generates `CLAUDE.md` for Claude Code environment

#### `adapters/codex.ps1`
Generates `AGENTS.md` for Codex (GitHub CLI) environment

---

## Utility Scripts

### `generate-routing-index.ps1`

**Purpose:** Auto-generate `rules/_ROUTING_INDEX.md` from rule frontmatter

**Input:** `rules/*.md` metadata

**Output:** `rules/_ROUTING_INDEX.md` (searchable index)

**Called by:** `validate.ps1`

**Usage:**
```powershell
.\tools\generate-routing-index.ps1
```

---

### `skill-package.ps1`

**Purpose:** Package skills for distribution and versioning

**Input:** `skills/` directory

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

For updates to adapter logic, see [unified-adapter-system.md](../architecture/unified-adapter-system.md).
