#Requires -Version 5.1
<#
.SYNOPSIS
  Display Policy Advisor V8 for DCR routing candidates.

.DESCRIPTION
  Reads router-decisions.jsonl shadow trials and recommends small, non-mutating
  display-policy actions. This script does not delete files, mark assets
  deprecated, or change routing. It only turns shadow feedback into proposals
  such as hiding secondary options, exposing the underlying asset behind
  pied-piper, or making a lighter path the default.

.PARAMETER LogPath
  Router decision JSONL path. Defaults to .ai/kernel/router-decisions.jsonl.

.PARAMETER OutputJson
  Optional path to write the full report as JSON.

.PARAMETER TopN
  Maximum number of actions to print. Defaults to 3.

.PARAMETER MinShadowTrials
  Minimum non-synthetic shadow trials required before display advice is trusted.
  Defaults to 5.

.PARAMETER MinEvidence
  Minimum repeated judgement count before an asset gets a display action.
  Defaults to 2.

.PARAMETER IncludeSynthetic
  Include smoke/test/fixture entries in calculations. Use only for harness
  debugging.
#>

param(
    [string]$LogPath = "",
    [string]$OutputJson = "",
    [int]$TopN = 3,
    [int]$MinShadowTrials = 5,
    [int]$MinEvidence = 2,
    [switch]$IncludeSynthetic
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $RepoRoot ".ai/kernel/router-decisions.jsonl"
}
if ($TopN -lt 1) { $TopN = 1 }
if ($MinShadowTrials -lt 1) { $MinShadowTrials = 1 }
if ($MinEvidence -lt 1) { $MinEvidence = 1 }

function Read-RouterEntries {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path $Path)) { return @() }
    $items = @()
    foreach ($line in (Get-Content -Path $Path -Encoding utf8)) {
        $trimmed = $line.Trim()
        if (-not $trimmed) { continue }
        try {
            $items += ($trimmed | ConvertFrom-Json)
        }
        catch {}
    }
    return @($items)
}

function Test-SyntheticDecision {
    param([Parameter(Mandatory)][object]$Entry)

    $values = @()
    foreach ($field in @("input", "reason", "proposal_id", "expected_effect")) {
        if ($Entry.PSObject.Properties[$field] -and $Entry.$field) {
            $values += [string]$Entry.$field
        }
    }
    $joined = ($values -join " ")
    return [bool]($joined -match '(?i)\b(smoke|test|fixture)\b')
}

function Get-EntryString {
    param(
        [Parameter(Mandatory)][object]$Entry,
        [Parameter(Mandatory)][string]$Name,
        [string]$Default = ""
    )

    if ($Entry.PSObject.Properties[$Name] -and $Entry.$Name) {
        return [string]$Entry.$Name
    }
    return $Default
}

function Get-DisplayTarget {
    param([Parameter(Mandatory)][object]$Entry)

    $actual = Get-EntryString -Entry $Entry -Name "actual_asset"
    if (-not [string]::IsNullOrWhiteSpace($actual)) {
        return $actual
    }

    $kind = Get-EntryString -Entry $Entry -Name "kind"
    $name = Get-EntryString -Entry $Entry -Name "name"
    if (-not [string]::IsNullOrWhiteSpace($kind) -and -not [string]::IsNullOrWhiteSpace($name)) {
        return "$kind`:$name"
    }
    if (-not [string]::IsNullOrWhiteSpace($name)) {
        return $name
    }
    return "unknown"
}

function Convert-GroupToCountMap {
    param([object[]]$Entries)

    $map = @{}
    foreach ($group in @($Entries | Where-Object { $_.user_judgement } | Group-Object -Property user_judgement)) {
        $map[$group.Name] = $group.Count
    }
    return $map
}

function Get-CountValue {
    param(
        [Parameter(Mandatory)][object]$Map,
        [Parameter(Mandatory)][string]$Name
    )

    if ($Map.ContainsKey($Name)) {
        return [int]$Map[$Name]
    }
    return 0
}

