#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for Bundle Advisor V10.

.DESCRIPTION
  Creates temporary router decision logs and verifies that candidate grouping is
  reported as non-mutating bundle advice.
#>

param(
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$AdvisorScript = Join-Path $RepoRoot "tools\bundle-advisor.ps1"
if (-not (Test-Path $AdvisorScript)) {
    throw "bundle-advisor.ps1 not found: $AdvisorScript"
}

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("bundle-advisor-test-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null
$LogPath = Join-Path $TempRoot "router-decisions.jsonl"
$OutputJson = Join-Path $TempRoot "bundle-advisor.json"

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
        throw "missing bundle action: $Action"
    }
}

try {
    Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
        timestamp = "2026-05-18T00:00:00Z"
        input = "bundle advisor smoke"
        kind = "skill"
        name = "unified-router"
        status = "approved"
        user_reply_type = "approve"
        proposal_id = "bundle-smoke"
        reason = "smoke test"
        actual_asset = "skill:unified-router"
    })
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-18T00:01:00Z"
            input = "routing policy"
            kind = "skill"
            name = "unified-router"
            status = "approved"
            user_reply_type = "approve"
            user_judgement = "too_many"
            actual_asset = "skill:unified-router"
        })
    }
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-18T00:02:00Z"
            input = "routing policy"
            kind = "skill"
            name = "agent-overload-recovery"
            status = "refined"
            user_reply_type = "refine"
            user_judgement = "unclear"
            actual_asset = "skill:agent-overload-recovery"
        })
    }
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-18T00:03:00Z"
            input = "coordinator visible"
            kind = "agent"
            name = "pied-piper"
            status = "approved"
            user_reply_type = "approve"
            actual_asset = ""
        })
    }
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-18T00:04:00Z"
            input = "stable asset"
            kind = "custom"
            name = "stable"
            status = "approved"
            user_reply_type = "approve"
            user_judgement = "just_right"
            actual_asset = "custom:stable"
        })
    }

    $output = & powershell.exe -NoProfile -File $AdvisorScript -LogPath $LogPath -TopN 10 -MinRealDecisions 3 -MinEvidence 2 -OutputJson $OutputJson 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "bundle-advisor.ps1 exited with $LASTEXITCODE. Output: $output"
    }
    if (-not (Test-Path $OutputJson)) {
        throw "bundle advisor JSON was not written: $OutputJson"
    }

    $report = Get-Content -Path $OutputJson -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($report.safety_policy -ne "bundle_advisor_only_no_delete_no_deprecate") {
        throw "unexpected safety policy: $($report.safety_policy)"
    }
    if ($report.v10_policy -ne "suggest_parent_hubs_without_physical_merge") {
        throw "unexpected V10 policy: $($report.v10_policy)"
    }
    if ($report.total_decisions -ne 9) {
        throw "expected 9 total decisions, got $($report.total_decisions)"
    }
    if ($report.synthetic_decisions -ne 1) {
        throw "expected 1 synthetic decision, got $($report.synthetic_decisions)"
    }
    if ($report.analyzed_decisions -ne 8) {
        throw "expected 8 analyzed decisions, got $($report.analyzed_decisions)"
    }

    Assert-ContainsAction -Items @($report.recommendations) -Action "bundle_into_hub"
    Assert-ContainsAction -Items @($report.recommendations) -Action "clarify_parent_label"
    Assert-ContainsAction -Items @($report.recommendations) -Action "expose_underlying_asset"
    Assert-ContainsAction -Items @($report.recommendations) -Action "keep_separate"

    $LowEvidenceLog = Join-Path $TempRoot "router-decisions-low-evidence.jsonl"
    $LowEvidenceJson = Join-Path $TempRoot "bundle-advisor-low-evidence.json"
    Write-JsonLine -Path $LowEvidenceLog -Object ([pscustomobject]@{
        timestamp = "2026-05-18T00:00:00Z"
        input = "real sparse"
        kind = "skill"
        name = "unified-router"
        status = "approved"
        reason = "real decision"
        actual_asset = "skill:unified-router"
    })
    $lowOutput = & powershell.exe -NoProfile -File $AdvisorScript -LogPath $LowEvidenceLog -TopN 10 -MinRealDecisions 2 -MinEvidence 2 -OutputJson $LowEvidenceJson 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "low evidence bundle advisor run exited with $LASTEXITCODE. Output: $lowOutput"
    }
    $lowReport = Get-Content -Path $LowEvidenceJson -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-ContainsAction -Items @($lowReport.recommendations) -Action "collect_bundle_evidence"

    Write-Host "bundle-advisor V10 smoke passed"
}
finally {
    if (Test-Path $TempRoot) {
        Remove-Item -Path $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
