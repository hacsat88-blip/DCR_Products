#Requires -Version 5.1
<#
.SYNOPSIS
  Deprecation dashboard — visualize alias inventory, age, last call, removal eligibility.

.DESCRIPTION
  Aggregates the deprecated frontmatter across rules / skills / agents and
  cross-references with router-decisions.jsonl to surface:

    - Total deprecated count by kind
    - Alias age (days since deprecation commit, via git log)
    - Recent call count (default last 30 days, from router-decisions.jsonl)
    - External-reference count (grep for old name in repo)
    - Removal-eligibility verdict (per .ai/module/deprecation-lifecycle.md)

  Output: console table + optional JSON to docs/deprecation-status.json

.PARAMETER WindowDays
  Lookback window for "recent calls" (default 30).

.PARAMETER OutputJson
  Write status snapshot to docs/deprecation-status.json.

.PARAMETER OutputMarkdown
  Write Stage 4 removal candidates to docs/deprecation-candidates.md.

.PARAMETER Verbose
  Show per-asset detail lines.
#>

param(
    [int]$WindowDays = 30,
    [switch]$OutputJson,
    [switch]$OutputMarkdown,
    [switch]$Verbose
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$rulesDir = Join-Path $RepoRoot ".ai/catalog/rules"
$skillsDir = Join-Path $RepoRoot ".ai/catalog/skills"
$agentsDir = Join-Path $RepoRoot ".ai/catalog/agents-source"
$decisionsPath = Join-Path $RepoRoot ".ai/kernel/router-decisions.jsonl"
$DeprecatedAliases = Join-Path $RepoRoot "tools\lib\deprecated-aliases.ps1"
. $DeprecatedAliases

# ── Load decisions log ──
$callCounts = @{}
if (Test-Path $decisionsPath) {
    $cutoff = (Get-Date).AddDays(-$WindowDays).ToUniversalTime()
    $entries = Get-Content -Path $decisionsPath -Encoding utf8 |
        Where-Object { $_ } |
        ForEach-Object { $_ | ConvertFrom-Json }
    foreach ($e in $entries) {
        if ($e.via_alias_from -and ([string]$e.via_alias_from).Length -gt 0) {
            try {
                $ts = [datetime]::Parse($e.timestamp).ToUniversalTime()
                if ($ts -ge $cutoff) {
                    if (-not $callCounts.ContainsKey($e.via_alias_from)) {
                        $callCounts[$e.via_alias_from] = 0
                    }
                    $callCounts[$e.via_alias_from]++
                }
            } catch {}
        }
    }
}

# ── Discover deprecated assets ──
function Get-Frontmatter {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    $raw = [System.IO.File]::ReadAllText((Resolve-Path $Path).Path)
    if ($raw -notmatch '(?ms)^---\r?\n(.*?)\r?\n---') { return $null }
    $fm = $Matches[1]
    $map = @{}
    foreach ($line in ($fm -split "\r?\n")) {
        if ($line -match '^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$') {
            $key = $Matches[1]
            $value = $Matches[2].Trim().Trim([char]34, [char]39)
            $map[$key] = $value
        }
    }
    return $map
}

function Get-DeprecationAge {
    param([string]$RelativePath)
    # Find first commit that introduced "deprecated: true" in this file
    Push-Location $RepoRoot
    try {
        $log = git log --diff-filter=A --pickaxe-regex -S 'deprecated: true' --pretty=format:'%H %ad' --date=short -- $RelativePath 2>&1 |
            Select-Object -First 1
        if ($log -and $log -match '^\S+\s+(\S+)') {
            $date = [datetime]::Parse($Matches[1])
            $days = ((Get-Date) - $date).Days
            return @{ days = $days; date = $Matches[1] }
        }
    } catch {}
    finally { Pop-Location }
    return @{ days = -1; date = "unknown" }
}

function Get-ExternalRefs {
    param([string]$Name, [string]$Kind, [string]$SourcePath)
    Push-Location $RepoRoot
    try {
        # Scan for references in markdown / config / scripts (exclude self file, .git, generated, history)
        $exclude = @('.git', '.claude', 'docs/dcr/plans')
        $refs = git grep -l --no-color -e "\b$Name\b" -- '*.md' '*.ps1' '*.json' '*.toml' 2>&1 |
            Where-Object {
                $f = $_
                $skip = $false
                foreach ($ex in $exclude) { if ($f -like "$ex/*") { $skip = $true } }
                if ($SourcePath -and $f -eq $SourcePath) { $skip = $true }
                if ($Kind -eq 'agent' -and $f -eq ".ai/catalog/agents-source/$Name.toml") { $skip = $true }
                # Skip generated docs and lifecycle ledgers that intentionally list aliases.
                if ($f -in @('CLAUDE.md', 'AGENTS.md', '.ai/catalog/rules/_ROUTING_INDEX.md', '.ai/catalog/_deprecated-aliases.json', 'docs/deprecation-removed.md', 'docs/deprecation-candidates.md')) { $skip = $true }
                -not $skip
            }
        return @($refs)
    } catch {
        return @()
    } finally { Pop-Location }
}

# ── Collect ──
$report = New-Object System.Collections.Generic.List[object]

foreach ($alias in Get-DcrDeprecatedAliases -RepoRoot $RepoRoot) {
    $age = Get-DeprecationAge -RelativePath $alias.source_path
    if ($alias.state -eq 'removed' -and $alias.removed_at) {
        $age = @{ days = 0; date = $alias.removed_at }
    }
    $refs = Get-ExternalRefs -Name $alias.name -Kind $alias.kind -SourcePath $alias.source_path
    $calls = if ($callCounts.ContainsKey($alias.name)) { $callCounts[$alias.name] } else { 0 }
    $report.Add([pscustomobject]@{
        kind = $alias.kind
        name = $alias.name
        successor = $alias.successor
        state = $alias.state
        source_path = $alias.source_path
        days_deprecated = $age.days
        since = $age.date
        calls_window = $calls
        external_refs = $refs.Count
        ref_files = ($refs -join '; ')
    })
}

# ── Verdict per .ai/module/deprecation-lifecycle.md ──
foreach ($r in $report) {
    $verdict = "WAIT"
    if ($r.days_deprecated -lt 0) {
        $verdict = "AGE-UNKNOWN (force git log check)"
    } elseif ($r.days_deprecated -ge 90 -and $r.calls_window -eq 0 -and $r.external_refs -eq 0) {
        $verdict = "ELIGIBLE-FOR-REMOVAL"
    } elseif ($r.days_deprecated -ge 90 -and ($r.calls_window -gt 0 -or $r.external_refs -gt 0)) {
        $verdict = "OLD-BUT-IN-USE"
    } elseif ($r.days_deprecated -lt 90) {
        $verdict = "TOO-NEW (>=90d req)"
    }
    Add-Member -InputObject $r -MemberType NoteProperty -Name 'verdict' -Value $verdict
}

# ── Output ──
Write-Host ""
Write-Host "=== Deprecation Dashboard ===" -ForegroundColor Cyan
Write-Host "Window: last $WindowDays days for call counts" -ForegroundColor DarkGray
Write-Host ""

$summary = $report | Group-Object kind | Sort-Object Name
foreach ($g in $summary) {
    Write-Host ("  {0,-7} : {1}" -f $g.Name, $g.Count)
}
$eligible = @($report | Where-Object { $_.verdict -eq 'ELIGIBLE-FOR-REMOVAL' })
$oldButUsed = @($report | Where-Object { $_.verdict -eq 'OLD-BUT-IN-USE' })
Write-Host ""
Write-Host "Removal eligible:    $($eligible.Count)" -ForegroundColor $(if ($eligible.Count -gt 0) { 'Green' } else { 'DarkGray' })
Write-Host "Old but still in use: $($oldButUsed.Count)" -ForegroundColor $(if ($oldButUsed.Count -gt 0) { 'Yellow' } else { 'DarkGray' })

if ($Verbose -or $eligible.Count -gt 0 -or $oldButUsed.Count -gt 0) {
    Write-Host ""
    $tableText = $report |
        Sort-Object verdict, days_deprecated -Descending |
        Select-Object kind, name, successor, state, days_deprecated, calls_window, external_refs, verdict |
        Format-Table -AutoSize | Out-String
    Write-Host $tableText
}

if ($OutputJson) {
    $outDir = Join-Path $RepoRoot "docs"
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
    $outPath = Join-Path $outDir "deprecation-status.json"
    $snapshot = [pscustomobject]@{
        generated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        window_days = $WindowDays
        total_deprecated = $report.Count
        eligible_for_removal = $eligible.Count
        old_but_in_use = $oldButUsed.Count
        items = $report
    }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($outPath, ($snapshot | ConvertTo-Json -Depth 6), $utf8)
    Write-Host ""
    Write-Host "Snapshot: $outPath" -ForegroundColor Green
}

if ($OutputMarkdown) {
    $outDir = Join-Path $RepoRoot "docs"
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
    $mdPath = Join-Path $outDir "deprecation-candidates.md"

    $eligibleItems = @($report | Where-Object { $_.verdict -eq 'ELIGIBLE-FOR-REMOVAL' } | Sort-Object kind, name)

    $lines = @(
        "# Deprecation Removal Candidates",
        "",
        'Generated by tools/deprecation-dashboard.ps1',
        "",
        ('- Generated at: {0}' -f ((Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))),
        "- Window days: $WindowDays",
        "- Eligible count: $($eligibleItems.Count)",
        "",
        "## Eligible (Stage 4 candidates)",
        "",
        "| kind | old name | successor | days deprecated | calls (window) | external refs |",
        "|---|---|---|---:|---:|---:|"
    )

    if ($eligibleItems.Count -eq 0) {
        $lines += "| - | - | - | - | - | - |"
    }
    else {
        foreach ($item in $eligibleItems) {
            $lines += "| $($item.kind) | $($item.name) | $($item.successor) | $($item.days_deprecated) | $($item.calls_window) | $($item.external_refs) |"
        }
    }

    $lines += @(
        "",
        "## Next Step",
        "",
        "- Review this list with .ai/module/deprecation-lifecycle.md and update docs/deprecation-removed.md when removal is executed.",
        ""
    )

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($mdPath, ($lines -join [Environment]::NewLine), $utf8)

    Write-Host ""
    Write-Host "Candidates: $mdPath" -ForegroundColor Green
}
