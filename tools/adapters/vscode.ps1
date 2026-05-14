param([string]$RepoRoot = ".")

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"

Write-Host "[vscode] Generating .github/copilot-instructions.md..." -ForegroundColor Cyan

function Test-Deprecated($text) {
    if ($text -match '(?ms)^---(.*?)^---') {
        $fm = $Matches[1]
        if ($fm -match '(?m)^\s*deprecated\s*:\s*true\s*$') { return $true }
    }
    return $false
}

# Collect vscode-targeted rules and skills
$rules = @()
$skills = @()

# Check rules
foreach ($f in Get-ChildItem $rulesDir -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $text = Get-Content $f.FullName -Raw
    if (Test-Deprecated $text) { continue }
    if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
        $targets = [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | % { $_.Groups[1].Value }
    } else {
        $targets = @("vscode", "claude", "codex")
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
        if (Test-Deprecated $text) { continue }
        if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
            $targets = [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | % { $_.Groups[1].Value }
        } else {
            $targets = @("vscode", "claude", "codex")
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
<!-- AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
Generated from: .ai/book + .ai/kernel + .ai/catalog/rules/ + .ai/catalog/skills/
To regenerate: Run pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# GitHub Copilot Instructions

Entrypoint for VS Code Copilot environment.

## Included Rules

$ruleList

## Included Skills

$skillList

---

## Runtime Memory Preflight

「これどう？」「サトシ開発目線で」「前と同じ観点で」「入れる価値ある？」「導入して」「置き換える必要ある？」「また同じエラー」「過去判断も踏まえて」など、過去判断が品質に影響する相談では、利用可能な runtime memory を着手前に確認する。

agentmemory 互換 backend が使える場合は、同種タスク、関連ファイルの過去判断、採用/非採用ポリシー、検証済みコマンドを短く検索する。使えない場合は通常の repo 探索へフォールバックする。memory recall は正本ではなく、`.ai/catalog` / `.ai/book` / repo artifact / 現在の git 状態を優先する。

---

Load priority: .ai/book/ > .ai/kernel/ > .ai/catalog/rules/ > .ai/catalog/skills/

For architecture details, see [docs/dcr/architecture/unified-adapter-system.md](../../docs/dcr/architecture/unified-adapter-system.md)
"@

$outDir = Join-Path $RepoRoot ".github"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$outPath = Join-Path $outDir "copilot-instructions.md"
$utf8 = New-Object System.Text.UTF8Encoding $false
$newline = "`n"
if (Test-Path $outPath) {
    $existingContent = [System.IO.File]::ReadAllText($outPath, [System.Text.Encoding]::UTF8)
    if ($existingContent -match "`r`n") { $newline = "`r`n" }
}
$normalizedContent = (($content -replace "`r`n?", "`n").TrimEnd() -replace "`n", $newline) + $newline
[System.IO.File]::WriteAllText($outPath, $normalizedContent, $utf8)

Write-Host "  [OK] .github/copilot-instructions.md" -ForegroundColor Green
