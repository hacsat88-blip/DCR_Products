#Requires -Version 5.1
<#
.SYNOPSIS
  Bundle Advisor V10 for DCR routing candidates.

.DESCRIPTION
  Reads router-decisions.jsonl and catalog frontmatter, then recommends
  non-mutating bundle actions. This script does not delete files, mark assets
  deprecated, or change routing. It only suggests how visible choices could be
  grouped into parent hubs or clarified before any approved implementation.

.PARAMETER LogPath
  Router decision JSONL path. Defaults to .ai/kernel/router-decisions.jsonl.

.PARAMETER OutputJson
  Optional path to write the full report as JSON.

.PARAMETER TopN
  Maximum number of actions to print. Defaults to 3.

.PARAMETER MinRealDecisions
  Minimum non-synthetic decisions required before bundle advice is trusted.
  Defaults to 5.

.PARAMETER MinEvidence
  Minimum repeated signal count before a bundle action is emitted. Defaults to 2.

.PARAMETER IncludeSynthetic
  Include smoke/test/fixture entries in calculations. Use only for harness
  debugging.
#>

param(
    [string]$LogPath = "",
    [string]$OutputJson = "",
    [int]$TopN = 3,
    [int]$MinRealDecisions = 5,
    [int]$MinEvidence = 2,
    [switch]$IncludeSynthetic
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$deprecatedAliasLib = Join-Path $RepoRoot "tools/lib/deprecated-aliases.ps1"
if (Test-Path $deprecatedAliasLib) {
    . $deprecatedAliasLib
}
if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $RepoRoot ".ai/kernel/router-decisions.jsonl"
}
if ($TopN -lt 1) { $TopN = 1 }
if ($MinEvidence -lt 1) { $MinEvidence = 1 }
if ($MinRealDecisions -lt 1) { $MinRealDecisions = 1 }

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

function Get-AssetKey {
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
        return "asset:$name"
    }
    return "asset:unknown"
}

function Split-AssetKey {
    param([Parameter(Mandatory)][string]$AssetKey)

    $parts = $AssetKey -split ":", 2
    if ($parts.Count -eq 2) {
        return [pscustomobject]@{ kind = $parts[0]; name = $parts[1] }
    }
    return [pscustomobject]@{ kind = "asset"; name = $AssetKey }
}

function Get-Frontmatter {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path $Path)) { return @{} }
    $raw = [System.IO.File]::ReadAllText((Resolve-Path $Path).Path)
    if ($raw -notmatch '(?ms)^---\r?\n(.*?)\r?\n---') { return @{} }
    $map = @{}
    foreach ($line in ($Matches[1] -split "\r?\n")) {
        if ($line -match '^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$') {
            $map[$Matches[1]] = $Matches[2].Trim().Trim([char]34, [char]39)
        }
    }
    return $map
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
        key = "$Kind`:$Name"
        parent = Get-FrontmatterValue -Frontmatter $Frontmatter -Key "parent"
        routing_category = Get-FrontmatterValue -Frontmatter $Frontmatter -Key "routing_category"
        deprecated = ((Get-FrontmatterValue -Frontmatter $Frontmatter -Key "deprecated") -eq "true")
        path = $Path
    }) | Out-Null
}

function Get-CatalogIndex {
    param([Parameter(Mandatory)][string]$Root)

    $catalog = New-Object System.Collections.ArrayList
    $rulesDir = Join-Path $Root ".ai/catalog/rules"
    $skillsDir = Join-Path $Root ".ai/catalog/skills"
    $agentsDir = Join-Path $Root ".ai/catalog/agents-source"

    if (Test-Path $rulesDir) {
        foreach ($file in Get-ChildItem -Path $rulesDir -File -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
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
            $existing[$item.key] = $true
        }
        foreach ($alias in @(Get-DcrDeprecatedAliases -RepoRoot $Root)) {
            $key = "$($alias.kind):$($alias.name)"
            if ($existing.ContainsKey($key)) { continue }
            $successor = @($catalog | Where-Object { $_.kind -eq $alias.kind -and $_.name -eq $alias.successor } | Select-Object -First 1)
            $catalog.Add([pscustomobject]@{
                kind = $alias.kind
                name = $alias.name
                key = $key
                parent = ""
                routing_category = $(if ($successor.Count -gt 0) { $successor[0].routing_category } else { "" })
                deprecated = $true
                path = $alias.source_path
            }) | Out-Null
        }
    }
    return @($catalog)
}

