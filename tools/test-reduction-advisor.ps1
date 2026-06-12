#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for Reduction Advisor V7.

.DESCRIPTION
  Creates a temporary router decision log, runs reduction-advisor.ps1, and
  verifies advisor-only classifications plus V7 synthetic telemetry filtering
  without mutating catalog state.
#>

param(
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$AdvisorScript = Join-Path $RepoRoot "tools\reduction-advisor.ps1"
if (-not (Test-Path $AdvisorScript)) {
    throw "reduction-advisor.ps1 not found: $AdvisorScript"
}

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("reduction-advisor-test-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null
$LogPath = Join-Path $TempRoot "router-decisions.jsonl"
$GateStatePath = Join-Path $TempRoot "gate-state.json"
$OutputJson = Join-Path $TempRoot "reduction-advisor.json"

function Write-JsonLine {
    param(
        [Parameter(Mandatory)][object]$Object,
        [Parameter(Mandatory)][string]$Path
    )
    Add-Content -Path $Path -Encoding UTF8 -Value ($Object | ConvertTo-Json -Compress -Depth 8)
}

function Assert-ContainsAction {
    param(
        [Parameter(Mandatory)][object[]]$Items,
        [Parameter(Mandatory)][string]$Action
    )
    if ($Action -notin @($Items | ForEach-Object { $_.action })) {
        throw "missing advisor action: $Action"
    }
}

try {
    Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
        timestamp = "2026-05-17T00:00:00Z"
        input = "routing telemetry smoke"
        kind = "agent"
        name = "pied-piper"
        status = "approved"
        user_reply_type = "approve"
        proposal_id = "rt-smoke-v7"
        reason = "smoke test"
        approval_required = $false
    })
    foreach ($i in 1..3) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-17T00:00:00Z"
            input = "old router alias"
            kind = "skill"
            name = "skill-router"
            status = "rejected"
            user_reply_type = "reject"
            approval_required = $false
        })
    }
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-17T00:01:00Z"
            input = "coordination"
            kind = "agent"
            name = "pied-piper"
            status = "approved"
            user_reply_type = "approve"
            approval_required = $false
        })
    }
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-17T00:01:30Z"
            input = "conversion review"
            kind = "skill"
            name = "conversion-optimization-hub"
            status = "approved"
            user_reply_type = "approve"
            approval_required = $false
        })
    }
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-17T00:02:00Z"
            input = "unclear routing target"
            kind = "skill"
            name = "unified-router"
            status = "ambiguous"
            user_reply_type = "ambiguous"
            approval_required = $false
        })
    }
    Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
        timestamp = "2026-05-17T00:03:00Z"
        input = "another option"
        kind = "agent"
        name = "pied-piper"
        status = "refined"
        user_reply_type = "refine"
        approval_required = $false
    })

    $gateState = [pscustomobject]@{
        proposal_state = [pscustomobject]@{
            proposal_id = ""
            status = "none"
        }
    }
    $gateState | ConvertTo-Json -Depth 4 | Set-Content -Path $GateStatePath -Encoding UTF8

    $output = & powershell.exe -NoProfile -File $AdvisorScript -LogPath $LogPath -GateStatePath $GateStatePath -TopN 10 -MinEvidence 2 -MinRealDecisions 2 -OutputJson $OutputJson 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "reduction-advisor.ps1 exited with $LASTEXITCODE. Output: $output"
    }
    if (-not (Test-Path $OutputJson)) {
        throw "advisor JSON was not written: $OutputJson"
    }

    $report = Get-Content -Path $OutputJson -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($report.safety_policy -ne "advisor_only_no_delete_no_deprecate") {
        throw "unexpected safety policy: $($report.safety_policy)"
    }
    if ($report.v7_policy -ne "ignore_synthetic_until_real_usage_threshold") {
        throw "unexpected V7 policy: $($report.v7_policy)"
    }
    if ($report.total_decisions -ne 11) {
        throw "expected 11 total decisions, got $($report.total_decisions)"
    }
    if ($report.synthetic_decisions -ne 1) {
        throw "expected 1 synthetic decision, got $($report.synthetic_decisions)"
    }
    if ($report.analyzed_decisions -ne 10) {
        throw "expected 10 analyzed decisions, got $($report.analyzed_decisions)"
    }
    Assert-ContainsAction -Items @($report.recommendations) -Action "bundle_into_hub"
    Assert-ContainsAction -Items @($report.recommendations) -Action "expose_underlying_asset"
    Assert-ContainsAction -Items @($report.recommendations) -Action "clarify_trigger"
    Assert-ContainsAction -Items @($report.recommendations) -Action "observe_more"

    $LowEvidenceLog = Join-Path $TempRoot "router-decisions-low-evidence.jsonl"
    $LowEvidenceJson = Join-Path $TempRoot "reduction-advisor-low-evidence.json"
    Write-JsonLine -Path $LowEvidenceLog -Object ([pscustomobject]@{
        timestamp = "2026-05-17T00:00:00Z"
        input = "routing telemetry smoke"
        kind = "agent"
        name = "pied-piper"
        status = "approved"
        user_reply_type = "approve"
        proposal_id = "rt-smoke-only"
        reason = "smoke test"
    })
    Write-JsonLine -Path $LowEvidenceLog -Object ([pscustomobject]@{
        timestamp = "2026-05-17T00:01:00Z"
        input = "real but sparse"
        kind = "skill"
        name = "unified-router"
        status = "approved"
        user_reply_type = "approve"
        reason = "real decision"
    })
    $lowOutput = & powershell.exe -NoProfile -File $AdvisorScript -LogPath $LowEvidenceLog -GateStatePath $GateStatePath -TopN 10 -MinEvidence 2 -MinRealDecisions 2 -OutputJson $LowEvidenceJson 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "low evidence advisor run exited with $LASTEXITCODE. Output: $lowOutput"
    }
    $lowReport = Get-Content -Path $LowEvidenceJson -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-ContainsAction -Items @($lowReport.recommendations) -Action "collect_real_usage"

    Write-Host "reduction-advisor V7 smoke passed"
}
finally {
    if (Test-Path $TempRoot) {
        Remove-Item -Path $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
