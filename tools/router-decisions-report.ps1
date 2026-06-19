#Requires -Version 5.1
<#
.SYNOPSIS
  Router decisions report — cognitive-load visibility for proposal / approval flow.

.DESCRIPTION
  Reads .ai/routing/state/router-decisions.jsonl and prints a compact summary:
  status distribution, pending approvals, top candidates, rejected candidates,
  user reply classifications, proposal-state transitions, cognitive-load
  metrics, stale proposal state, and reduction suggestions. Does not mutate repo
  state unless -OutputJson is provided.

.PARAMETER LogPath
  Router decision JSONL path. Defaults to .ai/routing/state/router-decisions.jsonl.

.PARAMETER OutputJson
  Optional path to write the same summary as JSON.

.PARAMETER GateStatePath
  Gate state JSON path. Defaults to .ai/routing/state/gate-state.json.

.PARAMETER TopN
  Number of ranked items to include in detailed output. Defaults to 10.

.PARAMETER StaleHours
  Active proposal age threshold for stale proposal diagnostics. Defaults to 24.

.PARAMETER MinRealDecisions
  Minimum non-synthetic decisions required before reduction suggestions are
  trusted. Defaults to 5.

.PARAMETER IncludeSynthetic
  Include smoke/test/fixture decisions in reduction suggestions.
#>

param(
    [string]$LogPath = "",
    [string]$OutputJson = "",
    [string]$GateStatePath = "",
    [int]$TopN = 10,
    [double]$StaleHours = 24,
    [int]$MinRealDecisions = 5,
    [switch]$IncludeSynthetic
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $RepoRoot ".ai/routing/state/router-decisions.jsonl"
}
if ([string]::IsNullOrWhiteSpace($GateStatePath)) {
    $GateStatePath = Join-Path $RepoRoot ".ai/routing/state/gate-state.json"
}
if ($TopN -lt 1) { $TopN = 1 }
if ($StaleHours -lt 0) { $StaleHours = 0 }
if ($MinRealDecisions -lt 1) { $MinRealDecisions = 1 }

if (-not (Test-Path $LogPath)) {
    Write-Host "No router decisions log found: $LogPath" -ForegroundColor Yellow
    exit 0
}

$entries = @()
foreach ($line in (Get-Content -Path $LogPath -Encoding utf8)) {
    $trimmed = $line.Trim()
    if (-not $trimmed) { continue }
    try {
        $entries += ($trimmed | ConvertFrom-Json)
    } catch {
        Write-Warning "Skipping invalid JSONL line: $trimmed"
    }
}

if ($entries.Count -eq 0) {
    Write-Host "Router decisions log is empty." -ForegroundColor Yellow
    exit 0
}

function Convert-GroupToObject {
    param([object[]]$Groups)
    return @($Groups | ForEach-Object {
        [pscustomobject]@{ name = $_.Name; count = $_.Count }
    })
}

function Get-EntryValue {
    param(
        [Parameter(Mandatory)][object]$Entry,
        [Parameter(Mandatory)][string]$Name,
        [object]$Default = $null
    )
    if ($Entry.PSObject.Properties[$Name] -and $null -ne $Entry.$Name) {
        return $Entry.$Name
    }
    return $Default
}

function Convert-ToRate {
    param(
        [int]$Numerator,
        [int]$Denominator
    )
    if ($Denominator -le 0) { return 0 }
    return [Math]::Round(($Numerator / $Denominator), 4)
}

function Test-SyntheticDecision {
    param([Parameter(Mandatory)][object]$Entry)
    $values = @()
    foreach ($field in @("input","reason","proposal_id","expected_effect")) {
        if ($Entry.PSObject.Properties[$field] -and $Entry.$field) {
            $values += [string]$Entry.$field
        }
    }
    $joined = ($values -join " ")
    return [bool]($joined -match '(?i)\b(smoke|test|fixture)\b')
}

function New-RankedInput {
    param(
        [object[]]$InputEntries,
        [int]$Limit
    )
    return @($InputEntries |
        Where-Object { $_.input } |
        Group-Object -Property input |
        Sort-Object -Property @{Expression='Count';Descending=$true}, @{Expression='Name';Ascending=$true} |
        Select-Object -First $Limit |
        ForEach-Object { [pscustomobject]@{ input = $_.Name; count = $_.Count } })
}

