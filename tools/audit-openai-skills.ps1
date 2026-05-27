<#
.SYNOPSIS
  Audit DCR skills against the OpenAI official skills baseline.

.DESCRIPTION
  Read-only by default. Compares .ai/catalog/skills with local OpenAI curated,
  primary-runtime, and local system skill caches. Classifies DCR skills into:
  keep, replace-with-openai, merge-into-overlay, fold-into-pipeline, deprecate.

.EXAMPLE
  .\tools\audit-openai-skills.ps1
  .\tools\audit-openai-skills.ps1 -ShowCandidates
  .\tools\audit-openai-skills.ps1 -AsJson
#>

param(
    [string]$RepoRoot = (Join-Path $PSScriptRoot ".."),
    [string]$OpenAiCuratedRoot = (Join-Path $HOME ".codex\plugins\cache\openai-curated"),
    [string]$OpenAiPrimaryRuntimeRoot = (Join-Path $HOME ".codex\plugins\cache\openai-primary-runtime"),
    [string]$OpenAiSystemRoot = (Join-Path $HOME ".codex\skills\.system"),
    [switch]$ShowCandidates,
    [switch]$AsJson
)

$ErrorActionPreference = "Stop"

$resolvedRoot = (Resolve-Path $RepoRoot).Path
$CatalogPaths = Join-Path $resolvedRoot "tools\lib\catalog-paths.ps1"
. $CatalogPaths

$skillsRoot = Resolve-DcrSourcePath -RepoRoot $resolvedRoot -AssetType "skills"

function Get-FrontmatterMap {
    param([string]$FilePath)

    $raw = Get-Content -Path $FilePath -Raw -Encoding utf8
    if (-not $raw.StartsWith("---")) {
        return @{}
    }

    $m = [regex]::Match($raw, '(?s)^---\r?\n(.*?)\r?\n---')
    if (-not $m.Success) {
        return @{}
    }

    $map = @{}
    foreach ($line in ($m.Groups[1].Value -split "`r?`n")) {
        if ($line -match '^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$') {
            $key = $Matches[1]
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            if (-not [string]::IsNullOrWhiteSpace($value)) {
                $map[$key] = $value
            }
        }
    }

    return $map
}

function Get-DcrSkills {
    $rows = @()
    $dirs = Get-ChildItem -Path $skillsRoot -Directory |
        Where-Object { $_.Name -notlike "_*" } |
        Sort-Object Name

    foreach ($dir in $dirs) {
        $skillFile = Join-Path $dir.FullName "SKILL.md"
        if (-not (Test-Path -LiteralPath $skillFile)) {
            continue
        }

        $fm = Get-FrontmatterMap -FilePath $skillFile
        $rows += [pscustomobject]@{
            Name = $dir.Name
            Category = if ($fm.ContainsKey("routing_category")) { $fm["routing_category"] } else { "" }
            Origin = if ($fm.ContainsKey("origin")) { $fm["origin"] } else { "" }
            Deprecated = ($fm.ContainsKey("deprecated") -and $fm["deprecated"] -eq "true")
            Successor = if ($fm.ContainsKey("successor")) { $fm["successor"] } else { "" }
            Path = $skillFile
        }
    }

    return $rows
}

