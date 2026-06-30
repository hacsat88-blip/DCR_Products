#Requires -Version 5.1
<#
.SYNOPSIS
  Token budget — estimate token cost of CLAUDE.md / AGENTS.md / catalog active set.

.DESCRIPTION
  Static, no-LLM token estimation using a UTF-8 char heuristic
  (~3.5 chars/token for mixed JP+EN). Accuracy ±15% — sufficient for
  before/after comparison of consolidation work.

  Reports:
    - Top-level entrypoint files (CLAUDE.md / AGENTS.md) and Cursor mirror
    - Active catalog: rules/skills/agents that ship to a target adapter
    - Deprecation aliases section (alias overhead)
    - Per-asset cost top 10 (find heavy outliers)
    - Snapshot to docs/token-budget.json (gitignored) for trend tracking

.PARAMETER OutputJson
  Write JSON snapshot to docs/token-budget.json.

.PARAMETER CompareWith
  Path to a previous JSON snapshot. If provided, prints delta.

.EXAMPLE
  .\tools\token-budget.ps1
  .\tools\token-budget.ps1 -OutputJson
  .\tools\token-budget.ps1 -CompareWith docs/token-budget-baseline.json
#>

param(
    [switch]$OutputJson,
    [string]$CompareWith = ""
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

# ── Token estimator ──
# Heuristic: ~3.5 chars/token for mixed Japanese + English text.
# Japanese is more token-dense (often 1 char = 1 token), English is ~4 chars/token.
# Average for our docs: 3.5.
function Estimate-Tokens {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return 0 }
    $bytes = (Get-Item $Path).Length
    $text = [System.IO.File]::ReadAllText((Resolve-Path $Path).Path)
    $charCount = $text.Length
    return [int][math]::Ceiling($charCount / 3.5)
}

function Get-ActiveAssets {
    param([string]$Kind)
    switch ($Kind) {
        'rule' {
            $dir = Join-Path $RepoRoot ".ai/catalog/rules"
            return Get-ChildItem -Path $dir -Filter '*.md' | Where-Object {
                -not $_.BaseName.StartsWith('_') -and
                -not (Test-Deprecated $_.FullName)
            }
        }
        'skill' {
            $dir = Join-Path $RepoRoot ".ai/catalog/skills"
            return Get-ChildItem -Path $dir -Directory | Where-Object {
                -not $_.Name.StartsWith('_') -and
                (Test-Path (Join-Path $_.FullName "SKILL.md")) -and
                -not (Test-Deprecated (Join-Path $_.FullName "SKILL.md"))
            } | ForEach-Object { Get-Item (Join-Path $_.FullName "SKILL.md") }
        }
        'agent' {
            $dir = Join-Path $RepoRoot ".ai/catalog/agents-source"
            return Get-ChildItem -Path $dir -Filter '*.md' | Where-Object {
                $_.Name -ne 'README.md' -and
                -not (Test-Deprecated $_.FullName)
            }
        }
    }
}

function Test-Deprecated {
    param([string]$Path)
    $text = [System.IO.File]::ReadAllText((Resolve-Path $Path).Path)
    if ($text -match '(?ms)^---(.*?)^---') {
        $fm = $Matches[1]
        if ($fm -match '(?m)^\s*deprecated\s*:\s*true\s*$') { return $true }
    }
    return $false
}

# ── Collect ──
$report = [pscustomobject]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    entrypoints = @{}
    catalog_totals = @{}
    deprecated_overhead = @{}
    top_heavy = @()
    grand_total = 0
}

# 1. Entrypoints
$entrypoints = @(
    @{ name = 'CLAUDE.md'; path = 'CLAUDE.md' }
    @{ name = 'AGENTS.md'; path = 'AGENTS.md' }
    @{ name = '.cursor/rules/dcr-kernel.mdc'; path = '.cursor/rules/dcr-kernel.mdc' }
)
$entrypointTotal = 0
foreach ($e in $entrypoints) {
    $p = Join-Path $RepoRoot $e.path
    $tokens = Estimate-Tokens -Path $p
    $report.entrypoints[$e.name] = $tokens
    $entrypointTotal += $tokens
}
$report.entrypoints['_total'] = $entrypointTotal

# 2. Catalog totals (active only)
$catalogAll = @()
foreach ($kind in @('rule', 'skill', 'agent')) {
    $items = Get-ActiveAssets -Kind $kind
    $kindTotal = 0
    foreach ($i in $items) {
        $tokens = Estimate-Tokens -Path $i.FullName
        $kindTotal += $tokens
        $name = if ($kind -eq 'skill') { Split-Path -Parent $i.FullName | Split-Path -Leaf } else { $i.BaseName }
        $catalogAll += [pscustomobject]@{ kind = $kind; name = $name; tokens = $tokens }
    }
    $report.catalog_totals[$kind] = @{
        count = $items.Count
        tokens = $kindTotal
    }
}

