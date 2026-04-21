# 統一されたエントリポイント・システム実装計画

> **For agentic workers:** REQUIRED: Use subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** サトシ開発を単一ソースとし、各ツール (VS Code, Cursor, Claude, Codex, Zed, Windsurf等) が同じ rules/skills/agents を共有する統一 adapter ベースシステムを構築

**Architecture:** 
- **正本層**: `rules/*.md` と `skills/*/SKILL.md` に frontmatter `targets: [vscode, cursor, claude, codex]` を追加
- **コンパイラ層**: `tools/manifest-compiler.ps1` が frontmatter から JSON manifest を生成
- **Adapter 層**: `tools/adapters/*.ps1` がツール固有形式（vscode md, cursor mdc等）に変換
- **Orchestrator 層**: `tools/deploy-all.ps1` がコンパイラ + 全 adapter を呼び出す
- **新ツール追加**: frontmatter に新ツール名を加え、adapter 1 つ追加するだけ

**Tech Stack:** PowerShell 7+, YAML frontmatter parsing, JSON manifest intermediate format

---

## ファイル構造

```
正本層 (source of truth)
  rules/*.md                    ← targets frontmatter を追加
  skills/*/SKILL.md             ← targets frontmatter を追加
  .ai/agents-source/*.toml/.md  ← targets frontmatter/field を追加

ツール層 (生成物, 自動更新)
  .github/copilot-instructions.md  ← vscode adapter が生成 (← 削除予定の不要化 → 必須)
  AGENTS.md                        ← codex adapter が生成
  CLAUDE.md                        ← claude adapter が生成
  .cursor/rules/*.mdc              ← cursor adapter が生成

コンパイラ + Adapter 層 (新規)
  tools/
  ├── manifest-compiler.ps1        ← frontmatter → manifest.json
  ├── deploy-all.ps1               ← orchestrator
  └── adapters/
      ├── vscode.ps1               ← manifest → .github/copilot-instructions.md + AGENTS.md など
      ├── cursor.ps1               ← manifest → .cursor/rules/*.mdc
      ├── claude.ps1               ← manifest → CLAUDE.md
      └── codex.ps1                ← manifest → AGENTS.md に統合

検証層 (更新)
  validate.ps1                     ← adapter manifest 検証追加
  tools/
  └── validate-manifest.ps1        ← manifest schema チェック
```

---

## タスク分解

### Task 1: Frontmatter Schema 設計と既存サンプル修正

**Files:**
- Modify: `rules/api-design.md` (サンプル)
- Modify: `skills/writing-plans/SKILL.md` (サンプル)
- Modify: `.ai/agents-source/frontend-developer.md` (サンプル)
- Create: `docs/dcr/reference/frontmatter-targets-spec.md`

- [ ] **Step 1: frontmatter targets spec を作成**

Create `docs/dcr/reference/frontmatter-targets-spec.md`:

```markdown
# Frontmatter Targets Specification

## Rules & Skills

既存の rules/*.md と skills/*/SKILL.md に以下を追加:

\`\`\`yaml
targets:
  - vscode       # VS Code Copilot
  - cursor       # Cursor
  - claude       # Claude Code
  - codex        # Codex
  - zed          # Zed (future)
  - windsurf     # Windsurf (future)
\`\`\`

## Agents

.ai/agents-source/*.md と .ai/agents-source/*.toml に:

\`\`\`yaml
targets:
  - codex        # Codex (LLM Agent Registry)
  - claude       # Claude (Agents Marketplace)
\`\`\`

新ツール追加時:
1. rules/*.md と skills/*/SKILL.md の targets に追加
2. .ai/agents-source/*.toml/.md の targets に追加
3. tools/adapters/<new-tool>.ps1 を作成
4. tools/deploy-all.ps1 に呼び出しを追加
```

- [ ] **Step 2: rules/api-design.md に targets を追加**

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
```

- [ ] **Step 3: skills/writing-plans/SKILL.md に targets を追加**

```markdown
---
name: writing-plans
description: Use when you have a spec...
targets:
  - vscode
  - cursor
  - claude
  - codex
contract:
  ...
---
```

- [ ] **Step 4: .ai/agents-source/frontend-developer.md に targets を追加**

```markdown
---
name: frontend-developer
description: Expert frontend developer...
targets:
  - codex
  - claude
