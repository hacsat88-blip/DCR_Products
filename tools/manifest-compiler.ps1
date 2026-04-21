param([string]$RepoRoot = ".", [string]$OutputPath = "manifest.json")

$manifest = @{ rules = @(); skills = @(); agents = @() }

Write-Host "=== Manifest Compiler ===" -ForegroundColor Cyan

# Helper
function Get-Targets($file) {
    $text = Get-Content $file.FullName -Raw
    $targets = $null
    if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)^(?:---|$)') {
        $block = $Matches[1]
        $targets = [regex]::Matches($block, '^  - (.+)$', 'Multiline') | % { $_.Groups[1].Value }
    }
    return if ($targets) { @($targets) } else { @() }
}

# Rules
Write-Host "[1/3] Rules..." -ForegroundColor Yellow
foreach ($f in Get-ChildItem "$RepoRoot/rules" -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $t = Get-Targets $f
    if (-not $t) { $t = @("vscode", "cursor", "claude", "codex") }
    $manifest.rules += @{ name = $f.BaseName; path = "rules/$($f.Name)"; targets = @($t) }
}
Write-Host "  ✓ $($manifest.rules.Count) rules"

# Skills
Write-Host "[2/3] Skills..." -ForegroundColor Yellow
foreach ($dir in Get-ChildItem "$RepoRoot/skills" -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $sf) {
        $t = Get-Targets (Get-Item $sf)
        if (-not $t) { $t = @("vscode", "cursor", "claude", "codex") }
        $manifest.skills += @{ name = $dir.Name; path = "skills/$($dir.Name)/SKILL.md"; targets = @($t) }
    }
}
Write-Host "  ✓ $($manifest.skills.Count) skills"

# Agents
Write-Host "[3/3] Agents..." -ForegroundColor Yellow
foreach ($f in Get-ChildItem "$RepoRoot/.ai/agents-source" -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }) {
    $t = Get-Targets $f
    if (-not $t) { $t = @("codex", "claude") }
    $manifest.agents += @{ name = $f.BaseName; path = ".ai/agents-source/$($f.Name)"; targets = @($t) }
}
Write-Host "  ✓ $($manifest.agents.Count) agents"

# Write
$json = $manifest | ConvertTo-Json -Depth 10
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($OutputPath, $json, $utf8)

Write-Host ""
Write-Host "✓ Manifest: $OutputPath" -ForegroundColor Green
param([string]$RepoRoot = ".", [string]$OutputPath = "manifest.json")
$ErrorActionPreference = "Stop"

Write-Host "=== Manifest Compiler ===" -ForegroundColor Cyan

$manifest = @{ rules = @(); skills = @(); agents = @() }

# Helper: Extract targets from frontmatter
function Get-TargetsFromFile($file) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $targets = @()
    
    # Look for targets: field in frontmatter
    $match = [regex]::Match($content, '(?s)^---\s*\n(.*?)\n---')
    if ($match.Success) {
        $fm = $match.Groups[1].Value
        $targetsMatch = [regex]::Match($fm, '^targets:\s*\n((?:\s*-\s*.+\n)*)', [System.Text.RegularExpressions.RegexOptions]::Multiline)
        if ($targetsMatch.Success) {
            foreach ($line in $targetsMatch.Groups[1].Value -split "`n") {
                $item = $line -replace '^\s*-\s*', '' | % { $_.Trim() }
                if ($item) { $targets += $item }
            }
        }
    }
    return $targets
}

# Rules
Write-Host "[1/3] Scanning rules/*.md..."
$ruleFiles = @(Get-ChildItem -Path "$RepoRoot/rules" -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") })
foreach ($file in $ruleFiles) {
    $targets = Get-TargetsFromFile $file
    if ($targets.Count -eq 0) { $targets = @("vscode", "cursor", "claude", "codex") }
    $manifest.rules += @{ name = $file.BaseName; path = "rules/$($file.Name)"; targets = $targets }
}
Write-Host "  ✓ $($manifest.rules.Count) rules" -ForegroundColor Green

# Skills
Write-Host "[2/3] Scanning skills/*/SKILL.md..."
$skillDirs = @(Get-ChildItem -Path "$RepoRoot/skills" -Directory | Where-Object { -not $_.Name.StartsWith("_") })
foreach ($dir in $skillDirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $skillFile) {
        $targets = Get-TargetsFromFile (Get-Item $skillFile)
        if ($targets.Count -eq 0) { $targets = @("vscode", "cursor", "claude", "codex") }
        $manifest.skills += @{ name = $dir.Name; path = "skills/$($dir.Name)/SKILL.md"; targets = $targets }
    }
}
Write-Host "  ✓ $($manifest.skills.Count) skills" -ForegroundColor Green

