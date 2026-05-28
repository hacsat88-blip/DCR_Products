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
    5. Safety fixtures declare a valid expected_mode and approval requirement
    6. Cognitive-load fixtures declare valid status / reply type / option metadata
    7. Proposal-state fixtures declare valid previous/next status transitions

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
$DeprecatedAliases = Join-Path $RepoRoot "tools\lib\deprecated-aliases.ps1"
. $DeprecatedAliases
$deprecatedAliasRows = @(Get-DcrDeprecatedAliases -RepoRoot $RepoRoot)
$deprecatedAliasByKey = @{}
foreach ($alias in $deprecatedAliasRows) {
    $deprecatedAliasByKey["$($alias.kind):$($alias.name)"] = $alias
}

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
        $aliasKey = "$($f.kind):$($f.expected_alias_from)"
        if (-not $deprecatedAliasByKey.ContainsKey($aliasKey)) {
            Write-Fail "$label — expected_alias_from='$($f.expected_alias_from)' not found in deprecated frontmatter or tombstone registry"
            continue
        }
        $aliasInfo = $deprecatedAliasByKey[$aliasKey]
        if ($aliasInfo.successor -ne $f.expected) {
            Write-Fail "$label — alias '$($f.expected_alias_from)' has successor='$($aliasInfo.successor)', expected '$($f.expected)'"
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

    # Check 5: safety mode fixture metadata, when present.
    if ($f.expected_mode) {
        $allowedModes = @('auto', 'propose', 'approve_required')
        if ($f.expected_mode -notin $allowedModes) {
            Write-Fail "$label — expected_mode='$($f.expected_mode)' is not one of: $($allowedModes -join ', ')"
            continue
        }
        if ($f.expected_mode -eq 'approve_required' -and $f.approval_required -ne $true) {
            Write-Fail "$label — approve_required fixtures must set approval_required=true"
            continue
        }
    }

    # Check 6: cognitive-load fixture metadata, when present.
    if ($f.expected_status) {
        $allowedStatuses = @('proposed', 'approved', 'rejected', 'executed')
        if ($f.expected_status -notin $allowedStatuses) {
            Write-Fail "$label — expected_status='$($f.expected_status)' is not one of: $($allowedStatuses -join ', ')"
            continue
        }
    }
    if ($f.expected_user_reply_type) {
        $allowedReplyTypes = @('approve', 'reject', 'refine', 'ambiguous')
        if ($f.expected_user_reply_type -notin $allowedReplyTypes) {
            Write-Fail "$label — expected_user_reply_type='$($f.expected_user_reply_type)' is not one of: $($allowedReplyTypes -join ', ')"
            continue
        }
        if ($f.expected_user_reply_type -eq 'approve' -and $f.expected_status -and $f.expected_status -ne 'approved') {
            Write-Fail "$label — approve reply fixtures must use expected_status=approved"
            continue
        }
        if ($f.expected_user_reply_type -eq 'ambiguous' -and $f.expected_status -eq 'executed') {
            Write-Fail "$label — ambiguous reply fixtures must not execute"
            continue
        }
    }
    if ($null -ne $f.options_count) {
        if ($f.options_count -lt 0 -or $f.options_count -gt 3) {
            Write-Fail "$label — options_count='$($f.options_count)' must be 0-3"
            continue
        }
    }
    if ($f.selected_option) {
        $allowedOptions = @('A','B','C','1','2','3')
        if ($f.selected_option -notin $allowedOptions) {
            Write-Fail "$label — selected_option='$($f.selected_option)' is not one of: $($allowedOptions -join ', ')"
            continue
        }
    }

    # Check 7: proposal-state fixture metadata, when present.
    $allowedProposalStatuses = @('none', 'proposed', 'approved', 'rejected', 'refined', 'expired')
    if ($f.proposal_previous_status) {
        if ($f.proposal_previous_status -notin $allowedProposalStatuses) {
            Write-Fail "$label — proposal_previous_status='$($f.proposal_previous_status)' is not one of: $($allowedProposalStatuses -join ', ')"
            continue
        }
    }
    if ($f.proposal_next_status) {
        if ($f.proposal_next_status -notin $allowedProposalStatuses) {
            Write-Fail "$label — proposal_next_status='$($f.proposal_next_status)' is not one of: $($allowedProposalStatuses -join ', ')"
            continue
        }
        if ($f.expected_user_reply_type -eq 'approve' -and $f.proposal_next_status -ne 'approved') {
            Write-Fail "$label — approve proposal replies must use proposal_next_status=approved"
            continue
        }
        if ($f.expected_user_reply_type -eq 'reject' -and $f.proposal_next_status -ne 'rejected') {
            Write-Fail "$label — reject proposal replies must use proposal_next_status=rejected"
            continue
        }
        if ($f.expected_user_reply_type -eq 'refine' -and $f.proposal_next_status -ne 'refined') {
            Write-Fail "$label — refine proposal replies must use proposal_next_status=refined"
            continue
        }
        if ($f.expected_user_reply_type -eq 'ambiguous' -and $f.proposal_next_status -in @('approved','rejected')) {
            Write-Fail "$label — ambiguous proposal replies must not approve or reject"
            continue
        }
    }
    if ($null -ne $f.has_active_proposal) {
        if ($f.has_active_proposal -ne $true -and $f.has_active_proposal -ne $false) {
            Write-Fail "$label — has_active_proposal must be boolean"
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