---
```

- [ ] **Step 5: 検証 — frontmatter 読み込みテスト**

Run (local PowerShell):
```powershell
$content = Get-Content -Path "rules/api-design.md" -Raw -Encoding utf8
if ($content -match '(?m)^targets:') { Write-Host "OK: targets found" } else { Write-Host "FAIL: targets missing" }
```

Expected: `OK: targets found` for each file

- [ ] **Step 6: Commit**

```bash
git add docs/dcr/reference/frontmatter-targets-spec.md rules/api-design.md skills/writing-plans/SKILL.md .ai/agents-source/frontend-developer.md
git commit -m "docs: define frontmatter targets schema; add sample targets to api-design, writing-plans, frontend-developer"
```

---

### Task 2: manifest-compiler.ps1 を実装（frontmatter → JSON manifest）

**Files:**
- Create: `tools/manifest-compiler.ps1`
- Create: `tools/lib/manifest.schema.json`

- [ ] **Step 1: manifest schema JSON を作成**

Create `tools/lib/manifest.schema.json`:

```json
{
  "type": "object",
  "required": ["rules", "skills", "agents"],
  "properties": {
    "rules": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "path", "targets"],
        "properties": {
          "name": { "type": "string" },
          "path": { "type": "string" },
          "targets": {
            "type": "array",
            "items": { "enum": ["vscode", "cursor", "claude", "codex", "zed", "windsurf"] }
          }
        }
      }
    },
    "skills": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "path", "targets"],
        "properties": {
          "name": { "type": "string" },
          "path": { "type": "string" },
          "targets": {
            "type": "array",
            "items": { "enum": ["vscode", "cursor", "claude", "codex", "zed", "windsurf"] }
          }
        }
      }
    },
    "agents": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "path", "targets"],
        "properties": {
          "name": { "type": "string" },
          "path": { "type": "string" },
          "targets": {
            "type": "array",
            "items": { "enum": ["codex", "claude"] }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: manifest-compiler.ps1 を実装**

Create `tools/manifest-compiler.ps1`:

```powershell
<#
.SYNOPSIS
  Frontmatter → manifest.json compiler
  
.DESCRIPTION
  rules/*.md, skills/*/SKILL.md, .ai/agents-source/*.md の frontmatter から
  targets 情報を抽出し、manifest.json に集約する

.PARAMETER RepoRoot
  Repository root
  
.PARAMETER OutputPath
  Output manifest.json path

.EXAMPLE
  .\manifest-compiler.ps1 -RepoRoot . -OutputPath ./manifest.json
#>

param(
    [string]$RepoRoot = ".",
    [string]$OutputPath = "manifest.json"
)

$ErrorActionPreference = "Stop"

function Get-FrontmatterValue {
    param([string]$FilePath, [string]$Key)
    
    $lines = Get-Content -Path $FilePath -Encoding utf8
    $inFrontmatter = $false
    $value = @()
    
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ($trimmed -eq "---") {
            if ($inFrontmatter) { break }
            $inFrontmatter = $true
            continue
        }
        if ($inFrontmatter -and $trimmed -match "^$Key`:\s*(.*)$") {
            if ($Matches[1]) { return $Matches[1] }
            # Multi-line array
            continue
        }
        if ($inFrontmatter -and $trimmed -match '^\s*-\s+(.+)$') {
            $value += $Matches[1]
        }
    }
    
    if ($value.Count -gt 0) { return $value }
    return $null
}

$manifest = @{
    rules = @()
    skills = @()
    agents = @()
}

# ─ Rules ─
Write-Host "Scanning rules/*.md..." -ForegroundColor Cyan
$ruleFiles = Get-ChildItem -Path "$RepoRoot/rules" -Filter "*.md" |
    Where-Object { $_.BaseName -notlike "_*" }

foreach ($file in $ruleFiles) {
    $name = $file.BaseName
    $targets = Get-FrontmatterValue -FilePath $file.FullName -Key "targets"
    
    if ($null -eq $targets) {
        Write-Warning "  $name: targets not defined, defaulting to all"
        $targets = @("vscode", "cursor", "claude", "codex")
    }
    
    $manifest.rules += @{
        name = $name
        path = "rules/$($file.Name)"
        targets = $targets
    }
}

# ─ Skills ─
Write-Host "Scanning skills/*/SKILL.md..." -ForegroundColor Cyan
$skillDirs = Get-ChildItem -Path "$RepoRoot/skills" -Directory |
    Where-Object { $_.Name -notlike "_*" }

foreach ($dir in $skillDirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $skillFile)) { continue }
    
    $name = $dir.Name
    $targets = Get-FrontmatterValue -FilePath $skillFile -Key "targets"
    
    if ($null -eq $targets) {
        Write-Warning "  $name: targets not defined, defaulting to all"
        $targets = @("vscode", "cursor", "claude", "codex")
    }
    
    $manifest.skills += @{
        name = $name
        path = "skills/$name/SKILL.md"
        targets = $targets
    }
}

# ─ Agents ─
Write-Host "Scanning .ai/agents-source/*.md and *.toml..." -ForegroundColor Cyan
$agentFiles = Get-ChildItem -Path "$RepoRoot/.ai/agents-source" -Filter "*.md" |
    Where-Object { $_.Name -ne "README.md" }

foreach ($file in $agentFiles) {
    $name = $file.BaseName
    $targets = Get-FrontmatterValue -FilePath $file.FullName -Key "targets"
    
    if ($null -eq $targets) {
        Write-Warning "  $name: targets not defined, defaulting to [codex, claude]"
        $targets = @("codex", "claude")
    }
    
    $manifest.agents += @{
        name = $name
        path = ".ai/agents-source/$($file.Name)"
        targets = $targets
    }
}

$json = $manifest | ConvertTo-Json -Depth 10
Set-Content -Path $OutputPath -Value $json -Encoding utf8

