param([string]$RepoRoot = ".")

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"

Write-Host "[vscode] Generating .github/copilot-instructions.md..." -ForegroundColor Cyan

# Collect vscode-targeted rules and skills
$rules = @()
$skills = @()

# Check rules
foreach ($f in Get-ChildItem $rulesDir -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $text = Get-Content $f.FullName -Raw
    if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
        $targets = [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | % { $_.Groups[1].Value }
    } else {
        $targets = @("vscode", "cursor", "claude", "codex")
    }
    if ($targets -contains "vscode") {
        $rules += $f.BaseName
    }
}

# Check skills
foreach ($dir in Get-ChildItem $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $sf) {
        $text = Get-Content $sf -Raw
        if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
            $targets = [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | % { $_.Groups[1].Value }
        } else {
            $targets = @("vscode", "cursor", "claude", "codex")
        }
        if ($targets -contains "vscode") {
            $skills += $dir.Name
        }
    }
}

# Generate file
$ruleList = if ($rules) { (($rules | ForEach-Object { "- [$_](../../.ai/catalog/rules/$_.md)" }) -join "`n") } else { "(none)" }
$skillList = if ($skills) { (($skills | ForEach-Object { "- [$_](../../.ai/catalog/skills/$_/SKILL.md)" }) -join "`n") } else { "(none)" }

$content = @"
<!-- ⚠️ AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY ⚠️
Generated from: .ai/kernel + .ai/catalog/rules/ + .ai/catalog/skills/
To regenerate: Run .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# GitHub Copilot Instructions

Entrypoint for VS Code Copilot environment.

## Included Rules

$ruleList

## Included Skills

$skillList

---

Load priority: .ai/kernel/ > .ai/catalog/rules/ > .ai/catalog/skills/

For architecture details, see [docs/dcr/architecture/unified-adapter-system.md](../../docs/dcr/architecture/unified-adapter-system.md)
"@

$outDir = Join-Path $RepoRoot ".github"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$outDir/copilot-instructions.md", ($content.TrimEnd() + [Environment]::NewLine), $utf8)

Write-Host "  [OK] .github/copilot-instructions.md" -ForegroundColor Green
