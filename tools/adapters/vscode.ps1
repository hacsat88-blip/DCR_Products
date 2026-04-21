param([string]$RepoRoot = ".")

Write-Host "[vscode] Generating .github/copilot-instructions.md..." -ForegroundColor Cyan

# Collect vscode-targeted rules and skills
$rules = @()
$skills = @()

# Check rules
foreach ($f in Get-ChildItem "$RepoRoot/rules" -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
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
foreach ($dir in Get-ChildItem "$RepoRoot/skills" -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
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
$ruleList = if ($rules) { ($rules | % { "- [$_](../../rules/$_.md)" } | Join-String -Separator "`n") } else { "(none)" }
$skillList = if ($skills) { ($skills | % { "- [$_](../../skills/$_/SKILL.md)" } | Join-String -Separator "`n") } else { "(none)" }

$content = @"
<!-- GENERATED FROM .ai/kernel + rules/ + skills/ - DO NOT EDIT DIRECTLY -->
<!-- Run: .\tools\deploy-all.ps1 to regenerate -->

# GitHub Copilot Instructions

Entrypoint for VS Code Copilot environment.

## Included Rules

$ruleList

## Included Skills

$skillList

---

Load priority: .ai/kernel/ > rules/ > skills/

For architecture details, see [docs/dcr/architecture/unified-adapter-system.md](../../docs/dcr/architecture/unified-adapter-system.md)
"@

$outDir = Join-Path $RepoRoot ".github"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$outDir/copilot-instructions.md", $content, $utf8)

Write-Host "  ✓ .github/copilot-instructions.md" -ForegroundColor Green
