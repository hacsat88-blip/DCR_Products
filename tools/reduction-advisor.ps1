#Requires -Version 5.1
<#
.SYNOPSIS
  Reduction Advisor V7 for DCR routing candidates.

.DESCRIPTION
  Reads router-decisions.jsonl plus catalog frontmatter and recommends a small
  set of non-mutating reduction actions. This script does not delete files,
  mark assets deprecated, or modify catalog state. Coordinators such as
  pied-piper are treated as visibility issues, not deletion or hub candidates.
  Synthetic smoke/test decisions are excluded from reduction recommendations by
  default so validation telemetry does not drive catalog pruning.

.PARAMETER LogPath
  Router decision JSONL path. Defaults to .ai/kernel/router-decisions.jsonl.

.PARAMETER GateStatePath
  Gate state JSON path. Defaults to .ai/kernel/gate-state.json.

.PARAMETER OutputJson
  Optional path to write the full recommendation report as JSON.

.PARAMETER TopN
  Maximum number of recommendations to print. Defaults to 3.

.PARAMETER MinEvidence
  Minimum count before a candidate is treated as strong evidence. Defaults to 2.

.PARAMETER MinRealDecisions
  Minimum non-synthetic decisions required before reduction advice is trusted.
  Defaults to 5.

.PARAMETER IncludeSynthetic
  Include smoke/test/fixture decisions in advisor calculations.
#>

param(
    [string]$LogPath = "",
    [string]$GateStatePath = "",
    [string]$OutputJson = "",
    [int]$TopN = 3,
    [int]$MinEvidence = 2,
    [int]$MinRealDecisions = 5,
    [switch]$IncludeSynthetic
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$CatalogPaths = Join-Path $RepoRoot "tools/lib/catalog-paths.ps1"
. $CatalogPaths
$deprecatedAliasLib = Join-Path $RepoRoot "tools/lib/deprecated-aliases.ps1"
if (Test-Path $deprecatedAliasLib) {
    . $deprecatedAliasLib
}
if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $RepoRoot ".ai/kernel/router-decisions.jsonl"
}
if ([string]::IsNullOrWhiteSpace($GateStatePath)) {
    $GateStatePath = Join-Path $RepoRoot ".ai/kernel/gate-state.json"
}
if ($TopN -lt 1) { $TopN = 1 }
if ($MinEvidence -lt 1) { $MinEvidence = 1 }
if ($MinRealDecisions -lt 1) { $MinRealDecisions = 1 }

function Get-Frontmatter {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path $Path)) { return @{} }
    $raw = [System.IO.File]::ReadAllText((Resolve-Path $Path).Path)
    if ($raw -notmatch '(?ms)^---\r?\n(.*?)\r?\n---') { return @{} }
    $fm = $Matches[1]
    $map = @{}
    foreach ($line in ($fm -split "\r?\n")) {
        if ($line -match '^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$') {
            $key = $Matches[1]
            $value = $Matches[2].Trim().Trim([char]34, [char]39)
            $map[$key] = $value
        }
    }
    Write-Output -NoEnumerate $map
}

function Test-FrontmatterKey {
    param(
        [Parameter(Mandatory)][object]$Frontmatter,
        [Parameter(Mandatory)][string]$Key
    )
    foreach ($fmKey in $Frontmatter.Keys) {
        if ([string]$fmKey -eq $Key) { return $true }
    }
    return $false
}

function Get-FrontmatterValue {
    param(
        [Parameter(Mandatory)][object]$Frontmatter,
        [Parameter(Mandatory)][string]$Key,
        [string]$Default = ""
    )
    foreach ($fmKey in $Frontmatter.Keys) {
        if ([string]$fmKey -eq $Key) { return [string]$Frontmatter[$fmKey] }
    }
    return $Default
}

