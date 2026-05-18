#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for router-decisions-report.ps1 V3 cognitive-load output.

.DESCRIPTION
  Creates temporary router decision and gate-state fixtures, runs the report,
  and verifies the JSON summary shape and key cognitive-load metrics.
#>

param(
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$ReportScript = Join-Path $RepoRoot "tools\router-decisions-report.ps1"
if (-not (Test-Path $ReportScript)) {
    throw "router-decisions-report.ps1 not found: $ReportScript"
}

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("router-report-test-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null
$LogPath = Join-Path $TempRoot "router-decisions.jsonl"
$GateStatePath = Join-Path $TempRoot "gate-state.json"
$OutputJson = Join-Path $TempRoot "summary.json"

function Write-JsonLine {
    param(
        [Parameter(Mandatory)][object]$Object,
        [Parameter(Mandatory)][string]$Path
    )
    Add-Content -Path $Path -Encoding UTF8 -Value ($Object | ConvertTo-Json -Compress -Depth 8)
}

function Assert-Equal {
    param(
        [Parameter(Mandatory)]$Actual,
        [Parameter(Mandatory)]$Expected,
        [Parameter(Mandatory)][string]$Message
    )
    if ($Actual -ne $Expected) {
        throw "$Message. Expected '$Expected', got '$Actual'."
    }
}

try {
    Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
        timestamp = "2026-05-17T00:00:00Z"
        input = "maybe improve"
        kind = "agent"
        name = "pied-piper"
        status = "proposed"
        approval_required = $true
        user_reply_type = "ambiguous"
        options_count = 3
    })
    Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
        timestamp = "2026-05-17T00:01:00Z"
        input = "another option"
        kind = "skill"
        name = "unified-router"
        status = "refined"
        approval_required = $false
        user_reply_type = "refine"
        options_count = 2
    })
    Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
        timestamp = "2026-05-17T00:02:00Z"
        input = "stop"
        kind = "skill"
        name = "old-skill"
        status = "rejected"
        approval_required = $false
        user_reply_type = "reject"
        options_count = 1
    })
    Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
        timestamp = "2026-05-17T00:03:00Z"
        input = "A"
        kind = "agent"
        name = "pied-piper"
        status = "approved"
        approval_required = $false
        user_reply_type = "approve"
        options_count = 3
    })

    $gateState = [pscustomobject]@{
        proposal_state = [pscustomobject]@{
            proposal_id = "rt-stale"
            status = "proposed"
            mode = "propose"
            options = @()
            recommended_option = "A"
            selected_option = ""
            created_at = "2000-01-01T00:00:00Z"
            updated_at = "2000-01-01T00:00:00Z"
            last_user_reply_type = "none"
        }
    }
    $gateState | ConvertTo-Json -Depth 8 | Set-Content -Path $GateStatePath -Encoding UTF8

    $reportOutput = & powershell.exe -NoProfile -File $ReportScript -LogPath $LogPath -GateStatePath $GateStatePath -StaleHours 0 -MinRealDecisions 1 -OutputJson $OutputJson 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "router-decisions-report.ps1 exited with $LASTEXITCODE. Output: $reportOutput"
    }
    if (-not (Test-Path $OutputJson)) {
        throw "summary JSON was not written: $OutputJson"
    }

    $summary = Get-Content -Path $OutputJson -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Equal -Actual $summary.total -Expected 4 -Message "total count mismatch"
    Assert-Equal -Actual $summary.pending_approval_count -Expected 1 -Message "pending approval count mismatch"
    Assert-Equal -Actual $summary.cognitive_load.ambiguous_count -Expected 1 -Message "ambiguous count mismatch"
    Assert-Equal -Actual $summary.cognitive_load.refine_count -Expected 1 -Message "refine count mismatch"
    Assert-Equal -Actual $summary.cognitive_load.rejected_count -Expected 1 -Message "rejected count mismatch"
    Assert-Equal -Actual $summary.cognitive_load.approval_rate -Expected 0.25 -Message "approval rate mismatch"
    Assert-Equal -Actual $summary.cognitive_load.ambiguity_rate -Expected 0.25 -Message "ambiguity rate mismatch"
    Assert-Equal -Actual $summary.cognitive_load.refine_rate -Expected 0.25 -Message "refine rate mismatch"
    Assert-Equal -Actual $summary.cognitive_load.rejection_rate -Expected 0.25 -Message "rejection rate mismatch"
    Assert-Equal -Actual $summary.cognitive_load.stale_proposal.is_stale -Expected $true -Message "stale proposal mismatch"
    Assert-Equal -Actual $summary.cognitive_load.stale_proposal.proposal_id -Expected "rt-stale" -Message "stale proposal id mismatch"

    $suggestionTypes = @($summary.reduction_suggestions | ForEach-Object { $_.type })
    foreach ($expectedType in @("reduce_candidate", "bundle_candidate", "clarify_candidate")) {
        if ($expectedType -notin $suggestionTypes) {
            throw "missing reduction suggestion type: $expectedType"
        }
    }

    $SyntheticLogPath = Join-Path $TempRoot "router-decisions-synthetic.jsonl"
    $SyntheticJson = Join-Path $TempRoot "summary-synthetic.json"
    Write-JsonLine -Path $SyntheticLogPath -Object ([pscustomobject]@{
        timestamp = "2026-05-17T00:00:00Z"
        input = "routing telemetry smoke"
        kind = "agent"
        name = "pied-piper"
        status = "approved"
        approval_required = $false
        user_reply_type = "approve"
        proposal_id = "rt-smoke-report"
        reason = "smoke test"
    })
    Write-JsonLine -Path $SyntheticLogPath -Object ([pscustomobject]@{
        timestamp = "2026-05-17T00:01:00Z"
        input = "A"
        kind = "agent"
        name = "pied-piper"
        status = "approved"
        approval_required = $false
        user_reply_type = "approve"
        proposal_id = "rt-smoke-report-2"
        reason = "fixture smoke"
    })

    $syntheticOutput = & powershell.exe -NoProfile -File $ReportScript -LogPath $SyntheticLogPath -GateStatePath $GateStatePath -OutputJson $SyntheticJson 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "synthetic router-decisions-report.ps1 exited with $LASTEXITCODE. Output: $syntheticOutput"
    }
    $syntheticSummary = Get-Content -Path $SyntheticJson -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Equal -Actual $syntheticSummary.synthetic_decision_count -Expected 2 -Message "synthetic decision count mismatch"
    Assert-Equal -Actual $syntheticSummary.reduction_analyzed_count -Expected 0 -Message "reduction analyzed count mismatch"
    $syntheticSuggestionTypes = @($syntheticSummary.reduction_suggestions | ForEach-Object { $_.type })
    if ("collect_real_usage" -notin $syntheticSuggestionTypes) {
        throw "synthetic-only report should recommend collect_real_usage"
    }
    if ("bundle_candidate" -in $syntheticSuggestionTypes) {
        throw "synthetic-only report must not recommend bundle_candidate"
    }

    Write-Host "router-decisions-report V3 smoke passed"
}
finally {
    if (Test-Path $TempRoot) {
        Remove-Item -Path $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
