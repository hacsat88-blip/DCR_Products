#Requires -Version 5.1
<#
.SYNOPSIS
  Convert V8 display-policy advice into a V9 approval proposal.

.DESCRIPTION
  Runs display-policy-advisor.ps1, turns the top display actions into the
  Cognitive Load Contract proposal format, and optionally writes the proposal
  to .ai/routing/state/gate-state.json. This script does not apply display policy,
  delete assets, mark assets deprecated, or change routing behavior.

.PARAMETER LogPath
  Router decision JSONL path. Defaults to .ai/routing/state/router-decisions.jsonl.

.PARAMETER GateStatePath
  Optional gate-state path. Defaults to .ai/routing/state/gate-state.json under
  RepoRoot. Used only when -CommitState is specified.

.PARAMETER OutputJson
  Optional path to write the proposal payload as JSON.

.PARAMETER CommitState
  Persist the proposal into gate-state proposal_state. Without this switch,
  the script is preview-only.
#>

param(
    [string]$RepoRoot = "",
    [string]$LogPath = "",
    [string]$GateStatePath = "",
    [string]$OutputJson = "",
    [string]$ProposalId = "",
    [int]$TopN = 3,
    [int]$MinShadowTrials = 5,
    [int]$MinEvidence = 2,
    [switch]$CommitState,
    [switch]$IncludeSynthetic
)

$ErrorActionPreference = "Stop"
$ScriptRepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = $ScriptRepoRoot
}
if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $RepoRoot ".ai/routing/state/router-decisions.jsonl"
}
if ([string]::IsNullOrWhiteSpace($GateStatePath)) {
    $GateStatePath = Join-Path $RepoRoot ".ai/routing/state/gate-state.json"
}
if ([string]::IsNullOrWhiteSpace($ProposalId)) {
    $ProposalId = "display-policy-" + (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
}
if ($TopN -lt 1) { $TopN = 1 }
if ($TopN -gt 3) { $TopN = 3 }

function Convert-ActionToTitle {
    param([Parameter(Mandatory)][string]$Action)

    switch ($Action) {
        "collect_shadow_trials" { return "collect shadow trials" }
        "suppress_secondary_options" { return "suppress secondary options" }
        "show_underlying_asset" { return "show underlying asset" }
        "make_lightweight_default" { return "make lightweight path default" }
        "demote_candidate" { return "demote candidate" }
        "clarify_display_copy" { return "clarify display copy" }
        "keep_as_default" { return "keep as default" }
        "no_display_change" { return "observe without display change" }
        default { return $Action }
    }
}

function Convert-RecommendationToOption {
    param(
        [Parameter(Mandatory)][object]$Recommendation,
        [Parameter(Mandatory)][string]$Id
    )

    $action = if ($Recommendation.action) { [string]$Recommendation.action } else { "no_display_change" }
    $target = if ($Recommendation.target) { [string]$Recommendation.target } else { "routing-display" }
    $reason = if ($Recommendation.reason) { [string]$Recommendation.reason } else { "display policy advisor recommendation" }
    $nextStep = if ($Recommendation.next_step) { [string]$Recommendation.next_step } else { "keep the proposal small and reversible" }
    $title = Convert-ActionToTitle -Action $action

    return [pscustomobject]@{
        id = $Id
        kind = "display_policy"
        name = "$action`:$target"
        reason = "$title - $reason"
        expected_effect = $nextStep
        action = $action
        target = $target
        evidence_count = if ($Recommendation.PSObject.Properties["evidence_count"]) { [int]$Recommendation.evidence_count } else { 0 }
        confidence = if ($Recommendation.confidence) { [string]$Recommendation.confidence } else { "low" }
        safety = if ($Recommendation.safety) { [string]$Recommendation.safety } else { "display_policy_only_no_delete_no_deprecate" }
    }
}

function Write-Utf8NoBomJson {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][object]$Value
    )

    $dir = Split-Path $Path -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, (($Value | ConvertTo-Json -Depth 10) + [Environment]::NewLine), $utf8)
}