function Add-CatalogAsset {
    param(
        [Parameter(Mandatory)][object]$Catalog,
        [Parameter(Mandatory)][string]$Kind,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][object]$Frontmatter
    )
    $Catalog.Add([pscustomobject]@{
        kind = $Kind
        name = $Name
        path = $Path
        deprecated = ((Test-FrontmatterKey -Frontmatter $Frontmatter -Key "deprecated") -and (Get-FrontmatterValue -Frontmatter $Frontmatter -Key "deprecated") -eq "true")
        successor = Get-FrontmatterValue -Frontmatter $Frontmatter -Key "successor"
        parent = Get-FrontmatterValue -Frontmatter $Frontmatter -Key "parent"
        routing_category = Get-FrontmatterValue -Frontmatter $Frontmatter -Key "routing_category"
        has_hub_metadata = ((Test-FrontmatterKey -Frontmatter $Frontmatter -Key "variants") -or (Test-FrontmatterKey -Frontmatter $Frontmatter -Key "absorbs_routing_for") -or (Test-FrontmatterKey -Frontmatter $Frontmatter -Key "parent"))
    }) | Out-Null
}

function Get-CatalogIndex {
    param([Parameter(Mandatory)][string]$Root)
    $catalog = New-Object System.Collections.ArrayList
    $rulesDir = Resolve-DcrSourcePath -RepoRoot $Root -AssetType "rules"
    $skillsDir = Resolve-DcrSourcePath -RepoRoot $Root -AssetType "skills"
    $agentsDir = Resolve-DcrSourcePath -RepoRoot $Root -AssetType "agents-source"

    if (Test-Path $rulesDir) {
        foreach ($file in Get-ChildItem -Path $rulesDir -File -Filter "*.md" | Where-Object { $_.BaseName -ne "README" -and -not $_.BaseName.StartsWith("_") }) {
            Add-CatalogAsset -Catalog $catalog -Kind "rule" -Name $file.BaseName -Path $file.FullName -Frontmatter (Get-Frontmatter -Path $file.FullName)
        }
    }
    if (Test-Path $skillsDir) {
        foreach ($dir in Get-ChildItem -Path $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
            $skillFile = Join-Path $dir.FullName "SKILL.md"
            if (Test-Path $skillFile) {
                Add-CatalogAsset -Catalog $catalog -Kind "skill" -Name $dir.Name -Path $skillFile -Frontmatter (Get-Frontmatter -Path $skillFile)
            }
        }
    }
    if (Test-Path $agentsDir) {
        foreach ($file in Get-ChildItem -Path $agentsDir -File -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") -and $_.BaseName -ne "README" }) {
            Add-CatalogAsset -Catalog $catalog -Kind "agent" -Name $file.BaseName -Path $file.FullName -Frontmatter (Get-Frontmatter -Path $file.FullName)
        }
    }
    if (Get-Command Get-DcrDeprecatedAliases -ErrorAction SilentlyContinue) {
        $existing = @{}
        foreach ($item in @($catalog)) {
            $existing["$($item.kind):$($item.name)"] = $true
        }
        foreach ($alias in @(Get-DcrDeprecatedAliases -RepoRoot $Root)) {
            $key = "$($alias.kind):$($alias.name)"
            if ($existing.ContainsKey($key)) { continue }
            $successor = @($catalog | Where-Object { $_.kind -eq $alias.kind -and $_.name -eq $alias.successor } | Select-Object -First 1)
            $catalog.Add([pscustomobject]@{
                kind = $alias.kind
                name = $alias.name
                path = $alias.source_path
                deprecated = $true
                successor = $alias.successor
                parent = ""
                routing_category = $(if ($successor.Count -gt 0) { $successor[0].routing_category } else { "" })
                has_hub_metadata = $false
            }) | Out-Null
        }
    }
    return @($catalog)
}

function Read-RouterEntries {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path $Path)) { return @() }
    $items = @()
    foreach ($line in (Get-Content -Path $Path -Encoding utf8)) {
        $trimmed = $line.Trim()
        if (-not $trimmed) { continue }
        try {
            $items += ($trimmed | ConvertFrom-Json)
        } catch {}
    }
    return @($items)
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

function Get-CatalogAssetsByName {
    param(
        [Parameter(Mandatory)][object[]]$Catalog,
        [Parameter(Mandatory)][object]$Name
    )
    $key = [string]$Name
    return @($Catalog | Where-Object { $_.name -eq $key })
}

