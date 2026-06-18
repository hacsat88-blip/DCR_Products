#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for Display Policy Proposal V9.

.DESCRIPTION
  Verifies that V8 display advice can be converted into a short approval
  proposal and, when requested, persisted to gate-state proposal_state without
  applying any display-policy change.
#>

param(
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$ProposalScript = Join-Path $RepoRoot "tools\display-policy-proposal.ps1"
if (-not (Test-Path $ProposalScript)) {
    throw "display-policy-proposal.ps1 not found: $ProposalScript"
}

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("display-policy-proposal-test-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path (Join-Path $TempRoot ".ai\routing\state") -Force | Out-Null
$LogPath = Join-Path $TempRoot ".ai\routing\state\router-decisions.jsonl"
$PreviewJson = Join-Path $TempRoot "display-policy-proposal-preview.json"
$CommitJson = Join-Path $TempRoot "display-policy-proposal-commit.json"
$GateStatePath = Join-Path $TempRoot ".ai\routing\state\gate-state.json"
$CustomGateStatePath = Join-Path $TempRoot "custom\display-gate-state.json"

function Write-JsonLine {
    param(
        [Parameter(Mandatory)][object]$Object,
        [Parameter(Mandatory)][string]$Path
    )
    Add-Content -Path $Path -Encoding UTF8 -Value ($Object | ConvertTo-Json -Compress -Depth 8)
}

try {
    foreach ($i in 1..3) {
        Write-JsonLine -Path $LogPath -Object ([pscustomobject]@{
            timestamp = "2026-05-18T00:00:00Z"
            input = "too many options"
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
            timestamp = "2026-05-18T00:01:00Z"
            input = "lighter path"
            kind = "agent"
            name = "pied-piper"
            status = "approved"
            user_reply_type = "approve"
            shadow_trial = $true
            user_judgement = "lighter"
            actual_asset = "agent:pied-piper"
        })
    }

    $preview = & powershell.exe -NoProfile -File $ProposalScript -RepoRoot $TempRoot -LogPath $LogPath -TopN 3 -MinShadowTrials 3 -MinEvidence 2 -ProposalId "display-policy-v9-preview" -OutputJson $PreviewJson 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "preview proposal failed with $LASTEXITCODE. Output: $preview"
    }
    if (-not (Test-Path $PreviewJson)) {
        throw "preview proposal JSON was not written"
    }
    $previewReport = Get-Content -Path $PreviewJson -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($previewReport.committed_to_gate_state -ne $false) {
        throw "preview should not commit gate-state"
    }
    if ($previewReport.mode -ne "approve_required") {
        throw "expected approve_required mode, got $($previewReport.mode)"
    }
    if (@($previewReport.options).Count -lt 1 -or @($previewReport.options).Count -gt 3) {
        throw "expected 1..3 options, got $(@($previewReport.options).Count)"
    }
    if ($previewReport.options[0].kind -ne "display_policy") {
        throw "expected display_policy option kind"
    }
    if (Test-Path $GateStatePath) {
        throw "preview unexpectedly created gate-state.json"
    }

    $commit = & powershell.exe -NoProfile -File $ProposalScript -RepoRoot $TempRoot -LogPath $LogPath -GateStatePath $CustomGateStatePath -TopN 3 -MinShadowTrials 3 -MinEvidence 2 -ProposalId "display-policy-v9-commit" -OutputJson $CommitJson -CommitState 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "commit proposal failed with $LASTEXITCODE. Output: $commit"
    }
    if (Test-Path $GateStatePath) {
        throw "commit ignored custom GateStatePath and wrote default gate-state.json"
    }
    if (-not (Test-Path $CustomGateStatePath)) {
        throw "commit did not create custom gate-state.json"
    }
    $commitReport = Get-Content -Path $CommitJson -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($commitReport.committed_to_gate_state -ne $true) {
        throw "commit report should mark committed_to_gate_state=true"
    }
    $gateState = Get-Content -Path $CustomGateStatePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($gateState.proposal_state.status -ne "proposed") {
        throw "expected proposed gate-state, got $($gateState.proposal_state.status)"
    }
    if ($gateState.proposal_state.mode -ne "approve_required") {
        throw "expected approve_required gate-state, got $($gateState.proposal_state.mode)"
    }
    if (@($gateState.proposal_state.options).Count -lt 1 -or @($gateState.proposal_state.options).Count -gt 3) {
        throw "expected 1..3 gate-state options"
    }

    Write-Host "display-policy-proposal V9 smoke passed"
}
finally {
    if (Test-Path $TempRoot) {
        Remove-Item -Path $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
