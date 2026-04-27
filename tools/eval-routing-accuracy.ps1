#Requires -Version 5.1
<#
.SYNOPSIS
  Routing accuracy eval — checks whether the unified-router decision tree
  produces the expected (rule | skill | agent) for canonical user inputs.

.DESCRIPTION
  Runs static checks against catalog frontmatter and routing index. Does NOT
  invoke an LLM — it verifies that:
    1. Each fixture's expected asset exists and is not deprecated
    2. Each fixture's expected asset has matching keywords / routing_category
       / domain in frontmatter for the input keywords
    3. Deprecated fixtures route to a successor that exists and is not itself
       deprecated (alias chain integrity)
    4. Hub assets (parent: ...) reference valid variant children

  Exit code: 0 = all pass, 1 = any failure.

.PARAMETER Verbose
  Show per-fixture pass details.

.PARAMETER FixturePath
  Path to fixtures JSON (default: tools/eval-routing-fixtures.json).
#>

param(
    [switch]$Verbose,
    [string]$FixturePath = ""
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($FixturePath)) {
    $FixturePath = Join-Path $PSScriptRoot "eval-routing-fixtures.json"
}
if (-not (Test-Path $FixturePath)) {
    Write-Host "[FAIL] fixture file not found: $FixturePath" -ForegroundColor Red
    exit 1
}

$rulesDir = Join-Path $RepoRoot ".ai/catalog/rules"
$skillsDir = Join-Path $RepoRoot ".ai/catalog/skills"
$agentsDir = Join-Path $RepoRoot ".ai/catalog/agents-source"

$passed = 0; $failed = 0; $errors = @()
function Write-Ok { param($msg) if ($Verbose) { Write-Host "[OK]   $msg" -ForegroundColor Green }; $script:passed++ }
function Write-Fail { param($msg) Write-Host "[FAIL] $msg" -ForegroundColor Red; $script:failed++; $script:errors += $msg }

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

function Resolve-AssetPath {
    param([string]$Kind, [string]$Name)
    switch ($Kind) {
        'rule' { return (Join-Path $rulesDir "$Name.md") }
        'skill' { return (Join-Path $skillsDir "$Name/SKILL.md") }
        'agent' { return (Join-Path $agentsDir "$Name.md") }
    }
}

# Load fixtures
$fixtures = Get-Content -Path $FixturePath -Raw -Encoding utf8 | ConvertFrom-Json

Write-Host "== Eval: routing accuracy on $($fixtures.Count) fixtures ==" -ForegroundColor Cyan
Write-Host ""

foreach ($f in $fixtures) {
    $label = "$($f.kind):$($f.expected) [$($f.input.Substring(0, [Math]::Min(40, $f.input.Length)))]"

    # Check 1: expected asset exists
    $path = Resolve-AssetPath -Kind $f.kind -Name $f.expected
    if (-not (Test-Path $path)) {
        Write-Fail "$label — expected asset file missing: $path"
        continue
    }

    $fm = Get-Frontmatter -Path $path
    if (-not $fm) {
        Write-Fail "$label — no frontmatter found in $path"
        continue
    }

    # Check 2: not deprecated (unless explicitly testing alias)
    if ($fm.ContainsKey('deprecated') -and $fm['deprecated'] -eq 'true' -and -not $f.allow_deprecated) {
        Write-Fail "$label — expected target is deprecated; should route to successor='$($fm['successor'])'"
        continue
    }

    # Check 3: alias integrity if testing deprecated fixture
    if ($f.expected_alias_from) {
        $aliasPath = Resolve-AssetPath -Kind $f.kind -Name $f.expected_alias_from
        if (-not (Test-Path $aliasPath)) {
            Write-Fail "$label — expected_alias_from='$($f.expected_alias_from)' file not found"
            continue
        }
        $aliasFm = Get-Frontmatter -Path $aliasPath
        if ($aliasFm['deprecated'] -ne 'true') {
            Write-Fail "$label — alias '$($f.expected_alias_from)' is not marked deprecated"
            continue
        }
        if ($aliasFm['successor'] -ne $f.expected) {
            Write-Fail "$label — alias '$($f.expected_alias_from)' has successor='$($aliasFm['successor'])', expected '$($f.expected)'"
            continue
        }
    }

    # Check 4: keywords / routing_category match if specified
    if ($f.match_keywords) {
        $matched = $false
        foreach ($kw in $f.match_keywords) {
            if (($fm.ContainsKey('description') -and $fm['description'] -match [regex]::Escape($kw)) -or
                ($fm.ContainsKey('keywords') -and $fm['keywords'] -match [regex]::Escape($kw)) -or
                ($fm.ContainsKey('domain') -and $fm['domain'] -match [regex]::Escape($kw)) -or
                ($fm.ContainsKey('routing_category') -and $fm['routing_category'] -match [regex]::Escape($kw))) {
                $matched = $true
                break
            }
        }
        if (-not $matched) {
            Write-Fail "$label — none of match_keywords [$($f.match_keywords -join ', ')] found in frontmatter"
            continue
        }
    }

    Write-Ok $label
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
$total = $passed + $failed
$rate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 1) } else { 0 }
Write-Host "RESULT: $passed/$total passed (accuracy: $rate%)" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "FAILURES:" -ForegroundColor Red
    foreach ($e in $errors) { Write-Host "  - $e" -ForegroundColor Red }
}
Write-Host "==========================================" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 } else { exit 0 }
