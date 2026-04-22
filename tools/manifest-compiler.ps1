<#
.SYNOPSIS
  Frontmatter to JSON manifest compiler

.DESCRIPTION
  Scans .ai/catalog/rules/*.md, .ai/catalog/skills/*/SKILL.md, and
  .ai/catalog/agents-source/* to extract frontmatter targets and compile
  them into a unified JSON manifest for adapter distribution.

.PARAMETER RepoRoot
  Repository root path (default: current directory)

.PARAMETER OutputPath
  Output manifest.json path (default: ./manifest.json)
#>

param(
    [string]$RepoRoot = ".",
    [string]$OutputPath = "manifest.json"
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path $RepoRoot).Path
$CatalogPaths = Join-Path $resolvedRoot "tools\lib\catalog-paths.ps1"
. $CatalogPaths

function Get-FrontmatterTargets {
    param(
        [string]$FilePath
    )

    $content = Get-Content -Path $FilePath -Encoding utf8 -Raw
    if ($content -match '(?s)^---\s*\n(.*?)\n---') {
        $frontmatter = $Matches[1]
        if ($frontmatter -match '(?m)^targets:\s*\n((?:\s*-\s*.+\n)*)') {
            $targets = @()
            foreach ($line in ($Matches[1] -split "`n")) {
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

$manifest = @{
    rules = @()
    skills = @()
    agents = @()
}

$ruleDir = Resolve-DcrSourcePath -RepoRoot $resolvedRoot -AssetType "rules"
$skillDir = Resolve-DcrSourcePath -RepoRoot $resolvedRoot -AssetType "skills"
$agentDir = Resolve-DcrSourcePath -RepoRoot $resolvedRoot -AssetType "agents-source"

Write-Host "[1/3] Scanning $(Get-DcrCanonicalRelativePath -AssetType 'rules')/*.md..." -ForegroundColor Yellow
$ruleFiles = @(Get-ChildItem -Path $ruleDir -Filter "*.md" -ErrorAction SilentlyContinue |
    Where-Object { -not $_.BaseName.StartsWith("_") })
foreach ($file in $ruleFiles) {
    $targets = @(Get-FrontmatterTargets -FilePath $file.FullName)
    if ($targets.Count -eq 0) {
        $targets = @("vscode", "cursor", "claude", "codex")
    }

    $manifest.rules += @{
        name = $file.BaseName
        path = "$(Get-DcrCanonicalRelativePath -AssetType 'rules')/$($file.Name)"
        targets = $targets
        description = (Get-FrontmatterField -FilePath $file.FullName -Field "description")
    }
}
Write-Host "  ✓ Found $($manifest.rules.Count) rules" -ForegroundColor Green

Write-Host "[2/3] Scanning $(Get-DcrCanonicalRelativePath -AssetType 'skills')/*/SKILL.md..." -ForegroundColor Yellow
$skillDirs = @(Get-ChildItem -Path $skillDir -Directory -ErrorAction SilentlyContinue |
    Where-Object { -not $_.Name.StartsWith("_") })
foreach ($dir in $skillDirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $skillFile)) {
        continue
    }

    $targets = @(Get-FrontmatterTargets -FilePath $skillFile)
    if ($targets.Count -eq 0) {
        $targets = @("vscode", "cursor", "claude", "codex")
    }

    $manifest.skills += @{
        name = $dir.Name
        path = "$(Get-DcrCanonicalRelativePath -AssetType 'skills')/$($dir.Name)/SKILL.md"
        targets = $targets
        description = (Get-FrontmatterField -FilePath $skillFile -Field "description")
    }
}
Write-Host "  ✓ Found $($manifest.skills.Count) skills" -ForegroundColor Green

Write-Host "[3/3] Scanning $(Get-DcrCanonicalRelativePath -AssetType 'agents-source')/*.md..." -ForegroundColor Yellow
$agentFiles = @(Get-ChildItem -Path $agentDir -Filter "*.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "README.md" })
foreach ($file in $agentFiles) {
    $targets = @(Get-FrontmatterTargets -FilePath $file.FullName)
    if ($targets.Count -eq 0) {
        $targets = @("codex", "claude")
    }

    $manifest.agents += @{
        name = $file.BaseName
        path = "$(Get-DcrCanonicalRelativePath -AssetType 'agents-source')/$($file.Name)"
        targets = $targets
        description = (Get-FrontmatterField -FilePath $file.FullName -Field "description")
    }
}
Write-Host "  ✓ Found $($manifest.agents.Count) agents" -ForegroundColor Green

Write-Host ""
$json = $manifest | ConvertTo-Json -Depth 10 -Compress:$false
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutputPath, $json, $utf8)

Write-Host "✓ Manifest written: $OutputPath" -ForegroundColor Green
Write-Host "  Rules:  $($manifest.rules.Count)" -ForegroundColor Gray
Write-Host "  Skills: $($manifest.skills.Count)" -ForegroundColor Gray
Write-Host "  Agents: $($manifest.agents.Count)" -ForegroundColor Gray
Write-Host ""
