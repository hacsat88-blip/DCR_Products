#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for Display Policy Advisor V8.

.DESCRIPTION
  Creates temporary router decision logs and verifies that shadow trial
  feedback is converted into non-mutating display-policy recommendations.
#>

param(
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$AdvisorScript = Join-Path $RepoRoot "tools\display-policy-advisor.ps1"
if (-not (Test-Path $AdvisorScript)) {
    throw "display-policy-advisor.ps1 not found: $AdvisorScript"
}

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("display-policy-advisor-test-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null
$LogPath = Join-Path $TempRoot "router-decisions.jsonl"
$OutputJson = Join-Path $TempRoot "display-policy-advisor.json"

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
        throw "missing display-policy action: $Action"
    }
}

try {
    Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
        timestamp = "2026-05-18T00:00:00Z"
        input = "display policy smoke"
        kind = "agent"
        name = "pied-piper"
        status = "approved"
        user_reply_type = "approve"
        proposal_id = "display-smoke"
        reason = "smoke test"
        shadow_trial = $true
        user_judgement = "too_many"
        actual_asset = "skill:unified-router"
    })
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-18T00:01:00Z"
            input = "いい感じに見て"
            kind = "agent"
            name = "pied-piper"
            status = "approved"
            user_reply_type = "approve"
            shadow_trial = $true
            user_judgement = "too_many"
            actual_asset = "skill:unified-router"
        })
    }
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-18T00:02:00Z"
            input = "軽めに見て"
            kind = "agent"
            name = "pied-piper"
            status = "approved"
            user_reply_type = "approve"
            shadow_trial = $true
            user_judgement = "lighter"
            actual_asset = "agent:pied-piper"
        })
    }
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-18T00:03:00Z"
            input = "サトシ開発目線で"
            kind = "agent"
            name = "pied-piper"
            status = "approved"
            user_reply_type = "approve"
            shadow_trial = $true
            user_judgement = "just_right"
            actual_asset = "rule:repo-boundary-steward"
        })
    }
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-18T00:04:00Z"
            input = "専門家使って"
            kind = "agent"
            name = "pied-piper"
            status = "approved"
            user_reply_type = "approve"
            shadow_trial = $true
            user_judgement = "unclear"
            actual_asset = "skill:advanced-evaluation"
        })
    }
    foreach ($i in 1..2) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-18T00:05:00Z"
            input = "coordinator visible"
            kind = "agent"
            name = "pied-piper"
            status = "approved"
            user_reply_type = "approve"
            shadow_trial = $true
            user_judgement = "too_many"
            actual_asset = ""
        })
    }

    $output = & (Get-Process -Id $PID).Path -NoProfile -File $AdvisorScript -LogPath $LogPath -TopN 10 -MinShadowTrials 3 -MinEvidence 2 -OutputJson $OutputJson 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "display-policy-advisor.ps1 exited with $LASTEXITCODE. Output: $output"
    }
    if (-not (Test-Path $OutputJson)) {
        throw "display policy JSON was not written: $OutputJson"
    }

    $report = Get-Content -Path $OutputJson -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($report.safety_policy -ne "display_policy_only_no_delete_no_deprecate") {
        throw "unexpected safety policy: $($report.safety_policy)"
    }
    if ($report.v8_policy -ne "use_shadow_trials_for_visible_candidate_suppression_and_bundling") {
        throw "unexpected V8 policy: $($report.v8_policy)"
    }
    if ($report.shadow_trials_total -ne 11) {
        throw "expected 11 shadow trials, got $($report.shadow_trials_total)"
    }
    if ($report.shadow_trials_analyzed -ne 10) {
        throw "expected 10 analyzed shadow trials after synthetic filtering, got $($report.shadow_trials_analyzed)"
    }
    Assert-ContainsAction -Items @($report.recommendations) -Action "suppress_secondary_options"
    Assert-ContainsAction -Items @($report.recommendations) -Action "make_lightweight_default"
    Assert-ContainsAction -Items @($report.recommendations) -Action "clarify_display_copy"
    Assert-ContainsAction -Items @($report.recommendations) -Action "keep_as_default"
    Assert-ContainsAction -Items @($report.recommendations) -Action "show_underlying_asset"

    $LowEvidenceLog = Join-Path $TempRoot "router-decisions-low-evidence.jsonl"
    $LowEvidenceJson = Join-Path $TempRoot "display-policy-low-evidence.json"
    Write-JsonLine -Path $LowEvidenceLog -Object ([pscustomobject]@{
        timestamp = "2026-05-18T00:00:00Z"
        input = "real sparse"
        kind = "skill"
        name = "unified-router"
        status = "approved"
        shadow_trial = $true
        user_judgement = "just_right"
        actual_asset = "skill:unified-router"
    })
    $lowOutput = & (Get-Process -Id $PID).Path -NoProfile -File $AdvisorScript -LogPath $LowEvidenceLog -TopN 10 -MinShadowTrials 2 -MinEvidence 2 -OutputJson $LowEvidenceJson 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "low evidence display advisor run exited with $LASTEXITCODE. Output: $lowOutput"
    }
    $lowReport = Get-Content -Path $LowEvidenceJson -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-ContainsAction -Items @($lowReport.recommendations) -Action "collect_shadow_trials"

    Write-Host "display-policy-advisor V8 smoke passed"
}
finally {
    if (Test-Path $TempRoot) {
        Remove-Item -Path $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
