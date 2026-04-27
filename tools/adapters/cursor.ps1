param([string]$RepoRoot = ".")

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"

Write-Host "[cursor] Generating .cursor/rules/*.mdc..." -ForegroundColor Cyan

$outDir = Join-Path $RepoRoot ".cursor/rules"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# Helper to extract targets
function Get-Targets($file) {
    $text = Get-Content $file.FullName -Raw
    if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
        return [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | % { $_.Groups[1].Value }
    }
    return @()
}

# Detect deprecated assets
function Test-Deprecated($text) {
    if ($text -match '(?ms)^---(.*?)^---') {
        $fm = $Matches[1]
        if ($fm -match '(?m)^\s*deprecated\s*:\s*true\s*$') { return $true }
    }
    return $false
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$skippedDeprecated = 0

# Convert rules to .mdc (skip deprecated)
foreach ($f in Get-ChildItem $rulesDir -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("vscode", "cursor", "claude", "codex") }

    if ($targets -contains "cursor") {
        $text = Get-Content $f.FullName -Raw
        if (Test-Deprecated $text) { $skippedDeprecated++; continue }
        # Remove frontmatter
        if ($text -match '(?s)^---.*?---\s*\n?(.*)') {
            $body = $Matches[1]
        } else {
            $body = $text
        }

        $mdc = "---`ndescription: `"$($f.BaseName)`"`nglobs: `"`"`nalwaysApply: false`n---`n`n<!-- GENERATED: .\tools\deploy-all.ps1 -->`n`n$body"
        [System.IO.File]::WriteAllText("$outDir/$($f.BaseName).mdc", $mdc, $utf8)
        Write-Host "  ✓ $($f.BaseName).mdc" -ForegroundColor Green
    }
}

# Convert skills to .mdc (prefixed skill-, skip deprecated)
foreach ($dir in Get-ChildItem $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $sf)) { continue }

    $targets = Get-Targets (Get-Item $sf)
    if (-not $targets) { $targets = @("vscode", "cursor", "claude", "codex") }

    if ($targets -contains "cursor") {
        $text = Get-Content $sf -Raw
        if (Test-Deprecated $text) { $skippedDeprecated++; continue }
        if ($text -match '(?s)^---.*?---\s*\n?(.*)') {
            $body = $Matches[1]
        } else {
            $body = $text
        }

        $mdc = "---`ndescription: `"$($dir.Name)`"`nglobs: `"`"`nalwaysApply: false`n---`n`n<!-- GENERATED: .\tools\deploy-all.ps1 -->`n`n$body"
        [System.IO.File]::WriteAllText("$outDir/skill-$($dir.Name).mdc", $mdc, $utf8)
        Write-Host "  ✓ skill-$($dir.Name).mdc" -ForegroundColor Green
    }
}

if ($skippedDeprecated -gt 0) {
    Write-Host "  (skipped $skippedDeprecated deprecated assets — use successor names)" -ForegroundColor DarkGray
}

Write-Host ""