Write-Host ""
Write-Host "Manifest generated: $OutputPath" -ForegroundColor Green
Write-Host "  rules: $($manifest.rules.Count)"
Write-Host "  skills: $($manifest.skills.Count)"
Write-Host "  agents: $($manifest.agents.Count)"
```

- [ ] **Step 3: manifest-compiler.ps1 を実行テスト**

Run:
```powershell
.\tools\manifest-compiler.ps1 -RepoRoot . -OutputPath ./manifest.test.json
```

Expected: manifest.test.json が生成され、rules/skills/agents 情報が含まれる

- [ ] **Step 4: manifest.test.json を確認**

Run:
```powershell
$manifest = Get-Content ./manifest.test.json | ConvertFrom-Json
Write-Host "Rules: $($manifest.rules.Count)"
Write-Host "Skills: $($manifest.skills.Count)"
Write-Host "Agents: $($manifest.agents.Count)"
```

Expected: 各カウントが 0 より大きい

- [ ] **Step 5: Cleanup & Commit**

```bash
rm ./manifest.test.json
git add tools/manifest-compiler.ps1 tools/lib/manifest.schema.json
git commit -m "feat: add manifest compiler (frontmatter → JSON)"
```

---

### Task 3: tools/adapters/vscode.ps1 実装

**Files:**
- Create: `tools/adapters/vscode.ps1`

- [ ] **Step 1: vscode adapter を実装**

Create `tools/adapters/vscode.ps1`:

```powershell
<#
.SYNOPSIS
  VS Code adapter: manifest JSON → .github/copilot-instructions.md

.PARAMETER ManifestPath
  Path to manifest.json

.PARAMETER RepoRoot
  Repository root

.PARAMETER OutputDir
  Output directory (.github/)
#>

param(
    [string]$ManifestPath,
    [string]$RepoRoot = ".",
    [string]$OutputDir = ".github"
)

$ErrorActionPreference = "Stop"

Write-Host "[vscode adapter] Generating .github/copilot-instructions.md..." -ForegroundColor Cyan

if (-not (Test-Path $ManifestPath)) {
    throw "Manifest not found: $ManifestPath"
}

$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json

# Filter rules and skills for vscode target
$vsCodeRules = $manifest.rules | Where-Object { $_.targets -contains "vscode" }
$vsCodeSkills = $manifest.skills | Where-Object { $_.targets -contains "vscode" }

$body = @"
<!-- GENERATED FROM .ai/kernel, DO NOT EDIT DIRECTLY -->
<!-- Run: .\tools\deploy-all.ps1 to regenerate -->

# GitHub Copilot Instructions

VS Code Copilot execution environment.

## Included Rules

$($vsCodeRules | ForEach-Object { "- [$($_.name)](../../rules/$($_.name).md)" } | Join-String -Separator "`n")

## Included Skills

$($vsCodeSkills | ForEach-Object { "- [$($_.name)](../../skills/$($_.name)/SKILL.md)" } | Join-String -Separator "`n")

---

Load priority: .ai/kernel/ > rules/ > skills/

For full context, see [repo-map.md](../../.ai/repo-map.md)
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
[System.IO.File]::WriteAllText("$OutputDir/copilot-instructions.md", $body, $utf8NoBom)