function New-Recommendation {
    param(
        [Parameter(Mandatory)][string]$Action,
        [Parameter(Mandatory)][string]$Target,
        [Parameter(Mandatory)][string]$Reason,
        [int]$EvidenceCount = 0,
        [string]$Kind = "",
        [string]$Confidence = "medium",
        [string]$Safety = "proposal_only",
        [string]$NextStep = "",
        [string]$DoNot = "",
        [object]$Catalog = $null
    )
    return [pscustomobject]@{
        action = $Action
        target = $Target
        kind = $Kind
        reason = $Reason
        evidence_count = $EvidenceCount
        confidence = $Confidence
        safety = $Safety
        next_step = $NextStep
        do_not = $DoNot
        catalog = $Catalog
    }
}

$entries = Read-RouterEntries -Path $LogPath
$syntheticEntries = @($entries | Where-Object { Test-SyntheticDecision -Entry $_ })
$analysisEntries = @(if ($IncludeSynthetic) { $entries } else { $entries | Where-Object { -not (Test-SyntheticDecision -Entry $_) } })
$catalog = Get-CatalogIndex -Root $RepoRoot
$recommendations = @()

if ($entries.Count -eq 0) {
    $recommendations += (New-Recommendation -Action "observe_more" -Target "router-decisions" -Reason "no routing decisions have been logged yet" -Confidence "low")
}
elseif ($analysisEntries.Count -lt $MinRealDecisions) {
    $recommendations += (New-Recommendation -Action "collect_real_usage" -Target "router-decisions" -Reason "not enough non-synthetic routing decisions for safe reduction advice" -EvidenceCount $analysisEntries.Count -Confidence "low" -Safety "observe_only" -NextStep "keep logging real proposal outcomes before hiding or bundling candidates" -DoNot "do not reduce based on smoke/test telemetry")
}
else {
    $troubleGroups = @($analysisEntries |
        Where-Object { $_.name -and ($_.status -eq "rejected" -or $_.status -eq "ambiguous" -or $_.user_reply_type -in @("reject","ambiguous")) } |
        Group-Object -Property name |
        Sort-Object -Property @{Expression='Count';Descending=$true}, @{Expression='Name';Ascending=$true})

    foreach ($group in $troubleGroups) {
        $assets = Get-CatalogAssetsByName -Catalog $catalog -Name $group.Name
        $deprecatedAssets = @($assets | Where-Object { $_.deprecated })
        if ($deprecatedAssets.Count -gt 0) {
            $recommendations += (New-Recommendation -Action "remove_later" -Target $group.Name -Reason "deprecated asset still appears in rejected/ambiguous routing evidence" -EvidenceCount $group.Count -Kind $deprecatedAssets[0].kind -Confidence "medium" -Catalog $deprecatedAssets[0])
        }
        elseif ($group.Count -ge $MinEvidence) {
            $catalogEntry = if ($assets.Count -gt 0) { $assets[0] } else { $null }
            $recommendations += (New-Recommendation -Action "observe_more" -Target $group.Name -Reason "non-deprecated target has repeated rejected/ambiguous evidence; do not remove yet" -EvidenceCount $group.Count -Kind $(if ($catalogEntry) { $catalogEntry.kind } else { "" }) -Confidence "low" -Catalog $catalogEntry)
        }
    }

    $topGroups = @($analysisEntries |
        Where-Object { $_.name } |
        Group-Object -Property name |
        Sort-Object -Property @{Expression='Count';Descending=$true}, @{Expression='Name';Ascending=$true})

    foreach ($group in $topGroups | Select-Object -First 5) {
        if ($group.Count -lt $MinEvidence) { continue }
        $assets = Get-CatalogAssetsByName -Catalog $catalog -Name $group.Name
        $catalogEntry = if ($assets.Count -gt 0) { $assets[0] } else { $null }
        $action = "bundle_into_hub"
        $reason = "routing decisions are concentrated on one candidate; consider hub wording or display suppression"
        $nextStep = "check whether a parent hub or display suppression would reduce visible choices"
        $doNot = "do not delete or deprecate from concentration alone"
        if ($group.Name -eq "pied-piper") {
            $action = "expose_underlying_asset"
            $reason = "coordinator is visible in repeated decisions; expose the underlying selected asset before considering deletion"
            $nextStep = "record or display the selected rule/skill/agent behind pied-piper"
            $doNot = "do not delete, deprecate, or hub-promote pied-piper"
        }
        $recommendations += (New-Recommendation -Action $action -Target $group.Name -Reason $reason -EvidenceCount $group.Count -Kind $(if ($catalogEntry) { $catalogEntry.kind } else { "" }) -Confidence "medium" -NextStep $nextStep -DoNot $doNot -Catalog $catalogEntry)
    }

    $unclearInputs = @($analysisEntries |
        Where-Object { $_.input -and ($_.status -eq "refined" -or $_.status -eq "ambiguous" -or $_.user_reply_type -in @("refine","ambiguous")) } |
        Group-Object -Property input |
        Sort-Object -Property @{Expression='Count';Descending=$true}, @{Expression='Name';Ascending=$true})

    foreach ($group in $unclearInputs | Select-Object -First 5) {
        $recommendations += (New-Recommendation -Action "clarify_trigger" -Target $group.Name -Reason "input tends to become ambiguous/refine; add fixture or natural-language trigger guidance" -EvidenceCount $group.Count -Kind "input" -Confidence "medium" -NextStep "add or adjust a routing fixture before changing catalog assets" -DoNot "do not treat unclear wording as asset failure")
    }

    if ($recommendations.Count -eq 0) {
        $recommendations += (New-Recommendation -Action "no_action" -Target "routing-catalog" -Reason "no reduction signal above threshold" -Confidence "high")
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

$ranked = @($dedup |
    Sort-Object -Property @{Expression='evidence_count';Descending=$true}, @{Expression='action';Ascending=$true}, @{Expression='target';Ascending=$true})
$topRecommendations = @($ranked | Select-Object -First $TopN)

$gateStateSummary = [pscustomobject]@{
    checked = $false
    proposal_status = "none"
    proposal_id = ""
}
if (Test-Path $GateStatePath) {
    try {
        $state = Get-Content -Path $GateStatePath -Raw -Encoding utf8 | ConvertFrom-Json
        $gateStateSummary.checked = $true
        if ($state.PSObject.Properties["proposal_state"] -and $state.proposal_state) {
            $gateStateSummary.proposal_status = if ($state.proposal_state.status) { [string]$state.proposal_state.status } else { "none" }
            $gateStateSummary.proposal_id = if ($state.proposal_state.proposal_id) { [string]$state.proposal_state.proposal_id } else { "" }
        }
    } catch {
        $gateStateSummary.checked = $true
        $gateStateSummary.proposal_status = "parse_failed"
    }
}

$report = [pscustomobject]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    log_path = $LogPath
    gate_state_path = $GateStatePath
    total_decisions = $entries.Count
    analyzed_decisions = $analysisEntries.Count
    synthetic_decisions = $syntheticEntries.Count
    include_synthetic = [bool]$IncludeSynthetic
    minimum_real_decisions = $MinRealDecisions
    catalog_asset_names = @($catalog).Count
    safety_policy = "advisor_only_no_delete_no_deprecate"
    v7_policy = "ignore_synthetic_until_real_usage_threshold"
    gate_state = $gateStateSummary
    recommendations = @($ranked)
    top_recommendations = @($topRecommendations)
}

Write-Host ""
Write-Host "=== Reduction Advisor V7 ===" -ForegroundColor Cyan
Write-Host "Log: $LogPath" -ForegroundColor DarkGray
Write-Host "Decisions: $($report.total_decisions)"
$syntheticMode = if ($IncludeSynthetic) { "included" } else { "ignored" }
Write-Host "Analyzed: $($report.analyzed_decisions) (synthetic $($syntheticMode): $($report.synthetic_decisions))"
Write-Host "Safety: advisor only; no delete, no deprecate" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next actions" -ForegroundColor Cyan
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