# Agents
Write-Host "[3/3] Scanning .ai/agents-source/*.md..."
$agentFiles = @(Get-ChildItem -Path "$RepoRoot/.ai/agents-source" -Filter "*.md" | Where-Object { $_.Name -ne "README.md" })
foreach ($file in $agentFiles) {
    $targets = Get-TargetsFromFile $file
    if ($targets.Count -eq 0) { $targets = @("codex", "claude") }
    $manifest.agents += @{ name = $file.BaseName; path = ".ai/agents-source/$($file.Name)"; targets = $targets }
}
Write-Host "  ✓ $($manifest.agents.Count) agents" -ForegroundColor Green

# Write
$json = $manifest | ConvertTo-Json -Depth 10
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($OutputPath, $json, $utf8)

Write-Host ""
Write-Host "✓ Manifest: $OutputPath" -ForegroundColor Green
Write-Host ""
<#
.SYNOPSIS
  Frontmatter to JSON manifest compiler
#>

param(
    [string]$RepoRoot,
    [string]$OutputPath
)

if (-not $RepoRoot) { $RepoRoot = "." }
if (-not $OutputPath) { $OutputPath = "manifest.json" }

$ErrorActionPreference = "Stop"

function Get-FrontmatterTargets {
    param([string]$FilePath)
    
    $content = Get-Content -Path $FilePath -Encoding utf8 -Raw
    if ($content -match '(?s)^---\s*\n(.*?)\n---') {
        $frontmatter = $Matches[1]
        if ($frontmatter -match '(?m)^targets:\s*\n((?:\s*-\s*.+\n)*)') {
            $targets = @()
            foreach ($line in $Matches[1] -split "`n") {
                if ($line -match '^\s*-\s*(.+)$') {
                    $targets += $Matches[1].Trim()
                }
            }
            return $targets
        }
    }
    return @()
}

function Get-FrontmatterField {
    param([string]$FilePath, [string]$FieldName)
    
    $content = Get-Content -Path $FilePath -Encoding utf8 -Raw
    if ($content -match "(?s)^---\s*\n(.*?)\n---") {
        $fm = $Matches[1]
        $pattern = "(?m)^${FieldName}:\s*(.*)$"
        if ($fm -match $pattern) {
            return $Matches[1].Trim()
        }
    }
    return $null
}

Write-Host ""
Write-Host "=== Manifest Compiler ===" -ForegroundColor Cyan

$manifest = @{ rules = @(); skills = @(); agents = @() }

# Rules
Write-Host "[1/3] Scanning rules/*.md..." -ForegroundColor Yellow
$ruleFiles = @(Get-ChildItem -Path "$RepoRoot/rules" -Filter "*.md" -ErrorAction SilentlyContinue | Where-Object { -not $_.BaseName.StartsWith("_") })
foreach ($file in $ruleFiles) {
    $targets = @(Get-FrontmatterTargets -FilePath $file.FullName)
    if ($targets.Count -eq 0) { $targets = @("vscode", "cursor", "claude", "codex"); Write-Warning "  [$($file.BaseName)] no targets, using defaults" }
    $manifest.rules += @{ name = $file.BaseName; path = "rules/$($file.Name)"; targets = $targets }
}
Write-Host "  ✓ Found $($manifest.rules.Count) rules" -ForegroundColor Green