Write-Host "  ✓ Generated: $OutputDir/copilot-instructions.md" -ForegroundColor Green
```

- [ ] **Step 2: vscode adapter をテスト**

Run (after Task 2):
```powershell
.\tools\adapters\vscode.ps1 -ManifestPath ./manifest.test.json -RepoRoot . -OutputDir .github.test
```

Expected: `.github.test/copilot-instructions.md` が生成される

- [ ] **Step 3: 生成ファイル確認**

Run:
```powershell
Get-Content .github.test/copilot-instructions.md -First 20
```

Expected: "GENERATED FROM .ai/kernel" コメントが含まれる

- [ ] **Step 4: Cleanup & Commit**

```bash
rm -r .github.test
git add tools/adapters/vscode.ps1
git commit -m "feat: add vscode adapter"
```

---

### Task 4: tools/adapters/cursor.ps1 実装

**Files:**
- Create: `tools/adapters/cursor.ps1`

- [ ] **Step 1: cursor adapter を実装**

Create `tools/adapters/cursor.ps1`:

```powershell
<#
.SYNOPSIS
  Cursor adapter: manifest JSON → .cursor/rules/*.mdc

.PARAMETER ManifestPath
  Path to manifest.json

.PARAMETER RepoRoot
  Repository root

.PARAMETER OutputDir
  Output directory (.cursor/rules/)
#>

param(
    [string]$ManifestPath,
    [string]$RepoRoot = ".",
    [string]$OutputDir = ".cursor/rules"
)

$ErrorActionPreference = "Stop"

Write-Host "[cursor adapter] Generating .cursor/rules/*.mdc..." -ForegroundColor Cyan

if (-not (Test-Path $ManifestPath)) {
    throw "Manifest not found: $ManifestPath"
}

$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json

# Filter rules and skills for cursor target
$cursorRules = $manifest.rules | Where-Object { $_.targets -contains "cursor" }
$cursorSkills = $manifest.skills | Where-Object { $_.targets -contains "cursor" }

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# Convert rules to .mdc
foreach ($rule in $cursorRules) {
    $ruleFile = Join-Path $RepoRoot $rule.path
    if (-not (Test-Path $ruleFile)) { continue }
    
    $content = Get-Content -Path $ruleFile -Raw -Encoding utf8
    # Remove frontmatter
    if ($content -match '(?s)^---.*?---\s*\n?(.*)') {
        $body = $Matches[1].TrimStart()
    } else {
        $body = $content
    }
    
    $mdc = @(
        "---"
        'description: "' + $rule.name + '"'
        'globs: ""'
        "alwaysApply: false"
        "---"
        ""
        "<!-- GENERATED FROM .ai/kernel, DO NOT EDIT DIRECTLY -->"
        "<!-- Run: .\tools\deploy-all.ps1 to regenerate -->"
        ""
        $body
    ) -join "`r`n"
    
    $mdcPath = Join-Path $OutputDir "$($rule.name).mdc"
    [System.IO.File]::WriteAllText($mdcPath, $mdc, $utf8NoBom)
    Write-Host "  ✓ $($rule.name).mdc" -ForegroundColor Green
}

# Convert skills to .mdc (prefixed with "skill-")
foreach ($skill in $cursorSkills) {
    $skillFile = Join-Path $RepoRoot $skill.path
    if (-not (Test-Path $skillFile)) { continue }
    
    $content = Get-Content -Path $skillFile -Raw -Encoding utf8
    if ($content -match '(?s)^---.*?---\s*\n?(.*)') {
        $body = $Matches[1].TrimStart()
    } else {
        $body = $content
    }
    
    $mdc = @(
        "---"
        'description: "' + $skill.name + '"'
        'globs: ""'
        "alwaysApply: false"
        "---"
        ""
        "<!-- GENERATED FROM .ai/kernel, DO NOT EDIT DIRECTLY -->"
        "<!-- Run: .\tools\deploy-all.ps1 to regenerate -->"
        ""
        $body
    ) -join "`r`n"
    
    $mdcPath = Join-Path $OutputDir "skill-$($skill.name).mdc"
    [System.IO.File]::WriteAllText($mdcPath, $mdc, $utf8NoBom)
    Write-Host "  ✓ skill-$($skill.name).mdc" -ForegroundColor Green
}

Write-Host ""
Write-Host "  Total: $($cursorRules.Count) rules + $($cursorSkills.Count) skills" -ForegroundColor Green
```

- [ ] **Step 2: cursor adapter をテスト**

Run:
```powershell
.\tools\adapters\cursor.ps1 -ManifestPath ./manifest.test.json -RepoRoot . -OutputDir .cursor.test/rules
ls .cursor.test/rules
```

Expected: .mdc ファイルが複数生成される

- [ ] **Step 3: Cleanup & Commit**

```bash
rm -r .cursor.test
git add tools/adapters/cursor.ps1
git commit -m "feat: add cursor adapter"
```

---

### Task 5: tools/adapters/claude.ps1 実装

**Files:**
- Create: `tools/adapters/claude.ps1`

- [ ] **Step 1: claude adapter を実装**

Create `tools/adapters/claude.ps1`:

```powershell
<#
.SYNOPSIS
  Claude adapter: manifest JSON → CLAUDE.md

.PARAMETER ManifestPath
  Path to manifest.json

.PARAMETER RepoRoot
  Repository root

.PARAMETER OutputPath
  Output CLAUDE.md path
#>

param(
    [string]$ManifestPath,
    [string]$RepoRoot = ".",
    [string]$OutputPath = "CLAUDE.md"
)

$ErrorActionPreference = "Stop"

Write-Host "[claude adapter] Generating CLAUDE.md..." -ForegroundColor Cyan

if (-not (Test-Path $ManifestPath)) {
    throw "Manifest not found: $ManifestPath"
}

$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json

$claudeRules = $manifest.rules | Where-Object { $_.targets -contains "claude" }
$claudeSkills = $manifest.skills | Where-Object { $_.targets -contains "claude" }
$claudeAgents = $manifest.agents | Where-Object { $_.targets -contains "claude" }

$body = @"
<!-- GENERATED FROM .ai/kernel, DO NOT EDIT DIRECTLY -->
<!-- Run: .\tools\deploy-all.ps1 to regenerate -->

# Claude Code Entrypoint

Claude Code execution environment.

## Included Rules

$($claudeRules | ForEach-Object { "- [$($_.name)](rules/$($_.name).md)" } | Join-String -Separator "`n")

## Included Skills

$($claudeSkills | ForEach-Object { "- [$($_.name)](skills/$($_.name)/SKILL.md)" } | Join-String -Separator "`n")

## Included Agents

$($claudeAgents | ForEach-Object { "- [$($_.name)](.ai/agents-source/$($_.name).md)" } | Join-String -Separator "`n")

---

For full context, see [.ai/module/unified-integration.md](.ai/module/unified-integration.md)
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutputPath, $body, $utf8NoBom)

Write-Host "  ✓ Generated: $OutputPath" -ForegroundColor Green
```

- [ ] **Step 2: claude adapter をテスト & Commit**

```bash
.\tools\adapters\claude.ps1 -ManifestPath ./manifest.test.json
rm CLAUDE.md
git add tools/adapters/claude.ps1
git commit -m "feat: add claude adapter"
```

---

### Task 6: tools/adapters/codex.ps1 実装

**Files:**
- Create: `tools/adapters/codex.ps1`

- [ ] **Step 1: codex adapter を実装**

Create `tools/adapters/codex.ps1`:

```powershell
<#
.SYNOPSIS
  Codex adapter: manifest JSON → AGENTS.md

.PARAMETER ManifestPath
  Path to manifest.json

.PARAMETER RepoRoot
  Repository root

.PARAMETER OutputPath
  Output AGENTS.md path
#>

param(
    [string]$ManifestPath,
    [string]$RepoRoot = ".",
    [string]$OutputPath = "AGENTS.md"
)

$ErrorActionPreference = "Stop"

Write-Host "[codex adapter] Generating AGENTS.md..." -ForegroundColor Cyan

if (-not (Test-Path $ManifestPath)) {
    throw "Manifest not found: $ManifestPath"
}

$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json

$codexRules = $manifest.rules | Where-Object { $_.targets -contains "codex" }
$codexSkills = $manifest.skills | Where-Object { $_.targets -contains "codex" }
$codexAgents = $manifest.agents | Where-Object { $_.targets -contains "codex" }

$body = @"
<!-- GENERATED FROM .ai/kernel, DO NOT EDIT DIRECTLY -->
<!-- Run: .\tools\deploy-all.ps1 to regenerate -->

# Codex Entrypoint

Codex (GitHub CLI) execution environment.

## Included Rules

$($codexRules | ForEach-Object { "- [$($_.name)](rules/$($_.name).md)" } | Join-String -Separator "`n")

## Included Skills

$($codexSkills | ForEach-Object { "- [$($_.name)](skills/$($_.name)/SKILL.md)" } | Join-String -Separator "`n")

## Included Agents

$($codexAgents | ForEach-Object { "- [$($_.name)](.ai/agents-source/$($_.name).md)" } | Join-String -Separator "`n")

---

For full context, see [.ai/module/unified-integration.md](.ai/module/unified-integration.md)
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutputPath, $body, $utf8NoBom)

Write-Host "  ✓ Generated: $OutputPath" -ForegroundColor Green
```

- [ ] **Step 2: codex adapter をテスト & Commit**

```bash
.\tools\adapters\codex.ps1 -ManifestPath ./manifest.test.json
rm AGENTS.md
git add tools/adapters/codex.ps1
git commit -m "feat: add codex adapter"
```

---

### Task 7: tools/deploy-all.ps1 Orchestrator 実装

**Files:**
- Create: `tools/deploy-all.ps1`

- [ ] **Step 1: deploy-all.ps1 を実装**

Create `tools/deploy-all.ps1`:

```powershell
<#
.SYNOPSIS
  Unified deployment orchestrator
  Manifest compiler + all adapters を呼び出す
  
.DESCRIPTION
  1. manifest-compiler.ps1 を実行 → manifest.json 生成
  2. 各 adapter (vscode, cursor, claude, codex) を実行
  3. ユーザーレベルパスへ同期（既存 deploy.ps1 相当）

.PARAMETER DryRun
  Adapter を実行せず、対象ファイルをリスト表示

.PARAMETER Target
  all | vscode | cursor | claude | codex | user
  デフォルト: all

.EXAMPLE
  .\deploy-all.ps1                      # 全 adapter 実行 + ユーザー同期
  .\deploy-all.ps1 -Target vscode       # vscode adapter のみ
  .\deploy-all.ps1 -DryRun              # リスト表示のみ
#>

param(
    [ValidateSet("all", "vscode", "cursor", "claude", "codex", "user")]
    [string]$Target = "all",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot + "\.."
$ToolsDir = $PSScriptRoot
$ManifestPath = Join-Path $RepoRoot "manifest.json"

Write-Host ""
Write-Host "=== Unified Deployment Orchestrator ===" -ForegroundColor Cyan
Write-Host ""

# ─ Step 1: Compile manifest ─
Write-Host "[1/5] Compiling manifest..." -ForegroundColor Yellow
if ($DryRun) {
    Write-Host "  [DRY RUN] Would compile manifest.json" -ForegroundColor DarkYellow
} else {
    & "$ToolsDir\manifest-compiler.ps1" -RepoRoot $RepoRoot -OutputPath $ManifestPath
}

# ─ Step 2-5: Run adapters ─
$adapters = @("vscode", "cursor", "claude", "codex")
$adapterIndex = 1

foreach ($adapter in $adapters) {
    if ($Target -ne "all" -and $Target -ne $adapter) { continue }
    
    $step = $adapterIndex + 1
    Write-Host "[$step/5] Running $adapter adapter..." -ForegroundColor Yellow
    $adapterScript = Join-Path $ToolsDir "adapters\$adapter.ps1"
    
    if (-not (Test-Path $adapterScript)) {
        Write-Warning "  Adapter not found: $adapterScript"
        continue
    }
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would run: .\adapters\$adapter.ps1" -ForegroundColor DarkYellow
    } else {
        & $adapterScript -ManifestPath $ManifestPath -RepoRoot $RepoRoot
    }
    
    $adapterIndex++
}

# ─ Step 6: User-level sync (if Target includes 'user' or 'all') ─
if ($Target -eq "all" -or $Target -eq "user") {
    Write-Host "[6/5] Syncing to user-level paths..." -ForegroundColor Yellow
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would sync skills to ~/.agents/skills/" -ForegroundColor DarkYellow
    } else {
        $userHome = $env:USERPROFILE
        $srcSkills = Join-Path $RepoRoot "skills"
        $dstSkills = Join-Path $userHome ".agents\skills"
        
        if (Test-Path $srcSkills) {
            New-Item -ItemType Directory -Path $dstSkills -Force | Out-Null
            Copy-Item -Path "$srcSkills\*" -Destination $dstSkills -Recurse -Force
            Write-Host "  ✓ Synced skills to $dstSkills" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "✓ Deployment complete!" -ForegroundColor Green
Write-Host ""
```

- [ ] **Step 2: deploy-all.ps1 を実行テスト**

Run:
```powershell
.\tools\deploy-all.ps1 -DryRun
```

Expected: "DRY RUN" メッセージが表示される

- [ ] **Step 3: 実際に実行テスト**

Run:
```powershell
.\tools\deploy-all.ps1 -Target vscode
```

Expected: manifest.json と .github/copilot-instructions.md が生成される

- [ ] **Step 4: Commit**

```bash
git add tools/deploy-all.ps1
git commit -m "feat: add unified deployment orchestrator"
```

---

### Task 8: 既存 deploy.ps1 を shim に差し替え

**Files:**
- Modify: `deploy.ps1`

- [ ] **Step 1: 既存 deploy.ps1 をバックアップ**

```bash
cp deploy.ps1 deploy.ps1.bak
```

- [ ] **Step 2: deploy.ps1 を shim に置き換え**

Replace `deploy.ps1` with:

```powershell
<#
.SYNOPSIS
  Unified deployment shim
  
.DESCRIPTION
  This script now delegates to tools/deploy-all.ps1 for a unified approach.
  
.PARAMETER Target
  all | vscode | cursor | claude | codex | user

.PARAMETER DryRun
  List targets without executing

.EXAMPLE
  .\deploy.ps1
  .\deploy.ps1 -Target cursor -DryRun
#>

param(
    [ValidateSet("all", "vscode", "cursor", "claude", "codex", "user")]
    [string]$Target = "all",
    [switch]$DryRun,
    [switch]$Check,
    [switch]$Watch,
    [switch]$Backup
)

if ($Check) {
    Write-Host "Note: -Check flag moved to deploy-all.ps1. Running standard deploy..." -ForegroundColor Yellow
}

if ($Watch) {
    Write-Host "Note: -Watch flag moved to deploy-all.ps1. Running standard deploy..." -ForegroundColor Yellow
}

if ($Backup) {
    Write-Host "Note: -Backup flag moved to deploy-all.ps1. Running standard deploy..." -ForegroundColor Yellow
}

# Delegate to new orchestrator
& "$PSScriptRoot\tools\deploy-all.ps1" -Target $Target -DryRun:$DryRun
```

- [ ] **Step 3: 後方互換性テスト**

Run:
```powershell
.\deploy.ps1 -DryRun
```

Expected: deploy-all.ps1 が呼ばれる

- [ ] **Step 4: Commit**

```bash
rm deploy.ps1.bak
git add deploy.ps1
git commit -m "refactor: deploy.ps1 → unified shim delegating to tools/deploy-all.ps1"
```

---

### Task 9: validate.ps1 更新（新 adapter 検証追加）

**Files:**
- Modify: `validate.ps1`

- [ ] **Step 1: validate.ps1 に manifest 検証を追加**

Add to validate.ps1 after line ~50 (デプロイ DryRun セクション):

```powershell
# ─────────────────────────────────────────────
# 4b. Manifest compilation check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 4b. manifest-compiler.ps1 check ============"
$manifestCompilerScript = Join-Path $RepoRoot "tools\manifest-compiler.ps1"

if (-not (Test-Path $manifestCompilerScript)) {
    Write-Fail "tools/manifest-compiler.ps1 — file not found"
} else {
    $tempManifest = Join-Path ([System.IO.Path]::GetTempPath()) ("manifest-" + [System.Guid]::NewGuid().ToString("N") + ".json")
    try {
        $result = & $PowerShellExe -ExecutionPolicy Bypass -File $manifestCompilerScript -RepoRoot $RepoRoot -OutputPath $tempManifest 2>&1
        if ($LASTEXITCODE -eq 0) {
            if ($Verbose) { Write-Ok "manifest compiler — exit 0" }
            else { $script:passed++ }
            
            # Validate manifest schema
            $manifest = Get-Content $tempManifest -Raw | ConvertFrom-Json
            if ($manifest.rules -and $manifest.skills -and $manifest.agents) {
                if ($Verbose) { Write-Ok "manifest schema — valid" }
                else { $script:passed++ }
            } else {
                Write-Fail "manifest schema — missing required fields"
            }
        } else {
            Write-Fail "manifest compiler — exit $LASTEXITCODE"
        }
    } finally {
        if (Test-Path $tempManifest) {
            Remove-Item -Path $tempManifest -Force -ErrorAction SilentlyContinue
        }
    }
}
```

- [ ] **Step 2: validate.ps1 を実行テスト**

Run:
```powershell
.\validate.ps1 -Verbose
```

Expected: manifest compiler と schema チェックが pass する

- [ ] **Step 3: Commit**

```bash
git add validate.ps1
git commit -m "test: add manifest compiler validation to validate.ps1"
```

---

### Task 10: ドキュメント更新

**Files:**
- Modify: `README.md`
- Modify: `docs/dcr/development-workflow.md`
- Create: `docs/dcr/architecture/unified-adapter-system.md`

- [ ] **Step 1: README.md の デプロイセクション更新**

Update deploy section in README.md:

```markdown
## デプロイ

統一 adapter ベース: 1 つのコマンドで全ツールに同期

\`\`\`powershell
.\deploy.ps1                    # 全 adapter へ同期
.\deploy.ps1 -Target vscode     # VS Code のみ
.\deploy.ps1 -Target cursor     # Cursor のみ
.\deploy.ps1 -DryRun            # 確認のみ
\`\`\`

内部: `tools/deploy-all.ps1` orchestrator が manifest compiler + 各 adapter を実行。

新ツール追加時:
1. `rules/*.md` と `skills/*/SKILL.md` に `targets: [new-tool]` を追加
2. `tools/adapters/new-tool.ps1` を作成（テンプレート: cursor.ps1 参考）
3. `tools/deploy-all.ps1` に adapter 呼び出しを追加
```