function Get-CatalogAsset {
    param(
        [Parameter(Mandatory)][object[]]$Catalog,
        [Parameter(Mandatory)][string]$Key
    )

    $match = @($Catalog | Where-Object { $_.key -eq $Key } | Select-Object -First 1)
    if ($match.Count -gt 0) { return $match[0] }
    return $null
}

function Get-BundleFamily {
    param(
        [Parameter(Mandatory)][string]$AssetKey,
        [object]$CatalogAsset
    )

    $asset = Split-AssetKey -AssetKey $AssetKey
    if ($asset.name -eq "pied-piper") {
        return "coordinator:pied-piper"
    }
    if ($null -ne $CatalogAsset) {
        if (-not [string]::IsNullOrWhiteSpace($CatalogAsset.parent)) {
            return "parent:$($CatalogAsset.parent)"
        }
        if (-not [string]::IsNullOrWhiteSpace($CatalogAsset.routing_category)) {
            return "category:$($CatalogAsset.routing_category)"
        }
    }
    return "kind:$($asset.kind)"
}

function New-BundleRecommendation {
    param(
        [Parameter(Mandatory)][string]$Action,
        [Parameter(Mandatory)][string]$Target,
        [Parameter(Mandatory)][string]$Reason,
        [int]$EvidenceCount = 0,
        [string]$Confidence = "medium",
        [string]$NextStep = "",
        [string]$DoNot = "do not delete, deprecate, or merge assets without explicit approval"
    )

    return [pscustomobject]@{
        action = $Action
        target = $Target
        reason = $Reason
        evidence_count = $EvidenceCount
        confidence = $Confidence
        safety = "bundle_advisor_only_no_delete_no_deprecate"
        next_step = $NextStep
        do_not = $DoNot
    }
}

$entries = Read-RouterEntries -Path $LogPath
$syntheticEntries = @($entries | Where-Object { Test-SyntheticDecision -Entry $_ })
$analysisEntries = @(if ($IncludeSynthetic) { $entries } else { $entries | Where-Object { -not (Test-SyntheticDecision -Entry $_) } })
$catalog = Get-CatalogIndex -Root $RepoRoot
$recommendations = @()
$bundleSignals = @()