function Get-OpenAiSkillsFromRoot {
    param(
        [string]$Root,
        [string]$Source
    )

    if (-not (Test-Path -LiteralPath $Root)) {
        return @()
    }

    $files = Get-ChildItem -Path $Root -Recurse -Filter "SKILL.md" -File -ErrorAction SilentlyContinue
    $rows = @()

    foreach ($file in $files) {
        $segments = $file.FullName -split '\\skills\\'
        if ($segments.Count -lt 2) {
            continue
        }

        $name = ($segments[1] -split '\\')[0]
        if ([string]::IsNullOrWhiteSpace($name)) {
            continue
        }

        $relativePath = $file.FullName.Substring((Resolve-Path $Root).Path.Length).TrimStart('\')
        $relativeParts = $relativePath -split '\\'
        $pack = if ($relativeParts.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($relativeParts[0])) {
            $relativeParts[0]
        } else {
            $Source
        }

        $rows += [pscustomobject]@{
            Name = $name
            Source = $Source
            Pack = $pack
            Path = $file.FullName
        }
    }

    return $rows
}

function Get-OpenAiBaselineSkills {
    $rows = @()
    $rows += Get-OpenAiSkillsFromRoot -Root $OpenAiCuratedRoot -Source "curated"
    $rows += Get-OpenAiSkillsFromRoot -Root $OpenAiPrimaryRuntimeRoot -Source "primary-runtime"
    $rows += Get-OpenAiSkillsFromRoot -Root $OpenAiSystemRoot -Source "system"

    return $rows |
        Sort-Object Name, Source, Pack -Unique
}

$exactOverlapDecisions = @{
    "brainstorming" = [pscustomobject]@{
        Classification = "merge-into-overlay"
        Successor = "curated:superpowers/brainstorming baseline + DCR docs/dcr/specs overlay"
        Note = "Keep DCR spec paths, approval gate metadata, and reviewer loop; use OpenAI Superpowers as the behavioral baseline."
    }
    "finishing-a-development-branch" = [pscustomobject]@{
        Classification = "merge-into-overlay"
        Successor = "curated:superpowers/finishing-a-development-branch baseline + DCR ship gate overlay"
        Note = "Port OpenAI worktree and detached-head environment detection before considering deprecation."
    }
    "security-scan" = [pscustomobject]@{
        Classification = "merge-into-overlay"
        Successor = "curated:codex-security/security-scan baseline; future DCR shallow config scan split"
        Note = "Name collision: DCR skill is a shallow config/secrets scan while OpenAI skill is a full security orchestrator; do not replace until split or rename is planned."
    }
    "subagent-driven-development" = [pscustomobject]@{
        Classification = "merge-into-overlay"
        Successor = "curated:superpowers/subagent-driven-development baseline + DCR approval/model-routing overlay"
        Note = "Port OpenAI continuous-execution guidance while keeping DCR approval and model-routing constraints."
    }
    "systematic-debugging" = [pscustomobject]@{
        Classification = "merge-into-overlay"
        Successor = "curated:superpowers/systematic-debugging baseline + DCR feedback-loop overlay"
        Note = "Keep DCR feedback-loop-first additions and provenance; compare against OpenAI four-phase flow before deprecation."
    }
    "using-git-worktrees" = [pscustomobject]@{
        Classification = "merge-into-overlay"
        Successor = "curated:superpowers/using-git-worktrees baseline + DCR workspace conventions"
        Note = "Port OpenAI native-worktree and submodule guards while preserving DCR workspace conventions."
    }
    "verification-before-completion" = [pscustomobject]@{
        Classification = "merge-into-overlay"
        Successor = "curated:superpowers/verification-before-completion baseline + DCR ship-gate contract"
        Note = "Port OpenAI rationalization-prevention language while keeping DCR verification and ship-gate contract."
    }
    "writing-plans" = [pscustomobject]@{
        Classification = "merge-into-overlay"
        Successor = "curated:superpowers/writing-plans baseline + DCR docs/dcr/plans overlay"
        Note = "Keep docs/dcr/plans and DCR target metadata; use OpenAI plan structure as the baseline."
    }
}

function Get-Classification {
    param(
        [object]$Skill,
        [bool]$HasOpenAiExactMatch,
        [object]$ExactOverlapDecision
    )

    $name = $Skill.Name
    $category = $Skill.Category
    $origin = $Skill.Origin

    $dcrSpecific = @(
        "ai-prompt-manager",
        "codex-app-server-integration",
        "dcr-generated-mirror-drift",
        "dcr-pipeline",
        "documents-ops",
        "governance-ops",
        "growth-ops",
        "harness-audit",
        "j-quants",
        "japanese-legal-compliance",
        "japanese-ux-patterns",
        "mem-search",
        "openai-skills-catalog-audit",
        "oss-delegate",
        "react-quality-gate",
        "repo-boundary-hygiene",
        "stock-skills-sla",
        "token-efficiency-advisor",
        "unified-router"
    )

    if ($Skill.Deprecated) {
        return "deprecate"
    }

    if ($dcrSpecific -contains $name) {
        return "keep"
    }

    if ($HasOpenAiExactMatch -and $null -ne $ExactOverlapDecision) {
        return $ExactOverlapDecision.Classification
    }

    if ($HasOpenAiExactMatch) {
        return "replace-with-openai"
    }

    $pipelinePattern = '(^|[-_])(pipeline|gate|qa|review|drift|verify|verification|testing|test|scan|security|static-analysis|webapp|performance|debug|ship|deploy|ci|cicd)([-_]|$)'
    if ($name -match $pipelinePattern) {
        return "fold-into-pipeline"
    }

    if (-not [string]::IsNullOrWhiteSpace($origin)) {
        return "merge-into-overlay"
    }

    if ($category -in @("growth", "documents", "ui-ux", "governance")) {
        return "merge-into-overlay"
    }

    return "keep"
}

$dcrSkills = @(Get-DcrSkills)
$openAiSkills = @(Get-OpenAiBaselineSkills)
$openAiByName = @{}
foreach ($skill in $openAiSkills) {
    if (-not $openAiByName.ContainsKey($skill.Name)) {
        $openAiByName[$skill.Name] = @()
    }
    $openAiByName[$skill.Name] += $skill
}

$classified = foreach ($skill in $dcrSkills) {
    $hasExact = $openAiByName.ContainsKey($skill.Name)
    $matches = if ($hasExact) { @($openAiByName[$skill.Name]) } else { @() }
    $exactDecision = if ($hasExact -and $exactOverlapDecisions.ContainsKey($skill.Name)) {
        $exactOverlapDecisions[$skill.Name]
    } else {
        $null
    }

    [pscustomobject]@{
        Name = $skill.Name
        Category = $skill.Category
        Origin = $skill.Origin
        Deprecated = $skill.Deprecated
        Successor = $skill.Successor
        OpenAiExactMatch = $hasExact
        OpenAiSources = (($matches | ForEach-Object { "$($_.Source):$($_.Pack)" } | Sort-Object -Unique) -join ", ")
        ReviewedExactOverlap = ($null -ne $exactDecision)
        DecisionSuccessor = if ($null -ne $exactDecision) { $exactDecision.Successor } else { "" }
        DecisionNote = if ($null -ne $exactDecision) { $exactDecision.Note } else { "" }
        Classification = Get-Classification -Skill $skill -HasOpenAiExactMatch $hasExact -ExactOverlapDecision $exactDecision
    }
}

$classificationSummary = $classified |
    Group-Object Classification |
    Sort-Object Name |
    ForEach-Object {
        [pscustomobject]@{
            Classification = $_.Name
            Count = $_.Count
        }
    }

$categorySummary = $dcrSkills |
    Group-Object Category |
    Sort-Object Count -Descending |
    ForEach-Object {
        [pscustomobject]@{
            Category = if ([string]::IsNullOrWhiteSpace($_.Name)) { "(none)" } else { $_.Name }
            Count = $_.Count
        }
    }

$originSummary = $dcrSkills |
    ForEach-Object {
        if ([string]::IsNullOrWhiteSpace($_.Origin)) { "(none)" } else { $_.Origin }
    } |
    Group-Object |
    Sort-Object Count -Descending |
    Select-Object -First 12 |
    ForEach-Object {
        [pscustomobject]@{
            Origin = $_.Name
            Count = $_.Count
        }
    }

$report = [pscustomobject]@{
    RepoRoot = $resolvedRoot
    DcrSkillCount = $dcrSkills.Count
    OpenAiBaselineSkillCount = ($openAiSkills | Select-Object -ExpandProperty Name -Unique).Count
    ExactOverlapCount = @($classified | Where-Object { $_.OpenAiExactMatch }).Count
    ReviewedExactOverlapCount = @($classified | Where-Object { $_.ReviewedExactOverlap }).Count
    PipelineAliasCount = @($classified | Where-Object { $_.Deprecated -and $_.Successor -eq "dcr-pipeline" }).Count
    GrowthUmbrellaAliasCount = @($classified | Where-Object { $_.Deprecated -and $_.Successor -eq "growth-ops" }).Count
    DocumentsUmbrellaAliasCount = @($classified | Where-Object { $_.Deprecated -and $_.Successor -eq "documents-ops" }).Count
    GovernanceUmbrellaAliasCount = @($classified | Where-Object { $_.Deprecated -and $_.Successor -eq "governance-ops" }).Count
    TargetSkillCount = 70
    CandidateReductionCount = @($classified | Where-Object { $_.Classification -in @("replace-with-openai", "merge-into-overlay", "fold-into-pipeline", "deprecate") }).Count
    ClassificationSummary = @($classificationSummary)
    CategorySummary = @($categorySummary)
    OriginSummary = @($originSummary)
    ReviewedExactOverlapDecisions = @($classified | Where-Object { $_.ReviewedExactOverlap } | Sort-Object Name)
    Skills = @($classified | Sort-Object Classification, Category, Name)
}

if ($AsJson) {
    $report | ConvertTo-Json -Depth 6
    exit 0
}

Write-Host ""
Write-Host "=== OpenAI Skills Catalog Audit ===" -ForegroundColor Cyan
Write-Host "Repo: $resolvedRoot"
Write-Host "DCR skills: $($report.DcrSkillCount)"
Write-Host "OpenAI baseline skills: $($report.OpenAiBaselineSkillCount)"
Write-Host "Exact overlaps: $($report.ExactOverlapCount)"
Write-Host "Reviewed exact overlaps: $($report.ReviewedExactOverlapCount)"
Write-Host "Deprecated pipeline aliases: $($report.PipelineAliasCount)"
Write-Host "Deprecated growth umbrella aliases: $($report.GrowthUmbrellaAliasCount)"
Write-Host "Deprecated documents umbrella aliases: $($report.DocumentsUmbrellaAliasCount)"
Write-Host "Deprecated governance umbrella aliases: $($report.GovernanceUmbrellaAliasCount)"
Write-Host "Target skill count: $($report.TargetSkillCount)"
Write-Host "Candidate reduction pool: $($report.CandidateReductionCount)"
Write-Host ""

Write-Host "Classification summary" -ForegroundColor Cyan
$classificationSummary | Format-Table -AutoSize | Out-String | Write-Host

Write-Host "DCR category summary" -ForegroundColor Cyan
$categorySummary | Format-Table -AutoSize | Out-String | Write-Host

Write-Host "DCR origin summary" -ForegroundColor Cyan
$originSummary | Format-Table -AutoSize | Out-String | Write-Host

Write-Host "Exact OpenAI overlaps" -ForegroundColor Cyan
$classified |
    Where-Object { $_.OpenAiExactMatch } |
    Sort-Object Name |
    Select-Object Name, Category, Classification, OpenAiSources |
    Format-Table -AutoSize |
    Out-String |
    Write-Host

Write-Host "Reviewed exact overlap decisions" -ForegroundColor Cyan
$classified |
    Where-Object { $_.ReviewedExactOverlap } |
    Sort-Object Name |
    Select-Object Name, Classification, DecisionSuccessor, DecisionNote |
    Format-Table -AutoSize -Wrap |
    Out-String |
    Write-Host

if ($ShowCandidates) {
    Write-Host "Candidate actions" -ForegroundColor Cyan
    $classified |
        Where-Object { $_.Classification -ne "keep" } |
        Sort-Object Classification, Category, Name |
        Select-Object Classification, Name, Category, Origin, Successor, DecisionSuccessor, OpenAiSources |
        Format-Table -AutoSize |
        Out-String |
        Write-Host
}

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Use reviewed exact-overlap decisions before adding deprecated metadata."
Write-Host "  2. Keep DCR-only source-of-truth and mirror governance as local overlay."
Write-Host "  3. Run tools/deprecation-dashboard.ps1 before any physical deletion wave."
Write-Host "  4. Delete only Stage 4 candidates with ELIGIBLE-FOR-REMOVAL."
Write-Host ""