- [ ] **Step 2: 統一 adapter システム ドキュメント作成**

Create `docs/dcr/architecture/unified-adapter-system.md`:

```markdown
# 統一 Adapter システム

## 概要

サトシ開発は単一ソース、各エディタ (VS Code, Cursor, Claude, Codex, Zed, Windsurf等) は adapter を通じて同じ rules/skills/agents を使用。

## アーキテクチャ

\`\`\`
┌──────────────────────────────────┐
│  Source of Truth                 │
│  ├─ rules/*.md (targets: [...])  │
│  ├─ skills/*/SKILL.md (targets) │
│  └─ .ai/agents-source/* (targets)│
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│  manifest-compiler.ps1           │
│  frontmatter 読み込み → JSON出力 │
└──────────────────────────────────┘
           ↓
   ┌───────┴───────┬────────┬────────┐
   ↓               ↓        ↓        ↓
[vscode]      [cursor]  [claude]  [codex]
adapter       adapter   adapter   adapter
   ↓               ↓        ↓        ↓
.github/      .cursor/  CLAUDE.md  AGENTS.md
...md         *.mdc
\`\`\`

## 新ツール追加手順

### 例: Zed

1. **frontmatter 追加**

\`\`\`yaml
# rules/api-design.md
targets:
  - vscode
  - cursor
  - claude
  - codex
  - zed          # ← 追加
\`\`\`

2. **adapter 作成**

\`\`\`powershell
# tools/adapters/zed.ps1 作成（cursor.ps1 をテンプレートに）
\`\`\`

3. **deploy-all.ps1 更新**

\`\`\`powershell
# tools/deploy-all.ps1 の adapter ループに "zed" を追加
\`\`\`

4. **検証**

\`\`\`bash
.\validate.ps1
.\deploy.ps1 -DryRun
.\deploy.ps1 -Target zed
\`\`\`

## 保守

- **manifest.json**: 自動生成、commit しない（.gitignore に追加）
- **.github/copilot-instructions.md** 等: 自動生成、frontmatter で標識
- **rules/**.md**, **skills/*/SKILL.md**: 正本、編集可
```