if ($analysisEntries.Count -lt $MinRealDecisions) {
    $recommendations += (New-BundleRecommendation `
        -Action "collect_bundle_evidence" `
        -Target "router-decisions" `
        -Reason "not enough non-synthetic routing decisions for bundle advice" `
        -EvidenceCount $analysisEntries.Count `
        -Confidence "low" `
        -NextStep "collect real or shadow routing outcomes before grouping visible candidates" `
        -DoNot "do not bundle based on sparse or synthetic telemetry")
}
else {
    $rows = @($analysisEntries | ForEach-Object {
        $assetKey = Get-AssetKey -Entry $_
        $catalogAsset = Get-CatalogAsset -Catalog $catalog -Key $assetKey
        [pscustomobject]@{
            asset_key = $assetKey
            family = Get-BundleFamily -AssetKey $assetKey -CatalogAsset $catalogAsset
            judgement = Get-EntryString -Entry $_ -Name "user_judgement" -Default ""
            user_reply_type = Get-EntryString -Entry $_ -Name "user_reply_type" -Default ""
            status = Get-EntryString -Entry $_ -Name "status" -Default ""
            input = Get-EntryString -Entry $_ -Name "input" -Default ""
            name = Get-EntryString -Entry $_ -Name "name" -Default ""
            has_actual_asset = -not [string]::IsNullOrWhiteSpace((Get-EntryString -Entry $_ -Name "actual_asset"))
        }
    })

    $coordinatorVisible = @($rows | Where-Object { $_.name -eq "pied-piper" -and -not $_.has_actual_asset })
    if ($coordinatorVisible.Count -ge $MinEvidence) {
        $recommendations += (New-BundleRecommendation -Action "expose_underlying_asset" -Target "agent:pied-piper" -Reason "coordinator appears repeatedly without an underlying asset" -EvidenceCount $coordinatorVisible.Count -Confidence "medium" -NextStep "record actual_asset and display the selected rule/skill/agent under the coordinator label" -DoNot "do not remove pied-piper")
    }

    foreach ($familyGroup in @($rows | Group-Object -Property family | Sort-Object -Property @{Expression='Count';Descending=$true}, @{Expression='Name';Ascending=$true})) {
        $assets = @($familyGroup.Group | Select-Object -ExpandProperty asset_key -Unique)
        if ($familyGroup.Name -eq "coordinator:pied-piper") { continue }
        $friction = @($familyGroup.Group | Where-Object {
            $_.judgement -in @("too_many", "unclear") -or $_.user_reply_type -in @("ambiguous", "refine") -or $_.status -in @("ambiguous", "refined")
        })
        $positive = @($familyGroup.Group | Where-Object { $_.judgement -eq "just_right" -or $_.status -in @("approved", "executed") })

        $bundleSignals += [pscustomobject]@{
            family = $familyGroup.Name
            count = $familyGroup.Count
            unique_assets = $assets.Count
            friction_count = $friction.Count
            positive_count = $positive.Count
            assets = @($assets)
        }

        if ($assets.Count -ge 2 -and $familyGroup.Count -ge $MinEvidence) {
            $recommendations += (New-BundleRecommendation -Action "bundle_into_hub" -Target $familyGroup.Name -Reason "multiple visible assets are concentrated in the same parent/category" -EvidenceCount $familyGroup.Count -Confidence "medium" -NextStep "show one parent hub label first and keep the specific assets behind details")
        }
        if ($friction.Count -ge $MinEvidence) {
            $recommendations += (New-BundleRecommendation -Action "clarify_parent_label" -Target $familyGroup.Name -Reason "bundle family has repeated unclear or refine feedback" -EvidenceCount $friction.Count -Confidence "low" -NextStep "tighten the parent label and expected-effect copy before merging visible candidates")
        }
        if ($assets.Count -eq 1 -and $positive.Count -ge $MinEvidence -and $friction.Count -eq 0) {
            $recommendations += (New-BundleRecommendation -Action "keep_separate" -Target $assets[0] -Reason "single asset is working without repeated bundle friction" -EvidenceCount $positive.Count -Confidence "medium" -NextStep "keep this asset visible as its own recommended path")
        }
    }

    if ($recommendations.Count -eq 0) {
        $recommendations += (New-BundleRecommendation -Action "observe_more" -Target "routing-bundles" -Reason "no bundle signal above threshold" -EvidenceCount $analysisEntries.Count -Confidence "low" -NextStep "keep collecting routing decisions before grouping candidates")
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
    analyzed_decisions = $analysisEntries.Count
    synthetic_decisions = $syntheticEntries.Count
    include_synthetic = [bool]$IncludeSynthetic
    minimum_real_decisions = $MinRealDecisions
    minimum_evidence = $MinEvidence
    safety_policy = "bundle_advisor_only_no_delete_no_deprecate"
    v10_policy = "suggest_parent_hubs_without_physical_merge"
    bundle_signals = @($bundleSignals)
    recommendations = @($ranked)
    top_recommendations = @($topRecommendations)
}

Write-Host ""
Write-Host "=== Bundle Advisor V10 ===" -ForegroundColor Cyan
Write-Host "Log: $LogPath" -ForegroundColor DarkGray
Write-Host "Decisions: $($report.total_decisions)"
$syntheticMode = if ($IncludeSynthetic) { "included" } else { "ignored" }
Write-Host "Analyzed: $($report.analyzed_decisions) (synthetic $($syntheticMode): $($report.synthetic_decisions))"
Write-Host "Safety: bundle advisor only; no delete, no deprecate" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next bundle actions" -ForegroundColor Cyan
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
