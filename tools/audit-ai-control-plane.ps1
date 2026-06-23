param(
    [string]$RepoRoot = $PSScriptRoot,
    [string]$HomeRoot = $HOME,
    [switch]$NoSecrets
)

$ErrorActionPreference = "Stop"

if ((Split-Path -Leaf $RepoRoot) -eq "tools") {
    $RepoRoot = Split-Path $RepoRoot -Parent
}

$sourceRegistryPath = Join-Path $RepoRoot ".ai\control-plane\source-registry.json"
$targetRegistryPath = Join-Path $RepoRoot ".ai\control-plane\target-registry.json"
$homePolicyPath = Join-Path $RepoRoot ".ai\control-plane\home-inventory.policy.json"
$legacyPathMap = Join-Path $RepoRoot ".ai\compatibility\legacy-path-map.json"
$navigationMapPath = Join-Path $RepoRoot ".ai\10_CONTROL\navigation-map.json"
$sourceLayoutPath = Join-Path $RepoRoot ".ai\20_SOURCE\source-layout.json"

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required control-plane file missing: $Path"
    }

    return Get-Content -LiteralPath $Path -Raw -Encoding utf8 | ConvertFrom-Json
}

function Expand-PolicyPath {
    param([string]$Path)

    return $Path.Replace("%USERPROFILE%", $HomeRoot).Replace("/", "\")
}

function Normalize-RelativePath {
    param([string]$Path)

    return $Path.Replace("\", "/").TrimEnd("/").ToLowerInvariant()
}

function Get-SafeInventory {
    param([string]$Path)

    $result = [ordered]@{
        path = $Path
        exists = $false
        inaccessible = $false
        fileCount = 0
        directoryCount = 0
    }

    try {
        $exists = Test-Path -LiteralPath $Path
        $result.exists = [bool]$exists
        if (-not $exists) { return $result }

        $item = Get-Item -LiteralPath $Path -Force
        if ($item.PSIsContainer) {
            $children = Get-ChildItem -LiteralPath $Path -Force -ErrorAction Stop
            $result.fileCount = @($children | Where-Object { -not $_.PSIsContainer }).Count
            $result.directoryCount = @($children | Where-Object { $_.PSIsContainer }).Count
        }
        else {
            $result.fileCount = 1
        }
    }
    catch {
        $result.inaccessible = $true
        $result.error = $_.Exception.Message
    }

    return $result
}

$sourceRegistry = Read-JsonFile -Path $sourceRegistryPath
$targetRegistry = Read-JsonFile -Path $targetRegistryPath
$homePolicy = Read-JsonFile -Path $homePolicyPath
$legacy = Read-JsonFile -Path $legacyPathMap
$navigation = Read-JsonFile -Path $navigationMapPath
$sourceLayout = Read-JsonFile -Path $sourceLayoutPath

$errors = @()

if (-not $sourceRegistry.entries -or @($sourceRegistry.entries).Count -eq 0) {
    $errors += "source-registry.json has no entries"
}

foreach ($entry in @($sourceRegistry.entries)) {
    if (-not $entry.id -or -not $entry.type -or -not $entry.canonical_path -or -not $entry.lifecycle -or -not $entry.hash) {
        $errors += "source registry entry is incomplete: $($entry | ConvertTo-Json -Compress -Depth 4)"
        continue
    }

    $canonicalFullPath = Join-Path $RepoRoot ($entry.canonical_path -replace '/', '\')
    if (-not (Test-Path -LiteralPath $canonicalFullPath)) {
        $errors += "canonical path missing for $($entry.id): $($entry.canonical_path)"
    }
}

foreach ($target in @($targetRegistry.targets)) {
    if (-not $target.id -or -not $target.path -or -not $target.source -or -not $target.editPolicy) {
        $errors += "target registry entry is incomplete: $($target | ConvertTo-Json -Compress -Depth 4)"
    }
}

foreach ($pathMap in @($legacy.paths)) {
    if (-not $pathMap.legacy -or -not $pathMap.future -or -not $pathMap.currentPrimary) {
        $errors += "legacy path map entry is incomplete: $($pathMap | ConvertTo-Json -Compress -Depth 4)"
    }
}

$legacyPairs = @{}
foreach ($pathMap in @($legacy.paths)) {
    if (-not $pathMap.legacy -or -not $pathMap.future) { continue }

    $key = "$(Normalize-RelativePath -Path $pathMap.legacy)|$(Normalize-RelativePath -Path $pathMap.future)"
    $legacyPairs[$key] = $true
}

$navigationEntry = Join-Path $RepoRoot ".ai\00_START_HERE.md"
if (-not (Test-Path -LiteralPath $navigationEntry)) {
    $errors += "navigation entrypoint missing: .ai/00_START_HERE.md"
}

if (-not $navigation.entrypoint) {
    $errors += "navigation map is missing entrypoint"
}
else {
    $declaredEntrypoint = Join-Path $RepoRoot ($navigation.entrypoint -replace '/', '\')
    if ($declaredEntrypoint -ne $navigationEntry) {
        $errors += "navigation entrypoint mismatch: $($navigation.entrypoint)"
    }
}

foreach ($layer in @($navigation.layers)) {
    if (-not $layer.id -or -not $layer.numberedPath -or -not $layer.canonicalPaths -or -not $layer.editPolicy) {
        $errors += "navigation layer entry is incomplete: $($layer | ConvertTo-Json -Compress -Depth 5)"
        continue
    }

    $numberedFullPath = Join-Path $RepoRoot ($layer.numberedPath -replace '/', '\')
    if (-not (Test-Path -LiteralPath $numberedFullPath)) {
        $errors += "navigation layer path missing for $($layer.id): $($layer.numberedPath)"
    }

    foreach ($canonicalPath in @($layer.canonicalPaths)) {
        $canonicalFullPath = Join-Path $RepoRoot ($canonicalPath -replace '/', '\')
        if (-not (Test-Path -LiteralPath $canonicalFullPath)) {
            $errors += "navigation canonical path missing for $($layer.id): $canonicalPath"
        }
    }
}

foreach ($group in @($sourceLayout.groups)) {
    if (-not $group.id -or -not $group.type -or -not $group.currentPrimary -or -not $group.futurePrimary -or -not $group.readiness) {
        $errors += "source layout group is incomplete: $($group | ConvertTo-Json -Compress -Depth 5)"
        continue
    }

    $currentFullPath = Join-Path $RepoRoot ($group.currentPrimary -replace '/', '\')
    if (-not (Test-Path -LiteralPath $currentFullPath)) {
        $errors += "source layout current primary missing for $($group.id): $($group.currentPrimary)"
    }

    $futureFullPath = Join-Path $RepoRoot ($group.futurePrimary -replace '/', '\')
    if (-not (Test-Path -LiteralPath $futureFullPath)) {
        $errors += "source layout future path missing for $($group.id): $($group.futurePrimary)"
    }

    $mappedLegacyPath = if ($group.legacyPath) { $group.legacyPath } else { $group.currentPrimary }
    $pairKey = "$(Normalize-RelativePath -Path $mappedLegacyPath)|$(Normalize-RelativePath -Path $group.futurePrimary)"
    if (-not $legacyPairs.ContainsKey($pairKey)) {
        $errors += "source layout pair missing from legacy path map for $($group.id): $mappedLegacyPath -> $($group.futurePrimary)"
    }
}

$classified = @{}
foreach ($pathEntry in @($homePolicy.classifiedPaths)) {
    $expanded = Expand-PolicyPath -Path $pathEntry.path
    $classified[$expanded.ToLowerInvariant()] = $pathEntry
}

$auditHints = @($homePolicy.auditHints | ForEach-Object { Expand-PolicyPath -Path $_ })
$homeFindings = @()
$unclassified = @()

foreach ($hint in $auditHints) {
    $inventory = Get-SafeInventory -Path $hint
    $key = $hint.ToLowerInvariant()
    $policyEntry = $classified[$key]
    if (-not $policyEntry -and $inventory.exists) {
        $unclassified += $hint
    }

    $homeFindings += [ordered]@{
        path = $hint
        exists = $inventory.exists
        inaccessible = $inventory.inaccessible
        fileCount = $inventory.fileCount
        directoryCount = $inventory.directoryCount
        classification = if ($policyEntry) { $policyEntry.classification } else { "unclassified" }
        handling = if ($policyEntry) { $policyEntry.handling } else { "metadata-only" }
    }
}

foreach ($classifiedPath in $classified.Keys) {
    if ($auditHints -contains $classifiedPath) { continue }
    $entry = $classified[$classifiedPath]
    $expanded = Expand-PolicyPath -Path $entry.path
    $inventory = Get-SafeInventory -Path $expanded
    if ($inventory.exists) {
        $homeFindings += [ordered]@{
            path = $expanded
            exists = $inventory.exists
            inaccessible = $inventory.inaccessible
            fileCount = $inventory.fileCount
            directoryCount = $inventory.directoryCount
            classification = $entry.classification
            handling = $entry.handling
        }
    }
}

if ($unclassified.Count -gt 0) {
    $errors += "unclassified home paths: $($unclassified -join ', ')"
}

$summary = [ordered]@{
    sourceEntries = @($sourceRegistry.entries).Count
    targetEntries = @($targetRegistry.targets).Count
    navigationLayers = @($navigation.layers).Count
    sourceLayoutGroups = @($sourceLayout.groups).Count
    homeFindings = @($homeFindings).Count
    unclassifiedHomePaths = @($unclassified).Count
    noSecrets = [bool]$NoSecrets
}

$report = [ordered]@{
    status = if ($errors.Count -eq 0) { "ok" } else { "failed" }
    summary = $summary
    home = @($homeFindings | Sort-Object path)
    errors = @($errors)
}

$report | ConvertTo-Json -Depth 8

if ($errors.Count -gt 0) {
    exit 1
}