function Get-StaleProposalState {
    param(
        [string]$Path,
        [double]$ThresholdHours
    )
    $result = [pscustomobject]@{
        checked = $false
        is_stale = $false
        status = "none"
        proposal_id = ""
        age_hours = 0
        threshold_hours = $ThresholdHours
        updated_at = ""
        reason = "gate-state.json not found"
    }
    if (-not (Test-Path $Path)) { return $result }

    $result.checked = $true
    try {
        $state = (Get-Content -Path $Path -Raw -Encoding utf8) | ConvertFrom-Json
    } catch {
        $result.reason = "gate-state.json parse failed"
        return $result
    }
    if (-not $state.PSObject.Properties['proposal_state'] -or -not $state.proposal_state) {
        $result.reason = "proposal_state missing"
        return $result
    }

    $proposal = $state.proposal_state
    $result.status = if ($proposal.status) { [string]$proposal.status } else { "none" }
    $result.proposal_id = if ($proposal.proposal_id) { [string]$proposal.proposal_id } else { "" }
    $result.updated_at = if ($proposal.updated_at) { [string]$proposal.updated_at } else { "" }

    if ($result.status -notin @('proposed','refined')) {
        $result.reason = "no active proposal"
        return $result
    }
    if ([string]::IsNullOrWhiteSpace($result.updated_at)) {
        $result.reason = "active proposal has no updated_at"
        $result.is_stale = $true
        return $result
    }

    $updated = [DateTime]::MinValue
    if (-not [DateTime]::TryParse($result.updated_at, [ref]$updated)) {
        $result.reason = "active proposal updated_at is not parseable"
        $result.is_stale = $true
        return $result
    }

    $age = ((Get-Date).ToUniversalTime() - $updated.ToUniversalTime()).TotalHours
    $result.age_hours = [Math]::Round($age, 2)
    $result.is_stale = ($age -ge $ThresholdHours)
    $result.reason = if ($result.is_stale) { "active proposal exceeded stale threshold" } else { "active proposal is fresh" }
    return $result
}

$statusCounts = Convert-GroupToObject (@($entries | Group-Object -Property status | Sort-Object Count -Descending))
$replyCounts = Convert-GroupToObject (@($entries | Where-Object { $_.user_reply_type } | Group-Object -Property user_reply_type | Sort-Object Count -Descending))
$transitionCounts = Convert-GroupToObject (@($entries | Where-Object { $_.previous_status -or $_.next_status } | ForEach-Object {
    $prev = if ($_.previous_status) { $_.previous_status } else { "none" }
    $next = if ($_.next_status) { $_.next_status } else { "none" }
    "$prev->$next"
} | Group-Object | Sort-Object Count -Descending))
$topCandidates = Convert-GroupToObject (@($entries | Group-Object -Property name | Sort-Object Count -Descending | Select-Object -First $TopN))
$rejectedCandidates = Convert-GroupToObject (@($entries | Where-Object { $_.status -eq 'rejected' -or $_.user_reply_type -eq 'reject' } | Group-Object -Property name | Sort-Object Count -Descending | Select-Object -First $TopN))
$pending = @($entries | Where-Object { $_.approval_required -eq $true -and $_.status -eq 'proposed' })
$approved = @($entries | Where-Object { $_.status -in @('approved','executed') -or $_.user_reply_type -eq 'approve' })
$ambiguous = @($entries | Where-Object { $_.status -eq 'ambiguous' -or $_.user_reply_type -eq 'ambiguous' })
$refined = @($entries | Where-Object { $_.status -eq 'refined' -or $_.user_reply_type -eq 'refine' })
$rejected = @($entries | Where-Object { $_.status -eq 'rejected' -or $_.user_reply_type -eq 'reject' })
$shadowTrials = @($entries | Where-Object { $_.shadow_trial -eq $true })
$shadowJudgementCounts = Convert-GroupToObject (@($shadowTrials | Where-Object { $_.user_judgement } | Group-Object -Property user_judgement | Sort-Object Count -Descending))

$ambiguousInputs = New-RankedInput -InputEntries $ambiguous -Limit $TopN
$refineInputs = New-RankedInput -InputEntries $refined -Limit $TopN
$approvalRequiredCandidates = Convert-GroupToObject (@($entries |
    Where-Object { $_.approval_required -eq $true } |
    Group-Object -Property name |
    Sort-Object Count -Descending |
    Select-Object -First $TopN))
