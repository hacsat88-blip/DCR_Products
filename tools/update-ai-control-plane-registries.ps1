param(
    [string]$RepoRoot = $PSScriptRoot,
    [switch]$Check
)

$ErrorActionPreference = "Stop"

if ((Split-Path -Leaf $RepoRoot) -eq "tools") {
    $RepoRoot = Split-Path $RepoRoot -Parent
}

$CatalogPaths = Join-Path $RepoRoot "tools\lib\catalog-paths.ps1"
. $CatalogPaths

$registryPath = Get-DcrControlPlaneSourceRegistryPath -RepoRoot $RepoRoot
$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"
$agentsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"
$bookDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "books"
$kernelDir = Join-Path $RepoRoot ".ai\kernel"
$moduleCandidateDir = Join-Path $RepoRoot ".ai\core\modules"
$moduleLegacyDir = Join-Path $RepoRoot ".ai\module"
if (Test-Path -LiteralPath (Join-Path $moduleCandidateDir "unified-router.md")) {
    $moduleDir = $moduleCandidateDir
}
else {
    $moduleDir = $moduleLegacyDir
}
$environmentDir = Join-Path $RepoRoot ".ai\environments"

function ConvertTo-DcrRelativePath {
    param([string]$Path)

    $rootFull = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/')
    $pathFull = [System.IO.Path]::GetFullPath($Path)
    return $pathFull.Substring($rootFull.Length + 1).Replace('\', '/')
}

function Get-FileSha256 {
    param([string]$Path)

    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-CombinedHash {
    param([object[]]$Files)

    $joined = (($Files | ForEach-Object { "$($_.path):$($_.sha256)" }) -join "`n")
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($joined)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
}

function New-FileRecord {
    param([System.IO.FileInfo]$File)

    [ordered]@{
        path = ConvertTo-DcrRelativePath -Path $File.FullName
        sha256 = Get-FileSha256 -Path $File.FullName
    }
}

function New-Entry {
    param(
        [string]$Id,
        [string]$Type,
        [string]$CanonicalPath,
        [string]$Lifecycle,
        [object[]]$Files,
        [string[]]$GeneratedTargets = @(),
        [string]$Upstream = "local"
    )

    $fileRecords = @($Files | ForEach-Object { New-FileRecord -File $_ })
    [ordered]@{
        id = $Id
        type = $Type
        canonical_path = $CanonicalPath.Replace('\', '/')
        lifecycle = $Lifecycle
        generated_targets = @($GeneratedTargets)
        upstream = $Upstream
        hash = Get-CombinedHash -Files $fileRecords
        files = @($fileRecords)
    }
}

$entries = @()

Get-ChildItem -LiteralPath $rulesDir -File -Filter "*.md" -Force |
    Where-Object { $_.BaseName -ne "README" } |
    Sort-Object Name |
    ForEach-Object {
        $lifecycle = if ($_.BaseName.StartsWith("_")) { "metadata" } else { "source-of-truth" }
        $entries += New-Entry -Id "rule.$($_.BaseName)" -Type "rule" -CanonicalPath (ConvertTo-DcrRelativePath -Path $_.FullName) -Lifecycle $lifecycle -Files @($_) -GeneratedTargets @("AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md", ".cursor/rules")
    }

Get-ChildItem -LiteralPath $skillsDir -Directory -Force |
    Sort-Object Name |
    ForEach-Object {
        $skillPath = Join-Path $_.FullName "SKILL.md"
        if (-not (Test-Path -LiteralPath $skillPath)) { return }
        $skillFile = Get-Item -LiteralPath $skillPath
        $skillFiles = @(Get-ChildItem -LiteralPath $_.FullName -File -Recurse -Force | Sort-Object FullName)
        $lifecycle = if ($_.Name.StartsWith("_")) { "metadata" } else { "source-of-truth" }
        $entries += New-Entry -Id "skill.$($_.Name)" -Type "skill" -CanonicalPath (ConvertTo-DcrRelativePath -Path $skillPath) -Lifecycle $lifecycle -Files $skillFiles -GeneratedTargets @("AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md", "%USERPROFILE%/.agents/skills")
    }

$agentGroups = @{}
Get-ChildItem -LiteralPath $agentsDir -File -Include "*.md", "*.toml" -Force |
    Where-Object { $_.BaseName -ne "README" } |
    ForEach-Object {
        if (-not $agentGroups.ContainsKey($_.BaseName)) {
            $agentGroups[$_.BaseName] = @()
        }
        $agentGroups[$_.BaseName] += $_
    }

foreach ($agentName in ($agentGroups.Keys | Sort-Object)) {
    $files = @($agentGroups[$agentName] | Sort-Object Extension, Name)
    $primary = ($files | Where-Object { $_.Extension -eq ".md" } | Select-Object -First 1)
    if (-not $primary) { $primary = $files | Select-Object -First 1 }
    $entries += New-Entry -Id "agent.$agentName" -Type "agent" -CanonicalPath (ConvertTo-DcrRelativePath -Path $primary.FullName) -Lifecycle "source-of-truth" -Files $files -GeneratedTargets @(".codex/agents", ".claude/agents")
}

foreach ($rootInfo in @(
        @{ Type = "book"; Root = $bookDir; Prefix = "book"; Targets = @("AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md") },
        @{ Type = "kernel"; Root = $kernelDir; Prefix = "kernel"; Targets = @("AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md", ".cursor/rules") },
        @{ Type = "module"; Root = $moduleDir; Prefix = "module"; Targets = @("AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md") },
        @{ Type = "environment"; Root = $environmentDir; Prefix = "environment"; Targets = @("AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md", ".cursor/rules") }
    )) {
    if (-not (Test-Path -LiteralPath $rootInfo.Root)) { continue }
    Get-ChildItem -LiteralPath $rootInfo.Root -File -Recurse -Force |
        Sort-Object FullName |
        ForEach-Object {
            $relative = ConvertTo-DcrRelativePath -Path $_.FullName
            $idSuffix = ($relative -replace '^\.ai/', '' -replace '[\\/]', '.' -replace '\.[^.]+$', '')
            $entries += New-Entry -Id "$($rootInfo.Prefix).$idSuffix" -Type $rootInfo.Type -CanonicalPath $relative -Lifecycle "source-of-truth" -Files @($_) -GeneratedTargets $rootInfo.Targets
        }
}

$registry = [ordered]@{
    schemaVersion = 1
    generatedBy = "tools/update-ai-control-plane-registries.ps1"
    generatedAt = "manual-refresh"
    assetResolution = [ordered]@{
        currentPrimary = ".ai/assets for rules, skills, agents, and books; .ai/kernel and .ai/environments remain compatibility roots"
        futurePrimary = ".ai/core/kernel and .ai/core/environments after explicit source-layout switch"
        compatibilityMap = ".ai/compatibility/legacy-path-map.json"
    }
    counts = [ordered]@{
        total = $entries.Count
        rules = @($entries | Where-Object { $_.type -eq "rule" }).Count
        skills = @($entries | Where-Object { $_.type -eq "skill" }).Count
        agents = @($entries | Where-Object { $_.type -eq "agent" }).Count
        books = @($entries | Where-Object { $_.type -eq "book" }).Count
        kernel = @($entries | Where-Object { $_.type -eq "kernel" }).Count
        modules = @($entries | Where-Object { $_.type -eq "module" }).Count
        environments = @($entries | Where-Object { $_.type -eq "environment" }).Count
    }
    entries = @($entries)
}

$json = ($registry | ConvertTo-Json -Depth 12)
$json = $json.TrimEnd() + [Environment]::NewLine

if ($Check) {
    if (-not (Test-Path -LiteralPath $registryPath)) {
        Write-Error "source registry missing: $registryPath"
    }

    $existing = (Get-Content -LiteralPath $registryPath -Raw -Encoding utf8) -replace "`r`n", "`n"
    $candidate = $json -replace "`r`n", "`n"
    if ($existing -ne $candidate) {
        Write-Error "source registry is stale. Run tools/update-ai-control-plane-registries.ps1."
    }

    Write-Host "[OK] source registry is fresh" -ForegroundColor Green
    exit 0
}

New-Item -ItemType Directory -Path (Split-Path $registryPath -Parent) -Force | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($registryPath, $json, $utf8)
Write-Host "[OK] wrote $registryPath with $($entries.Count) entries" -ForegroundColor Green