# 3. Deprecated overhead (alias files still on disk)
foreach ($kind in @('rule', 'skill', 'agent')) {
    $tokens = 0
    $count = 0
    switch ($kind) {
        'rule' {
            $dir = Join-Path $RepoRoot ".ai/catalog/rules"
            foreach ($f in (Get-ChildItem -Path $dir -Filter '*.md' | Where-Object { -not $_.BaseName.StartsWith('_') })) {
                if (Test-Deprecated $f.FullName) {
                    $tokens += Estimate-Tokens -Path $f.FullName
                    $count++
                }
            }
        }
        'skill' {
            $dir = Join-Path $RepoRoot ".ai/catalog/skills"
            foreach ($d in (Get-ChildItem -Path $dir -Directory | Where-Object { -not $_.Name.StartsWith('_') })) {
                $sf = Join-Path $d.FullName "SKILL.md"
                if ((Test-Path $sf) -and (Test-Deprecated $sf)) {
                    $tokens += Estimate-Tokens -Path $sf
                    $count++
                }
            }
        }
        'agent' {
            $dir = Join-Path $RepoRoot ".ai/catalog/agents-source"
            foreach ($f in (Get-ChildItem -Path $dir -Filter '*.md' | Where-Object { $_.Name -ne 'README.md' })) {
                if (Test-Deprecated $f.FullName) {
                    $tokens += Estimate-Tokens -Path $f.FullName
                    $count++
                }
            }
        }
    }
    $report.deprecated_overhead[$kind] = @{ count = $count; tokens = $tokens }
}

# 4. Top heavy
$report.top_heavy = $catalogAll | Sort-Object tokens -Descending | Select-Object -First 10

# 5. Grand total (entrypoints + active catalog)
$catalogActiveTotal = ($report.catalog_totals.GetEnumerator() | ForEach-Object { $_.Value.tokens } | Measure-Object -Sum).Sum
$report.grand_total = $entrypointTotal + $catalogActiveTotal

# ── Output ──
Write-Host ""
Write-Host "=== Token Budget ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Entrypoints (top-level):" -ForegroundColor Yellow
foreach ($k in @('CLAUDE.md', 'AGENTS.md', '.cursor/rules/dcr-kernel.mdc')) {
    Write-Host ("  {0,-40} {1,8:N0} tokens" -f $k, $report.entrypoints[$k])
}
Write-Host ("  {0,-40} {1,8:N0} tokens" -f '-- entrypoint total --', $entrypointTotal) -ForegroundColor DarkGray
Write-Host ""
Write-Host "Active catalog (excludes deprecated):" -ForegroundColor Yellow
foreach ($k in @('rule', 'skill', 'agent')) {
    $entry = $report.catalog_totals[$k]
    Write-Host ("  {0,-12} {1,4} files {2,10:N0} tokens" -f $k, $entry.count, $entry.tokens)
}
Write-Host ("  {0,-12} {1,4}       {2,10:N0} tokens" -f '-- total --', '', $catalogActiveTotal) -ForegroundColor DarkGray
Write-Host ""
Write-Host "Deprecated alias overhead (still on disk):" -ForegroundColor Yellow
$depTotal = 0
foreach ($k in @('rule', 'skill', 'agent')) {
    $entry = $report.deprecated_overhead[$k]
    Write-Host ("  {0,-12} {1,4} aliases {2,8:N0} tokens" -f $k, $entry.count, $entry.tokens)
    $depTotal += $entry.tokens
}
Write-Host ("  {0,-12} {1,4}         {2,8:N0} tokens" -f '-- total --', '', $depTotal) -ForegroundColor DarkGray
Write-Host ""
Write-Host ("Grand total (entrypoints + active catalog): {0:N0} tokens" -f $report.grand_total) -ForegroundColor Green
Write-Host ""
Write-Host "Top 10 heaviest active assets:" -ForegroundColor Yellow
$idx = 1
foreach ($t in $report.top_heavy) {
    Write-Host ("  {0,2}. [{1,-5}] {2,-50} {3,7:N0} tokens" -f $idx, $t.kind, $t.name, $t.tokens)
    $idx++
}

# Compare
if ($CompareWith -and (Test-Path $CompareWith)) {
    Write-Host ""
    Write-Host "=== Comparison vs $CompareWith ===" -ForegroundColor Cyan
    $prev = Get-Content -Path $CompareWith -Raw -Encoding utf8 | ConvertFrom-Json
    $delta = $report.grand_total - $prev.grand_total
    $pct = if ($prev.grand_total -gt 0) { [math]::Round(($delta / $prev.grand_total) * 100, 1) } else { 0 }
    $color = if ($delta -le 0) { 'Green' } else { 'Red' }
    Write-Host ("  Grand total: {0:N0} -> {1:N0} ({2:+#;-#;0}, {3:+#.#;-#.#;0}%)" -f `
        $prev.grand_total, $report.grand_total, $delta, $pct) -ForegroundColor $color

    foreach ($k in @('rule', 'skill', 'agent')) {
        $prevT = $prev.catalog_totals.$k.tokens
        $currT = $report.catalog_totals[$k].tokens
        $d = $currT - $prevT
        $col = if ($d -le 0) { 'Green' } else { 'Red' }
        Write-Host ("  {0,-7} active: {1:N0} → {2:N0} ({3:+#;-#;0})" -f $k, $prevT, $currT, $d) -ForegroundColor $col
    }
}

if ($OutputJson) {
    $outDir = Join-Path $RepoRoot "docs"
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
    $outPath = Join-Path $outDir "token-budget.json"
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($outPath, ($report | ConvertTo-Json -Depth 6), $utf8)
    Write-Host ""
    Write-Host "Snapshot: $outPath" -ForegroundColor Green
}

Write-Host ""