# Skills
Write-Host "[2/3] Scanning skills/*/SKILL.md..." -ForegroundColor Yellow
$skillDirs = @(Get-ChildItem -Path "$RepoRoot/skills" -Directory -ErrorAction SilentlyContinue | Where-Object { -not $_.Name.StartsWith("_") })
foreach ($dir in $skillDirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $skillFile)) { Write-Warning "  [$($dir.Name)] SKILL.md missing"; continue }
    $targets = @(Get-FrontmatterTargets -FilePath $skillFile)
    if ($targets.Count -eq 0) { $targets = @("vscode", "cursor", "claude", "codex") }
    $manifest.skills += @{ name = $dir.Name; path = "skills/$($dir.Name)/SKILL.md"; targets = $targets }
}
Write-Host "  ✓ Found $($manifest.skills.Count) skills" -ForegroundColor Green

# Agents
Write-Host "[3/3] Scanning .ai/agents-source/*.md..." -ForegroundColor Yellow
$agentFiles = @(Get-ChildItem -Path "$RepoRoot/.ai/agents-source" -Filter "*.md" -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "README.md" })
foreach ($file in $agentFiles) {
    $targets = @(Get-FrontmatterTargets -FilePath $file.FullName)
    if ($targets.Count -eq 0) { $targets = @("codex", "claude") }
    $manifest.agents += @{ name = $file.BaseName; path = ".ai/agents-source/$($file.Name)"; targets = $targets }
}
Write-Host "  ✓ Found $($manifest.agents.Count) agents" -ForegroundColor Green

# Write
$json = $manifest | ConvertTo-Json -Depth 10
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutputPath, $json, $utf8)

Write-Host ""
Write-Host "✓ Manifest: $OutputPath" -ForegroundColor Green
Write-Host "  Rules: $($manifest.rules.Count) | Skills: $($manifest.skills.Count) | Agents: $($manifest.agents.Count)" -ForegroundColor Gray
Write-Host ""
<#
.SYNOPSIS
  Frontmatter to JSON manifest compiler
  
.DESCRIPTION
  Scans rules/*.md, skills/*/SKILL.md, and .ai/agents-source/* to extract
  frontmatter targets and compile them into a unified JSON manifest for
  adapter distribution.

.PARAMETER RepoRoot
  Repository root path (default: current directory)
  
.PARAMETER OutputPath
  Output manifest.json path (default: ./manifest.json)

.EXAMPLE
  .\tools\manifest-compiler.ps1
  .\tools\manifest-compiler.ps1 -RepoRoot . -OutputPath ./manifest.json
#>

param(
    [string]$RepoRoot = ".",
    [string]$OutputPath = "manifest.json"
)

$ErrorActionPreference = "Stop"

function Get-FrontmatterTargets {
    param(
        [string]$FilePath,
        [string]$DefaultTarget = "all"
    )
    
    $content = Get-Content -Path $FilePath -Encoding utf8 -Raw
    
    # Extract frontmatter block (between --- markers)
    if ($content -match '(?s)^---\s*\n(.*?)\n---') {
        $frontmatter = $Matches[1]
        
        # Look for targets: field
        if ($frontmatter -match '(?m)^targets:\s*\n((?:\s*-\s*.+\n)*)') {
            $targetsText = $Matches[1]
            $targets = @()
            
            # Extract each - prefixed target
            foreach ($line in $targetsText -split "`n") {
                if ($line -match '^\s*-\s*(.+)$') {
                    $targets += $Matches[1].Trim()
                }
            }
            
            return $targets
        }
    }
    
    # No targets found; return default
    return @()
}

function Get-FrontmatterField {
    param(
        [string]$FilePath,
        [string]$Field
    )
    
    $content = Get-Content -Path $FilePath -Encoding utf8 -Raw
    
    if ($content -match "(?s)^---\s*\n(.*?)\n---") {
        $frontmatter = $Matches[1]
        
        if ($frontmatter -match "(?m)^${Field}:\s*(.*)$") {
            return $Matches[1].Trim()
        }
    }
    
    return $null
}

Write-Host ""
Write-Host "=== Manifest Compiler ===" -ForegroundColor Cyan
Write-Host ""

# Initialize manifest
$manifest = @{
    rules = @()
    skills = @()
    agents = @()
}

# ────────────────────────────────────
# Rules
# ────────────────────────────────────
Write-Host "[1/3] Scanning rules/*.md..." -ForegroundColor Yellow

$ruleDir = Join-Path $RepoRoot "rules"
if (-not (Test-Path $ruleDir)) {
    Write-Error "Rules directory not found: $ruleDir"
}

$ruleFiles = @(Get-ChildItem -Path $ruleDir -Filter "*.md" -ErrorAction SilentlyContinue |
    Where-Object { -not $_.BaseName.StartsWith("_") })

foreach ($file in $ruleFiles) {
    $name = $file.BaseName
    $targets = @(Get-FrontmatterTargets -FilePath $file.FullName)
    
    # Default: all tools if not specified
    if ($targets.Count -eq 0) {
        $targets = @("vscode", "cursor", "claude", "codex")
        Write-Warning "  ${name}: no targets specified, using default: [$(($targets -join ', '))]" 
    }
    
    $description = Get-FrontmatterField -FilePath $file.FullName -Field "description"
    
    $manifest.rules += @{
        name = $name
        path = "rules/$($file.Name)"
        targets = $targets
        description = $description
    }
}

Write-Host "  ✓ Found $($manifest.rules.Count) rules" -ForegroundColor Green

# ────────────────────────────────────
# Skills
# ────────────────────────────────────
Write-Host "[2/3] Scanning skills/*/SKILL.md..." -ForegroundColor Yellow