function New-DisplayRecommendation {
    param(
        [Parameter(Mandatory)][string]$Action,
        [Parameter(Mandatory)][string]$Target,
        [Parameter(Mandatory)][string]$Reason,
        [int]$EvidenceCount = 0,
        [string]$Confidence = "medium",
        [string]$NextStep = "",
        [string]$DoNot = "do not delete, deprecate, or change routing without explicit approval"
    )

    return [pscustomobject]@{
        action = $Action
        target = $Target
        reason = $Reason
        evidence_count = $EvidenceCount
        confidence = $Confidence
        safety = "display_policy_only_no_delete_no_deprecate"
        next_step = $NextStep
        do_not = $DoNot
    }
}

$entries = Read-RouterEntries -Path $LogPath
$syntheticEntries = @($entries | Where-Object { Test-SyntheticDecision -Entry $_ })
$shadowEntriesAll = @($entries | Where-Object { $_.shadow_trial -eq $true })
$shadowEntries = @(if ($IncludeSynthetic) { $shadowEntriesAll } else { $shadowEntriesAll | Where-Object { -not (Test-SyntheticDecision -Entry $_) } })

$recommendations = @()
$assetSignals = @()
$overallJudgementCounts = Convert-GroupToCountMap -Entries $shadowEntries

if ($shadowEntries.Count -lt $MinShadowTrials) {
    $recommendations += (New-DisplayRecommendation `
        -Action "collect_shadow_trials" `
        -Target "router-decisions" `
        -Reason "not enough non-synthetic shadow trials for display-policy advice" `
        -EvidenceCount $shadowEntries.Count `
        -Confidence "low" `
        -NextStep "record real-ish shadow trials with user_judgement before hiding or bundling visible options" `
        -DoNot "do not change display policy based on sparse or synthetic telemetry")
}
else {
    $targetRows = @($shadowEntries | ForEach-Object {
        [pscustomobject]@{
            target = Get-DisplayTarget -Entry $_
            judgement = Get-EntryString -Entry $_ -Name "user_judgement" -Default "unclear"
            input = Get-EntryString -Entry $_ -Name "input"
            name = Get-EntryString -Entry $_ -Name "name"
            actual_asset = Get-EntryString -Entry $_ -Name "actual_asset"
        }
    })

    foreach ($group in @($targetRows | Group-Object -Property target | Sort-Object -Property @{Expression='Count';Descending=$true}, @{Expression='Name';Ascending=$true})) {
        $judgementMap = @{}
        foreach ($jg in @($group.Group | Group-Object -Property judgement)) {
            $judgementMap[$jg.Name] = $jg.Count
        }

        $tooMany = Get-CountValue -Map $judgementMap -Name "too_many"
        $offTarget = Get-CountValue -Map $judgementMap -Name "off_target"
        $lighter = Get-CountValue -Map $judgementMap -Name "lighter"
        $tooHeavy = Get-CountValue -Map $judgementMap -Name "too_heavy"
        $unclear = Get-CountValue -Map $judgementMap -Name "unclear"
        $justRight = Get-CountValue -Map $judgementMap -Name "just_right"

        $assetSignals += [pscustomobject]@{
            target = $group.Name
            count = $group.Count
            just_right = $justRight
            too_many = $tooMany
            off_target = $offTarget
            lighter = $lighter
            too_heavy = $tooHeavy
            unclear = $unclear
        }

        if ($tooMany -ge $MinEvidence) {
            $recommendations += (New-DisplayRecommendation -Action "suppress_secondary_options" -Target $group.Name -Reason "shadow feedback says visible choices were too many" -EvidenceCount $tooMany -Confidence "medium" -NextStep "show the recommended option first and hide secondary candidates behind '別案を見る'")
        }
        if ($offTarget -ge $MinEvidence) {
            $recommendations += (New-DisplayRecommendation -Action "demote_candidate" -Target $group.Name -Reason "shadow feedback says this candidate was off target" -EvidenceCount $offTarget -Confidence "medium" -NextStep "lower this candidate in display order until more positive evidence appears")
        }
        if (($lighter + $tooHeavy) -ge $MinEvidence) {
            $recommendations += (New-DisplayRecommendation -Action "make_lightweight_default" -Target $group.Name -Reason "shadow feedback asks for a lighter path" -EvidenceCount ($lighter + $tooHeavy) -Confidence "medium" -NextStep "default to read-only or single-asset proposal before orchestration")
        }
        if ($unclear -ge $MinEvidence) {
            $recommendations += (New-DisplayRecommendation -Action "clarify_display_copy" -Target $group.Name -Reason "shadow feedback remained unclear after proposal" -EvidenceCount $unclear -Confidence "low" -NextStep "tighten the 3-line reason and expected-effect wording before changing assets")
        }
        if ($justRight -ge $MinEvidence -and $justRight -gt ($tooMany + $offTarget + $lighter + $tooHeavy + $unclear)) {
            $recommendations += (New-DisplayRecommendation -Action "keep_as_default" -Target $group.Name -Reason "shadow feedback says this proposal shape is working" -EvidenceCount $justRight -Confidence "medium" -NextStep "keep this as the recommended visible path")
        }
    }

    $coordinatorVisible = @($shadowEntries | Where-Object {
        (Get-EntryString -Entry $_ -Name "name") -eq "pied-piper" -and [string]::IsNullOrWhiteSpace((Get-EntryString -Entry $_ -Name "actual_asset"))
    })
    if ($coordinatorVisible.Count -ge $MinEvidence) {
        $recommendations += (New-DisplayRecommendation -Action "show_underlying_asset" -Target "agent:pied-piper" -Reason "coordinator is visible without the selected underlying asset" -EvidenceCount $coordinatorVisible.Count -Confidence "medium" -NextStep "record and display actual_asset such as skill:unified-router or rule:qa-reality-checker")
    }

    if ($recommendations.Count -eq 0) {
        $recommendations += (New-DisplayRecommendation -Action "no_display_change" -Target "routing-display" -Reason "shadow feedback has no repeated display friction above threshold" -EvidenceCount $shadowEntries.Count -Confidence "high" -NextStep "keep collecting feedback before changing visible options")
    }
}

$dedup = New-Object System.Collections.Generic.List[object]
$seen = @{}
foreach ($item in $recommendations) {
    $key = "$($item.action)|$($item.target)"
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    $dedup.Add($item) | Out-Null
}

$ranked = @($dedup | Sort-Object -Property @{Expression='evidence_count';Descending=$true}, @{Expression='action';Ascending=$true}, @{Expression='target';Ascending=$true})
$topRecommendations = @($ranked | Select-Object -First $TopN)

$report = [pscustomobject]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    log_path = $LogPath
    total_decisions = $entries.Count
    shadow_trials_total = $shadowEntriesAll.Count
    shadow_trials_analyzed = $shadowEntries.Count
    synthetic_decisions = $syntheticEntries.Count
    include_synthetic = [bool]$IncludeSynthetic
    minimum_shadow_trials = $MinShadowTrials
    minimum_evidence = $MinEvidence
    safety_policy = "display_policy_only_no_delete_no_deprecate"
    v8_policy = "use_shadow_trials_for_visible_candidate_suppression_and_bundling"
    judgement_counts = $overallJudgementCounts
    asset_signals = @($assetSignals)
    recommendations = @($ranked)
    top_recommendations = @($topRecommendations)
}

Write-Host ""
Write-Host "=== Display Policy Advisor V8 ===" -ForegroundColor Cyan
Write-Host "Log: $LogPath" -ForegroundColor DarkGray
Write-Host "Decisions: $($report.total_decisions)"
$syntheticMode = if ($IncludeSynthetic) { "included" } else { "ignored" }
Write-Host "Shadow trials: $($report.shadow_trials_analyzed) analyzed (synthetic $($syntheticMode): $($report.synthetic_decisions))"
Write-Host "Safety: display policy only; no delete, no deprecate" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next display actions" -ForegroundColor Cyan
if ($topRecommendations.Count -gt 0) {
    $topRecommendations | Select-Object action, target, evidence_count, confidence, reason, next_step | Format-Table -AutoSize | Out-String | Write-Host
}
else {
    Write-Host "  none" -ForegroundColor DarkGray
}

if (-not [string]::IsNullOrWhiteSpace($OutputJson)) {
    $outDir = Split-Path $OutputJson -Parent
    if ($outDir -and -not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($OutputJson, (($report | ConvertTo-Json -Depth 8) + [Environment]::NewLine), $utf8)
    Write-Host ""
    Write-Host "JSON report: $OutputJson" -ForegroundColor Green
}