$highOptionCandidates = @($entries |
    Where-Object { $_.options_count } |
    Group-Object -Property name |
    ForEach-Object {
        $values = @($_.Group | ForEach-Object { [int](Get-EntryValue -Entry $_ -Name 'options_count' -Default 0) })
        [pscustomobject]@{
            name = $_.Name
            count = $_.Count
            max_options_count = ($values | Measure-Object -Maximum).Maximum
            average_options_count = [Math]::Round((($values | Measure-Object -Average).Average), 2)
        }
    } |
    Sort-Object -Property @{Expression='max_options_count';Descending=$true}, @{Expression='count';Descending=$true}, @{Expression='name';Ascending=$true} |
    Select-Object -First $TopN)

$syntheticEntries = @($entries | Where-Object { Test-SyntheticDecision -Entry $_ })
$reductionEntries = @(if ($IncludeSynthetic) { $entries } else { $entries | Where-Object { -not (Test-SyntheticDecision -Entry $_) } })
$reductionAmbiguous = @($reductionEntries | Where-Object { $_.status -eq 'ambiguous' -or $_.user_reply_type -eq 'ambiguous' })
$reductionRefined = @($reductionEntries | Where-Object { $_.status -eq 'refined' -or $_.user_reply_type -eq 'refine' })
$reductionRejected = @($reductionEntries | Where-Object { $_.status -eq 'rejected' -or $_.user_reply_type -eq 'reject' })
$reductionTopCandidates = Convert-GroupToObject (@($reductionEntries | Group-Object -Property name | Sort-Object Count -Descending | Select-Object -First $TopN))
$troubleCandidates = Convert-GroupToObject (@(($reductionAmbiguous + $reductionRejected) |
    Where-Object { $_.name } |
    Group-Object -Property name |
    Sort-Object Count -Descending |
    Select-Object -First $TopN))
$staleProposal = Get-StaleProposalState -Path $GateStatePath -ThresholdHours $StaleHours

$cognitiveLoad = [pscustomobject]@{
    ambiguous_count = $ambiguous.Count
    refine_count = $refined.Count
    rejected_count = $rejected.Count
    approval_rate = Convert-ToRate -Numerator $approved.Count -Denominator $entries.Count
    ambiguity_rate = Convert-ToRate -Numerator $ambiguous.Count -Denominator $entries.Count
    refine_rate = Convert-ToRate -Numerator $refined.Count -Denominator $entries.Count
    rejection_rate = Convert-ToRate -Numerator $rejected.Count -Denominator $entries.Count
    stale_proposal = $staleProposal
    ambiguous_inputs = @($ambiguousInputs)
    refine_inputs = @($refineInputs)
    approval_required_candidates = @($approvalRequiredCandidates)
    high_option_candidates = @($highOptionCandidates)
}

$suggestions = @()
if ($reductionEntries.Count -lt $MinRealDecisions) {
    $suggestions += [pscustomobject]@{
        type = "collect_real_usage"
        target = "router-decisions"
        reason = "not enough non-synthetic decisions for safe reduction suggestions"
        evidence_count = $reductionEntries.Count
    }
}
elseif ($troubleCandidates.Count -gt 0) {
    $top = $troubleCandidates[0]
    $suggestions += [pscustomobject]@{
        type = "reduce_candidate"
        target = $top.name
        reason = "high ambiguous/rejected count"
        evidence_count = $top.count
    }
}
if ($reductionEntries.Count -ge $MinRealDecisions -and $reductionTopCandidates.Count -gt 0 -and $reductionTopCandidates[0].count -gt 1) {
    $top = $reductionTopCandidates[0]
    $suggestions += [pscustomobject]@{
        type = "bundle_candidate"
        target = $top.name
        reason = "routing is concentrated on the same candidate"
        evidence_count = $top.count
    }
}
$reductionAmbiguousInputs = New-RankedInput -InputEntries $reductionAmbiguous -Limit $TopN
$reductionRefineInputs = New-RankedInput -InputEntries $reductionRefined -Limit $TopN
$unclearInputs = @((@($reductionAmbiguousInputs) + @($reductionRefineInputs)) | Sort-Object -Property @{Expression='count';Descending=$true}, @{Expression='input';Ascending=$true} | Select-Object -First 1)
if ($reductionEntries.Count -ge $MinRealDecisions -and $unclearInputs.Count -gt 0) {
    $top = $unclearInputs[0]
    $suggestions += [pscustomobject]@{
        type = "clarify_candidate"
        target = $top.input
        reason = "input often becomes ambiguous/refine"
        evidence_count = $top.count
    }
}
$reductionSuggestions = @($suggestions | Select-Object -First 3)

