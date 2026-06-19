#Requires -Version 5.1
<#
.SYNOPSIS
  Record a V7.1 shadow routing trial.

.DESCRIPTION
  Appends a non-synthetic, observation-first routing decision to
  .ai/routing/state/router-decisions.jsonl. Use this to collect real-ish routing
  feedback before hiding, bundling, deprecating, or deleting any asset.
#>

param(
    [string]$RepoRoot = "",
    [Parameter(Mandatory)][Alias("Input")][string]$InputText,
    [ValidateSet('rule','skill','agent')][string]$Kind = "agent",
    [string]$Name = "pied-piper",
    [ValidateRange(0, 1)][double]$Confidence = 0.5,
    [ValidateSet('proposed','approved','rejected','executed')][string]$Status = "proposed",
    [switch]$ApprovalRequired,
    [ValidateSet('low','medium','high')][string]$Risk = "low",
    [ValidateSet('small','medium','large')][string]$Scale = "small",
    [ValidateSet('low','medium','high')][string]$Ambiguity = "medium",
    [string]$ProposalId = "",
    [ValidateRange(0, 3)][int]$OptionsCount = 1,
    [ValidateSet('none','approve','reject','refine','ambiguous')][string]$UserReplyType = "none",
    [string]$SelectedOption = "",
    [ValidateSet('none','proposed','approved','rejected','refined','expired')][string]$PreviousStatus = "none",
    [ValidateSet('none','proposed','approved','rejected','refined','expired')][string]$NextStatus = "none",
    [switch]$SelectedByUser,
    [ValidateSet('just_right','too_many','off_target','lighter','too_heavy','unclear')][string]$UserJudgement = "unclear",
    [string]$ActualAsset = "",
    [string]$Reason = "shadow routing trial",
    [string]$ExpectedEffect = "collect real routing feedback before reduction",
    [string]$UserNote = "",
    [string]$Phase = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"
if (-not (Test-Path $GateStateLib)) {
    $GateStateLib = Join-Path $PSScriptRoot "lib\gate-state.ps1"
}
if (-not (Test-Path $GateStateLib)) {
    throw "gate-state.ps1 not found for RepoRoot: $RepoRoot"
}
. $GateStateLib

Write-RouterDecision -RepoRoot $RepoRoot `
    -Input $InputText `
    -Kind $Kind `
    -Name $Name `
    -Confidence $Confidence `
    -Reason $Reason `
    -ExpectedEffect $ExpectedEffect `
    -ApprovalRequired:$ApprovalRequired `
    -Status $Status `
    -Risk $Risk `
    -Scale $Scale `
    -Ambiguity $Ambiguity `
    -ProposalId $ProposalId `
    -OptionsCount $OptionsCount `
    -UserReplyType $UserReplyType `
    -SelectedOption $SelectedOption `
    -PreviousStatus $PreviousStatus `
    -NextStatus $NextStatus `
    -SelectedByUser:$SelectedByUser `
    -ShadowTrial `
    -UserJudgement $UserJudgement `
    -ActualAsset $ActualAsset `
    -UserNote $UserNote `
    -Phase $Phase

Write-Host "shadow routing trial recorded: $Name ($UserJudgement)"