$AdvisorScript = Join-Path $ScriptRepoRoot "tools\display-policy-advisor.ps1"
if (-not (Test-Path $AdvisorScript)) {
    throw "display-policy-advisor.ps1 not found: $AdvisorScript"
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("display-policy-proposal-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$advisorJson = Join-Path $tempDir "display-policy-advisor.json"

try {
    $advisorArgs = @(
        "-NoProfile",
        "-File", $AdvisorScript,
        "-LogPath", $LogPath,
        "-TopN", $TopN,
        "-MinShadowTrials", $MinShadowTrials,
        "-MinEvidence", $MinEvidence,
        "-OutputJson", $advisorJson
    )
    if ($IncludeSynthetic) {
        $advisorArgs += "-IncludeSynthetic"
    }
    $advisorOutput = & powershell.exe @advisorArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "display-policy-advisor.ps1 failed with $LASTEXITCODE. Output: $advisorOutput"
    }
    if (-not (Test-Path $advisorJson)) {
        throw "display-policy-advisor.ps1 did not write JSON: $advisorJson"
    }

    $advisorReport = Get-Content -Path $advisorJson -Raw -Encoding UTF8 | ConvertFrom-Json
    $recommendations = @($advisorReport.top_recommendations)
    if ($recommendations.Count -eq 0) {
        $recommendations = @([pscustomobject]@{
            action = "no_display_change"
            target = "routing-display"
            reason = "display advisor returned no actions"
            next_step = "keep collecting shadow trials"
            evidence_count = 0
            confidence = "low"
            safety = "display_policy_only_no_delete_no_deprecate"
        })
    }

    $ids = @("A", "B", "C")
    $options = @()
    for ($i = 0; $i -lt [Math]::Min($TopN, $recommendations.Count); $i++) {
        $options += (Convert-RecommendationToOption -Recommendation $recommendations[$i] -Id $ids[$i])
    }

    $recommended = if ($options.Count -gt 0) { [string]$options[0].id } else { "A" }
    $mode = "approve_required"
    $proposal = [pscustomobject]@{
        proposal_id = $ProposalId
        status = "proposed"
        mode = $mode
        recommended_option = $recommended
        options = @($options)
        source = [pscustomobject]@{
            advisor = "display-policy-advisor"
            log_path = $LogPath
            shadow_trials_analyzed = if ($advisorReport.PSObject.Properties["shadow_trials_analyzed"]) { [int]$advisorReport.shadow_trials_analyzed } else { 0 }
            safety_policy = if ($advisorReport.safety_policy) { [string]$advisorReport.safety_policy } else { "display_policy_only_no_delete_no_deprecate" }
        }
        safety_policy = "proposal_only_no_display_change_until_approved"
    }

    if ($CommitState) {
        $GateStateLib = Join-Path $ScriptRepoRoot "tools\lib\gate-state.ps1"
        if (-not (Test-Path $GateStateLib)) {
            throw "gate-state.ps1 not found: $GateStateLib"
        }
        . $GateStateLib
        $gateDir = Split-Path $GateStatePath -Parent
        if ($gateDir -and -not (Test-Path $gateDir)) {
            New-Item -ItemType Directory -Path $gateDir -Force | Out-Null
        }
        $proposalState = Set-ProposalState -RepoRoot $RepoRoot -GateStatePath $GateStatePath -ProposalId $ProposalId -Status "proposed" -Mode $mode -Options @($options) -RecommendedOption $recommended
        $proposal | Add-Member -NotePropertyName committed_to_gate_state -NotePropertyValue $true -Force
        $proposal | Add-Member -NotePropertyName gate_state -NotePropertyValue $proposalState -Force
    }
    else {
        $proposal | Add-Member -NotePropertyName committed_to_gate_state -NotePropertyValue $false -Force
    }

    if (-not [string]::IsNullOrWhiteSpace($OutputJson)) {
        Write-Utf8NoBomJson -Path $OutputJson -Value $proposal
    }

    $first = $options | Select-Object -First 1
    Write-Host ""
    Write-Host "=== Display Policy Proposal V9 ===" -ForegroundColor Cyan
    Write-Host "Proposal: $ProposalId"
    Write-Host "Mode: $mode"
    Write-Host "Committed: $($proposal.committed_to_gate_state)"
    Write-Host ""
    if ($first) {
        Write-Host ("Candidate: {0}) {1} (mode: {2})" -f $first.id, $first.reason, $mode)
        Write-Host ("Reason: {0}" -f $first.reason)
        Write-Host ("Expected effect: {0}" -f $first.expected_effect)
        Write-Host "Approval required: display policy changes the routing experience"
        Write-Host "Choices: A) approve recommended / B) lighter path / C) see alternatives"
    }
    else {
        Write-Host "Candidate: none"
    }
}
finally {
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
