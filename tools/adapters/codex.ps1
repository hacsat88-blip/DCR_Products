param([string]$RepoRoot = ".")

Write-Host "[codex] Generating AGENTS.md..." -ForegroundColor Cyan

function Get-Targets($file) {
    $text = Get-Content $file.FullName -Raw
    if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
        return [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | % { $_.Groups[1].Value }
    }
    return @()
}

$rules = @()
$skills = @()
$agents = @()

# Collect codex-targeted items
foreach ($f in Get-ChildItem "$RepoRoot/rules" -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("vscode", "cursor", "claude", "codex") }
    if ($targets -contains "codex") { $rules += $f.BaseName }
}

foreach ($dir in Get-ChildItem "$RepoRoot/skills" -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $sf) {
        $targets = Get-Targets (Get-Item $sf)
        if (-not $targets) { $targets = @("vscode", "cursor", "claude", "codex") }
        if ($targets -contains "codex") { $skills += $dir.Name }
    }
}

foreach ($f in Get-ChildItem "$RepoRoot/.ai/agents-source" -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("codex", "claude") }
    if ($targets -contains "codex") { $agents += $f.BaseName }
}

$ruleList = if ($rules) { ($rules | % { "- [$_](rules/$_.md)" } | Join-String -Separator "`n") } else { "(none)" }
$skillList = if ($skills) { ($skills | % { "- [$_](skills/$_/SKILL.md)" } | Join-String -Separator "`n") } else { "(none)" }
$agentList = if ($agents) { ($agents | % { "- [$_](.ai/agents-source/$_.md)" } | Join-String -Separator "`n") } else { "(none)" }

$content = @"
<!-- GENERATED FROM .ai/kernel + rules/ + skills/ + .ai/agents-source/ - DO NOT EDIT DIRECTLY -->
<!-- Run: .\tools\deploy-all.ps1 to regenerate -->

# Codex / GitHub Copilot CLI Entrypoint

Unified entry point for Codex and GitHub Copilot CLI environments.

GitHub Copilot CLI specific behavior lives in [.ai/kernel/environments/copilot-cli.md](.ai/kernel/environments/copilot-cli.md).

## Included Rules

$ruleList

## Included Skills

$skillList

## Included Agents

$agentList

---

For architecture details, see [.ai/module/unified-integration.md](.ai/module/unified-integration.md)
"@

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$RepoRoot/AGENTS.md", $content, $utf8)

Write-Host "  ✓ AGENTS.md" -ForegroundColor Green
Write-Host ""