$skillDir = Join-Path $RepoRoot "skills"
if (-not (Test-Path $skillDir)) {
    Write-Error "Skills directory not found: $skillDir"
}

$skillDirs = @(Get-ChildItem -Path $skillDir -Directory -ErrorAction SilentlyContinue |
    Where-Object { -not $_.Name.StartsWith("_") })

foreach ($dir in $skillDirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $skillFile)) {
        Write-Warning "  $($dir.Name): SKILL.md not found, skipping"
        continue
    }
    
    $name = $dir.Name
    $targets = @(Get-FrontmatterTargets -FilePath $skillFile)
    
    # Default: all tools if not specified
    if ($targets.Count -eq 0) {
        $targets = @("vscode", "cursor", "claude", "codex")
        Write-Warning "  ${name}: no targets specified, using default: [$(($targets -join ', '))]" 
    }
    
    $description = Get-FrontmatterField -FilePath $skillFile -Field "description"
    
    $manifest.skills += @{
        name = $name
        path = "skills/$name/SKILL.md"
        targets = $targets
        description = $description
    }
}

Write-Host "  ✓ Found $($manifest.skills.Count) skills" -ForegroundColor Green

# ────────────────────────────────────
# Agents
# ────────────────────────────────────
Write-Host "[3/3] Scanning .ai/agents-source/*.md..." -ForegroundColor Yellow

$agentDir = Join-Path $RepoRoot ".ai\agents-source"
if (-not (Test-Path $agentDir)) {
    Write-Error "Agents directory not found: $agentDir"
}

$agentFiles = @(Get-ChildItem -Path $agentDir -Filter "*.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "README.md" })

foreach ($file in $agentFiles) {
    $name = $file.BaseName
    $targets = @(Get-FrontmatterTargets -FilePath $file.FullName)
    
    # Default: codex, claude if not specified
    if ($targets.Count -eq 0) {
        $targets = @("codex", "claude")
        Write-Warning "  ${name}: no targets specified, using default: [$(($targets -join ', '))]" 
    }
    
    $description = Get-FrontmatterField -FilePath $file.FullName -Field "description"
    
    $manifest.agents += @{
        name = $name
        path = ".ai/agents-source/$($file.Name)"
        targets = $targets
        description = $description
    }
}

Write-Host "  ✓ Found $($manifest.agents.Count) agents" -ForegroundColor Green

# ────────────────────────────────────
# Write manifest
# ────────────────────────────────────
Write-Host ""
$json = $manifest | ConvertTo-Json -Depth 10 -Compress:$false
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutputPath, $json, $utf8)

Write-Host "✓ Manifest written: $OutputPath" -ForegroundColor Green
Write-Host "  Rules:  $($manifest.rules.Count)" -ForegroundColor Gray
Write-Host "  Skills: $($manifest.skills.Count)" -ForegroundColor Gray
Write-Host "  Agents: $($manifest.agents.Count)" -ForegroundColor Gray
Write-Host ""