- [ ] **Step 3: development-workflow.md に adapter 情報追加**

Add section to development-workflow.md:

```markdown
## Adapter System

### Deploy Flow

\`\`\`
Edit rules/ or skills/ → git commit → deploy.ps1 → manifest.json (auto) → adapters run → generated files (auto)
\`\`\`

### Manifest

Generated file: `manifest.json` (in .gitignore)

Track: frontmatter in `rules/*.md`, `skills/*/SKILL.md`

### Adding New Tool

New tool entrypoint (e.g., Zed):
1. Update frontmatter `targets: [vscode, cursor, ..., zed]`
2. Create `tools/adapters/zed.ps1`
3. Regenerate: `.\deploy.ps1`
```

- [ ] **Step 4: Commit**

```bash
git add README.md docs/dcr/development-workflow.md docs/dcr/architecture/unified-adapter-system.md
git commit -m "docs: update for unified adapter system"
```

---

### Task 11: 全体検証と .gitignore 更新

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: manifest.json を .gitignore に追加**

Add to `.gitignore`:

```
# Generated manifest (frontend layer)
/manifest.json
```

- [ ] **Step 2: 全検証スクリプト実行**

Run:
```bash
.\validate.ps1
.\deploy.ps1 -DryRun
```

Expected: 全チェックが pass する