$summary = [pscustomobject]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    total = $entries.Count
    pending_approval_count = $pending.Count
    synthetic_decision_count = $syntheticEntries.Count
    reduction_analyzed_count = $reductionEntries.Count
    include_synthetic = [bool]$IncludeSynthetic
    minimum_real_decisions = $MinRealDecisions
    shadow_trial_count = $shadowTrials.Count
    shadow_user_judgement_counts = @($shadowJudgementCounts)
    status_counts = @($statusCounts)
    user_reply_type_counts = @($replyCounts)
    proposal_transition_counts = @($transitionCounts)
    top_candidates = @($topCandidates)
    rejected_candidates = @($rejectedCandidates)
    cognitive_load = $cognitiveLoad
    reduction_suggestions = @($reductionSuggestions)
}

Write-Host ""
Write-Host "=== Router Decisions Report V3 ===" -ForegroundColor Cyan
Write-Host "Log: $LogPath" -ForegroundColor DarkGray
Write-Host "Total: $($summary.total)"
$syntheticMode = if ($IncludeSynthetic) { "included" } else { "ignored" }
Write-Host "Reduction basis: $($summary.reduction_analyzed_count) analyzed (synthetic $($syntheticMode): $($summary.synthetic_decision_count))"
Write-Host "Shadow trials: $($summary.shadow_trial_count)"
Write-Host "Pending approval: $($summary.pending_approval_count)" -ForegroundColor $(if ($summary.pending_approval_count -gt 0) { 'Yellow' } else { 'Green' })
Write-Host ("Cognitive load: approval={0:P1} ambiguous={1:P1} refine={2:P1} reject={3:P1}" -f $summary.cognitive_load.approval_rate, $summary.cognitive_load.ambiguity_rate, $summary.cognitive_load.refine_rate, $summary.cognitive_load.rejection_rate)
if ($summary.cognitive_load.stale_proposal.is_stale) {
    Write-Host ("Stale proposal: {0} ({1}h, status={2})" -f $summary.cognitive_load.stale_proposal.proposal_id, $summary.cognitive_load.stale_proposal.age_hours, $summary.cognitive_load.stale_proposal.status) -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Status counts" -ForegroundColor Cyan
$summary.status_counts | Format-Table -AutoSize | Out-String | Write-Host

Write-Host "User reply types" -ForegroundColor Cyan
if ($summary.user_reply_type_counts.Count -gt 0) {
    $summary.user_reply_type_counts | Format-Table -AutoSize | Out-String | Write-Host
} else {
    Write-Host "  none logged yet" -ForegroundColor DarkGray
}

Write-Host "Top candidates" -ForegroundColor Cyan
$summary.top_candidates | Format-Table -AutoSize | Out-String | Write-Host

Write-Host "Proposal transitions" -ForegroundColor Cyan
if ($summary.proposal_transition_counts.Count -gt 0) {
    $summary.proposal_transition_counts | Format-Table -AutoSize | Out-String | Write-Host
} else {
    Write-Host "  none logged yet" -ForegroundColor DarkGray
}

Write-Host "Shadow judgements" -ForegroundColor Cyan
if ($summary.shadow_user_judgement_counts.Count -gt 0) {
    $summary.shadow_user_judgement_counts | Format-Table -AutoSize | Out-String | Write-Host
} else {
    Write-Host "  none logged yet" -ForegroundColor DarkGray
}

Write-Host "Rejected candidates" -ForegroundColor Cyan
if ($summary.rejected_candidates.Count -gt 0) {
    $summary.rejected_candidates | Format-Table -AutoSize | Out-String | Write-Host
} else {
    Write-Host "  none" -ForegroundColor DarkGray
}

Write-Host "Next reduction suggestions" -ForegroundColor Cyan
if ($summary.reduction_suggestions.Count -gt 0) {
    $summary.reduction_suggestions | Format-Table -AutoSize | Out-String | Write-Host
} else {
    Write-Host "  none yet" -ForegroundColor DarkGray
}

if (-not [string]::IsNullOrWhiteSpace($OutputJson)) {
    $outDir = Split-Path $OutputJson -Parent
    if ($outDir -and -not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($OutputJson, (($summary | ConvertTo-Json -Depth 6) + [Environment]::NewLine), $utf8)
    Write-Host ""
    Write-Host "JSON report: $OutputJson" -ForegroundColor Green
}