- [ ] **Step 3: Git status 確認**

Run:
```bash
git status
```

Expected: 新しいファイル (tools/manifest-compiler.ps1, tools/adapters/*.ps1, tools/deploy-all.ps1 等) が staged ready

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "build: add manifest.json to .gitignore"
```

---

### Task 12: 段階的 frontmatter 追加（全 rules & skills）

**Files:**
- Modify: すべての `rules/*.md`
- Modify: すべての `skills/*/SKILL.md`

- [ ] **Step 1: PowerShell スクリプトで frontmatter 追加自動化**

Create `tools/add-targets-to-all.ps1`:

```powershell
<#
.SYNOPSIS
  Add targets: frontmatter to all rules and skills

.PARAMETER RepoRoot
  Repository root
#>

param([string]$RepoRoot = ".")

$ErrorActionPreference = "Stop"

function Add-TargetsToFrontmatter {
    param([string]$FilePath, [string[]]$DefaultTargets = @("vscode", "cursor", "claude", "codex"))
    
    $content = Get-Content -Path $FilePath -Raw -Encoding utf8
    
    # Skip if targets already present
    if ($content -match '(?m)^targets:') { return }
    
    # Parse frontmatter
    if ($content -match '(?s)^(---.*?---)(.*)') {
        $frontmatter = $Matches[1]
        $body = $Matches[2]
        
        # Add targets before closing ---
        $newFrontmatter = $frontmatter -replace '---\s*$', ("targets:`n  - " + ($DefaultTargets -join "`n  - ") + "`n---")
        $newContent = $newFrontmatter + $body
        
        Set-Content -Path $FilePath -Value $newContent -Encoding utf8 -NoNewline
        Write-Host "✓ Added targets to $(Split-Path -Leaf $FilePath)" -ForegroundColor Green
    }
}

# Rules
Write-Host "Adding targets to rules/*.md..." -ForegroundColor Cyan
Get-ChildItem -Path "$RepoRoot/rules" -Filter "*.md" |
    Where-Object { $_.BaseName -notlike "_*" } |
    ForEach-Object { Add-TargetsToFrontmatter -FilePath $_.FullName }

# Skills
Write-Host "Adding targets to skills/*/SKILL.md..." -ForegroundColor Cyan
Get-ChildItem -Path "$RepoRoot/skills" -Directory |
    Where-Object { $_.Name -notlike "_*" } |
    ForEach-Object {
        $skillFile = Join-Path $_.FullName "SKILL.md"
        if (Test-Path $skillFile) {
            Add-TargetsToFrontmatter -FilePath $skillFile
        }
    }

Write-Host ""
Write-Host "Done! Review changes and commit." -ForegroundColor Green
```

- [ ] **Step 2: スクリプト実行**

Run:
```powershell
.\tools\add-targets-to-all.ps1 -RepoRoot .
```

Expected: すべての rules/*.md と skills/*/SKILL.md に targets が追加される

- [ ] **Step 3: 変更確認**

Run:
```bash
git diff rules/api-design.md | head -30
```

Expected: frontmatter に targets が追加されている

- [ ] **Step 4: Commit**

```bash
git add rules/ skills/
git commit -m "feat: add targets to all rules and skills frontmatter"
```

---

### Task 13: 最終検証と README 更新

**Files:**
- Modify: `README.md`

- [ ] **Step 1: deploy.ps1 と validate.ps1 を実行**

Run:
```bash
.\validate.ps1
.\deploy.ps1 -DryRun
.\deploy.ps1
.\deploy.ps1 -Check
```

Expected: 全ステップが成功

- [ ] **Step 2: 生成ファイル確認**

Run:
```bash
cat .github/copilot-instructions.md | head -10
cat CLAUDE.md | head -10
ls -la .cursor/rules/*.mdc | head -5
```

Expected: 生成ファイルに "GENERATED FROM .ai/kernel" コメントが含まれる

- [ ] **Step 3: README に新しいセクションを追加**

Add to README.md:

```markdown
## 新ツール追加 (例: Zed)

1. **frontmatter を更新**

すべての `rules/*.md` と `skills/*/SKILL.md` の `targets` リストに `zed` を追加

2. **adapter を作成**

`tools/adapters/zed.ps1` を作成（`cursor.ps1` をテンプレートに）

3. **deploy-all.ps1 を更新**

adapter ループに `zed` を追加

4. **デプロイ**

\`\`\`bash
.\validate.ps1
.\deploy.ps1
\`\`\`

完了。Zed が同じ rules/skills/agents を使用できます。
```

- [ ] **Step 4: Final Commit**

```bash
git add README.md
git commit -m "docs: add new tool onboarding example"
```

---

## 検証チェックリスト

- [ ] `.\validate.ps1` 全 pass
- [ ] `.\deploy.ps1 -DryRun` 成功
- [ ] `.\deploy.ps1` 実行後、`.github/copilot-instructions.md`, `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/*.mdc` が全部生成される
- [ ] 生成ファイルに "GENERATED FROM .ai/kernel" コメントが含まれる
- [ ] `manifest.json` は `.gitignore` に含まれている
- [ ] `git status` で新しく commit できるファイルだけが表示される
- [ ] `tools/adapters/` に 4 つの adapter がある
- [ ] ドキュメント (README, development-workflow, unified-adapter-system) が更新されている

---

## マイルストーン

**完了後の状態:**

✅ 単一ソース (rules/ + skills/ + .ai/agents-source/) で全ツール対応  
✅ 新ツール追加は adapter + frontmatter 更新のみ  
✅ 複数 md ファイル編集不要 (自動生成)  
✅ manifest.json は一時生成物 (repo には commit しない)  
✅ Zed, Windsurf 等の追加も同じ flow で対応可能
