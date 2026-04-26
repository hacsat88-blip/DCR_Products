<#
.SYNOPSIS
  DCR Products — Deploy script
  サトシ開発 (Git管理) から各エディタのユーザーレベルパスへ一方向同期

.DESCRIPTION
  対象エディタと同期先:
    VS Code Copilot : ~/.agents/skills/
    Cursor          : ~/.cursor/rules/  (.ai/catalog/rules/ と .ai/catalog/skills/ から .mdc を生成して同期)
    Agents          : .ai/catalog/agents-source/ → .codex/agents/ (toml) + .claude/agents/ (md)

.PARAMETER Target
    同期先を指定: all | vscode | cursor | windsurf | agents | dcr
  デフォルト: all

.PARAMETER DryRun
  実際にはコピーせず、対象ファイルを表示するだけ

.PARAMETER Check
  エディタ側とリポジトリ側の差分を検出する（逆同期チェック）

.EXAMPLE
  .\deploy.ps1
  .\deploy.ps1 -Target vscode
  .\deploy.ps1 -Target cursor -DryRun
  .\deploy.ps1 -Target agents
  .\deploy.ps1 -Check
#>

param(
    [ValidateSet("all", "vscode", "cursor", "windsurf", "agents", "dcr")]
    [string]$Target = "all",
    [switch]$DryRun,
    [switch]$Check,
    [switch]$Watch,
    [switch]$Backup
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
$UserHome = $env:USERPROFILE
$CatalogPaths = Join-Path $RepoRoot "tools\lib\catalog-paths.ps1"
. $CatalogPaths

# ── Unified Adapter Framework (new) ──
$DeployAll = Join-Path $RepoRoot "tools\deploy-all.ps1"
$WindsurfAdapter = Join-Path $RepoRoot "tools\adapters\windsurf.ps1"
if ((Test-Path $DeployAll) -and -not $Check -and ($Target -in @("all", "vscode", "cursor", "windsurf"))) {
    Write-Host ""
    Write-Host "=== Deploy Adapters (Unified Framework) ===" -ForegroundColor Cyan
    $targetArg = if ($Target -eq "all") { "all" } else { $Target }
    if ($DryRun) {
        & $DeployAll -Target $targetArg -DryRun
    }
    else {
        & $DeployAll -Target $targetArg
    }
    Write-Host ""
}

# ── Paths ──
$SourceSkills = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"
$SourceRules = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$SourceCursorKernel = Join-Path $RepoRoot ".cursor\rules\dcr-kernel.md"
$SourceAgents = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"

$DestVSCodeSkills = Join-Path $UserHome ".agents\skills"
$DestCursorRules = Join-Path $UserHome ".cursor\rules"
$DestCursorManifest = Join-Path $DestCursorRules ".dcr-managed-files.json"
$DestProjectCursorRules = Join-Path $RepoRoot ".cursor\rules"
$DestCodexAgents = Join-Path $RepoRoot ".codex\agents"
$DestClaudeAgents = Join-Path $RepoRoot ".claude\agents"

function Get-TempDirectory {
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("dcr-cursor-rules-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    return $tempDir
}

function Get-WindsurfDrift {
    param(
        [string]$RepoRootPath,
        [string]$DestinationPath,
        [string]$AdapterScriptPath
    )

    if (-not (Test-Path $AdapterScriptPath)) {
        throw "Windsurf adapter not found: $AdapterScriptPath"
    }

    $tempDir = Get-TempDirectory
    $tempOutputRoot = Join-Path $tempDir ".windsurf"

    try {
        & $AdapterScriptPath -RepoRoot $RepoRootPath -OutputRoot $tempOutputRoot -Quiet -InformationAction Ignore
        return Get-DirectoryDrift -Source $tempOutputRoot -Destination $DestinationPath
    }
    finally {
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force
        }
    }
}

function Get-RuleDescription {
    param(
        [string]$Path
    )

    $lines = Get-Content -Path $Path -Encoding utf8
    $inFrontmatter = $false
    $frontmatterStarted = $false

    for ($index = 0; $index -lt $lines.Count; $index++) {
        $line = $lines[$index]
        $trimmed = $line.Trim()
        if (-not $frontmatterStarted -and $trimmed -eq '---') {
            $frontmatterStarted = $true
            $inFrontmatter = $true
            continue
        }
        if ($inFrontmatter) {
            if ($trimmed -eq '---') {
                $inFrontmatter = $false
                continue
            }

            if ($trimmed -match '^description:\s*(.*)$') {
                $description = $Matches[1].Trim()
                if ($description) {
                    return $description.Trim([char]34, [char]39)
                }

                $descriptionLines = @()
                for ($nextIndex = $index + 1; $nextIndex -lt $lines.Count; $nextIndex++) {
                    $nextLine = $lines[$nextIndex]
                    if ($nextLine -notmatch '^\s+') {
                        break
                    }

                    $descriptionLines += $nextLine.Trim()
                    $index = $nextIndex
                }

                if ($descriptionLines.Count -gt 0) {
                    return (($descriptionLines -join ' ') -replace '\s+', ' ').Trim([char]34, [char]39)
                }
            }

            continue
        }
        if (-not $trimmed) {
            continue
        }
        if ($trimmed.StartsWith("#")) {
            continue
        }
        if ($trimmed.StartsWith('```')) {
            continue
        }
        return $trimmed.Replace([char]34, [char]39)
    }

    return [System.IO.Path]::GetFileNameWithoutExtension($Path)
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Remove-LeadingFrontmatter {
    param(
        [string]$Content
    )

    if (-not $Content) {
        return $Content
    }

    # Strip only the first YAML frontmatter block at file start.
    if ($Content -match '(?s)^---\r?\n.*?\r?\n---\r?\n?') {
        return $Content.Substring($Matches[0].Length)
    }

    return $Content
}

function Get-ManagedFileNames {
    param(
        [string]$ManifestPath
    )

    if (-not $ManifestPath -or -not (Test-Path $ManifestPath)) {
        return @()
    }

    try {
        $manifestContent = Get-Content -Path $ManifestPath -Raw -Encoding utf8 | ConvertFrom-Json
        return @($manifestContent) | ForEach-Object { "$($_)" } | Sort-Object -Unique
    }
    catch {
        Write-Warning "Managed file manifest is invalid and will be rebuilt: $ManifestPath"
        return @()
    }
}

function New-CursorRulePackage {
    param(
        [string]$RulesSource,
        [string]$SkillsSource,
        [string]$KernelSource,
        [string]$OutputDir
    )

    if (-not (Test-Path $RulesSource)) {
        throw "Source rules not found: $RulesSource"
    }

    if (-not (Test-Path $KernelSource)) {
        throw "Cursor kernel not found: $KernelSource"
    }

    # Rules → .mdc
    $ruleFiles = Get-ChildItem -Path $RulesSource -File -Filter *.md |
    Where-Object { $_.BaseName -notlike "_*" } |
    Sort-Object Name
    foreach ($ruleFile in $ruleFiles) {
        $description = Get-RuleDescription -Path $ruleFile.FullName
        $body = Get-Content -Path $ruleFile.FullName -Raw -Encoding utf8
        $body = Remove-LeadingFrontmatter -Content $body
        $cursorContent = @(
            "---"
            "description: $description"
            'globs: ""'
            "alwaysApply: false"
            "---"
            ""
            $body.TrimEnd()
            ""
        ) -join "`r`n"

        $destination = Join-Path $OutputDir ($ruleFile.BaseName + ".mdc")
        Write-Utf8NoBom -Path $destination -Content $cursorContent
    }

    # Skills → .mdc (prefixed with "skill-")
    if (Test-Path $SkillsSource) {
        $skillDirs = Get-ChildItem -Path $SkillsSource -Directory |
        Where-Object { $_.Name -notlike "_*" } |
        Sort-Object Name
        foreach ($skillDir in $skillDirs) {
            $skillFile = Join-Path $skillDir.FullName "SKILL.md"
            if (Test-Path $skillFile) {
                $description = Get-RuleDescription -Path $skillFile
                $body = Get-Content -Path $skillFile -Raw -Encoding utf8
                $body = Remove-LeadingFrontmatter -Content $body
                if (-not $body) { continue }
                $cursorContent = @(
                    "---"
                    "description: $description"
                    'globs: ""'
                    "alwaysApply: false"
                    "---"
                    ""
                    $body.TrimEnd()
                    ""
                ) -join "`r`n"

                $destination = Join-Path $OutputDir ("skill-" + $skillDir.Name + ".mdc")
                Write-Utf8NoBom -Path $destination -Content $cursorContent
            }
        }
    }

    Copy-Item -Path $KernelSource -Destination (Join-Path $OutputDir "dcr-kernel.md") -Force
}

function Get-DeprecationReport {
    param([string]$CatalogRoot)

    $report = @{ rules = @(); skills = @(); agents = @() }
    $patterns = @(
        @{ Kind = 'rules'; Path = Join-Path $CatalogRoot 'rules'; Filter = '*.md' }
        @{ Kind = 'agents'; Path = Join-Path $CatalogRoot 'agents-source'; Filter = '*.md' }
        @{ Kind = 'skills'; Path = Join-Path $CatalogRoot 'skills'; Filter = 'SKILL.md'; Recurse = $true }
    )
    foreach ($p in $patterns) {
        if (-not (Test-Path $p.Path)) { continue }
        $params = @{ Path = $p.Path; File = $true; Filter = $p.Filter }
        if ($p.Recurse) { $params.Recurse = $true }
        $files = Get-ChildItem @params
        foreach ($f in $files) {
            $head = Get-Content -Path $f.FullName -TotalCount 20 -Encoding utf8
            $isDep = $head | Where-Object { $_ -match '^\s*deprecated\s*:\s*true\s*$' }
            if ($isDep) {
                $succ = ($head | Where-Object { $_ -match '^\s*successor\s*:' } | Select-Object -First 1) -replace '^\s*successor\s*:\s*', ''
                $name = $f.BaseName
                if ($p.Kind -eq 'skills') { $name = (Split-Path $f.DirectoryName -Leaf) }
                $report[$p.Kind] += [pscustomobject]@{ Name = $name; Successor = $succ.Trim() }
            }
        }
    }
    return $report
}

function Write-DeprecationSummary {
    param([string]$CatalogRoot)

    $report = Get-DeprecationReport -CatalogRoot $CatalogRoot
    $total = $report.rules.Count + $report.skills.Count + $report.agents.Count
    if ($total -eq 0) { return }

    Write-Host ""
    Write-Host "=== Deprecation Aliases (旧名 → 新後継) ===" -ForegroundColor Cyan
    foreach ($kind in @('rules', 'skills', 'agents')) {
        if ($report[$kind].Count -gt 0) {
            Write-Host "  [$kind] $($report[$kind].Count) deprecated:" -ForegroundColor Yellow
            foreach ($entry in $report[$kind]) {
                Write-Host "    $($entry.Name) → $($entry.Successor)" -ForegroundColor DarkGray
            }
        }
    }
    Write-Host ""
}

function Sync-Agents {
    param(
        [string]$Source,
        [string]$CodexDest,
        [string]$ClaudeDest
    )

    if (-not (Test-Path $Source)) {
        Write-Warning "Agents source not found: $Source"
        return
    }

    $tomlFiles = Get-ChildItem -Path $Source -File -Filter '*.toml'
    $mdFiles = Get-ChildItem -Path $Source -File -Filter '*.md' | Where-Object { $_.Name -ne 'README.md' }

    if ($DryRun) {
        Write-Host "[DRY RUN] Codex agents : $($tomlFiles.Count) toml files → $CodexDest" -ForegroundColor Yellow
        Write-Host "[DRY RUN] Claude agents : $($mdFiles.Count) md files → $ClaudeDest" -ForegroundColor Yellow
        return
    }

    New-Item -ItemType Directory -Force -Path $CodexDest, $ClaudeDest | Out-Null

    foreach ($file in $tomlFiles) {
        Copy-Item -Path $file.FullName -Destination (Join-Path $CodexDest $file.Name) -Force
    }
    foreach ($file in $mdFiles) {
        Copy-Item -Path $file.FullName -Destination (Join-Path $ClaudeDest $file.Name) -Force
    }

    Write-Host "[OK] Codex agents : $($tomlFiles.Count) files → $CodexDest" -ForegroundColor Green
    Write-Host "[OK] Claude agents : $($mdFiles.Count) files → $ClaudeDest" -ForegroundColor Green
}

function Sync-DCRConfig {
    param(
        [string]$Source,
        [string]$ConfigPath
    )

    # .dcr/config.json をホーム ~/.config/dcr/ へレプリケート
    # Phase 1 MVP: .dcr/config.json のみ（テンプレートは同期不要、動的に init される）
    if (-not (Test-Path $ConfigPath)) {
        Write-Warning ".dcr config not found: $ConfigPath"
        return
    }

    $dcrConfigDest = Join-Path $HOME ".config/dcr"
    try {
        if ($DryRun) {
            Write-Host "[DRY RUN] .dcr config : $ConfigPath → $dcrConfigDest" -ForegroundColor Yellow
            return
        }

        New-Item -ItemType Directory -Force -Path $dcrConfigDest | Out-Null
        Copy-Item -Path $ConfigPath -Destination (Join-Path $dcrConfigDest "config.json") -Force
        Write-Host "[OK] .dcr config : config.json → $dcrConfigDest" -ForegroundColor Green
    }
    catch {
        Write-Warning "Failed to sync .dcr config: $_"
    }
}

function Sync-Directory {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Label
    )

    if (-not (Test-Path $Source)) {
        Write-Warning "Source not found: $Source"
        return
    }

    $sourceItems = Get-ChildItem $Source -Directory |
    Where-Object { $_.Name -notlike "_*" }
    $count = $sourceItems.Count

    if ($DryRun) {
        Write-Host "[DRY RUN] $Label : $count items → $Destination" -ForegroundColor Yellow
        $sourceItems | ForEach-Object { Write-Host "  $_" }
        return
    }

    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }

    foreach ($item in $sourceItems) {
        Copy-Item -Path $item.FullName -Destination $Destination -Recurse -Force
    }
    Write-Host "[OK] $Label : $count items → $Destination" -ForegroundColor Green
}

function Sync-Files {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Label,
        [switch]$Prune,
        [string]$PruneManifestPath
    )

    if (-not (Test-Path $Source)) {
        Write-Warning "Source not found: $Source"
        return
    }

    $sourceItems = Get-ChildItem $Source -File
    $count = $sourceItems.Count
    $sourceNames = $sourceItems | Select-Object -ExpandProperty Name | Sort-Object -Unique
    $managedNames = Get-ManagedFileNames -ManifestPath $PruneManifestPath

    $staleItems = @()
    if (Test-Path $Destination) {
        $destItems = Get-ChildItem $Destination -File | Where-Object {
            -not $PruneManifestPath -or $_.FullName -ne $PruneManifestPath
        }
        if ($PruneManifestPath -and -not (Test-Path $PruneManifestPath) -and $destItems.Count -gt 0) {
            Write-Warning "Managed file manifest not found. Pre-manifest stale files in $Destination will not be pruned until the next deploy writes $PruneManifestPath."
        }
        if ($PruneManifestPath) {
            $staleItems = $destItems | Where-Object {
                $_.Name -in $managedNames -and $_.Name -notin $sourceNames
            }
        }
        else {
            $staleItems = $destItems | Where-Object { $_.Name -notin $sourceNames }
        }
    }

    if ($DryRun) {
        Write-Host "[DRY RUN] $Label : $count files → $Destination" -ForegroundColor Yellow
        if ($Prune -and $staleItems.Count -gt 0) {
            Write-Host "  stale files to remove: $($staleItems.Count)" -ForegroundColor Yellow
        }
        $sourceItems | ForEach-Object { Write-Host "  $_" }
        return
    }

    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }

    if ($Prune) {
        foreach ($stale in $staleItems) {
            Remove-Item -Path $stale.FullName -Force
        }
    }

    foreach ($item in $sourceItems) {
        Copy-Item -Path $item.FullName -Destination $Destination -Force
    }

    if ($PruneManifestPath) {
        Write-Utf8NoBom -Path $PruneManifestPath -Content (($sourceNames | ConvertTo-Json -Compress) + "`r`n")
    }

    Write-Host "[OK] $Label : $count files → $Destination" -ForegroundColor Green
}

# ── Diff Check ──
function Get-DirectoryDrift {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$IgnoreNames = @()
    )

    $diffs = @()

    if (-not (Test-Path $Source)) {
        $diffs += "[SOURCE_MISSING] $Source"
        return $diffs
    }

    if (-not (Test-Path $Destination)) {
        $diffs += "[DESTINATION_MISSING] $Destination"
        return $diffs
    }

    $destFiles = Get-ChildItem $Destination -Recurse -File | Where-Object { $_.Name -notin $IgnoreNames }
    foreach ($df in $destFiles) {
        $relativePath = $df.FullName.Substring($Destination.Length + 1)
        $sourceFile = Join-Path $Source $relativePath
        if (-not (Test-Path $sourceFile)) {
            $diffs += "[EXTRA] $relativePath (exists only in destination)"
        }
        else {
            $sourceHash = (Get-FileHash $sourceFile -Algorithm MD5).Hash
            $destHash = (Get-FileHash $df.FullName -Algorithm MD5).Hash
            if ($sourceHash -ne $destHash) {
                $diffs += "[MODIFIED] $relativePath (destination differs from source)"
            }
        }
    }

    $sourceFiles = Get-ChildItem $Source -Recurse -File | Where-Object { $_.Name -notin $IgnoreNames }
    foreach ($sf in $sourceFiles) {
        $relativePath = $sf.FullName.Substring($Source.Length + 1)
        $destFile = Join-Path $Destination $relativePath
        if (-not (Test-Path $destFile)) {
            $diffs += "[MISSING] $relativePath (not deployed to destination)"
        }
    }

    return $diffs
}

function Get-FlatFileDrift {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Filter,
        [string[]]$IgnoreNames = @()
    )

    $diffs = @()

    if (-not (Test-Path $Source)) {
        $diffs += "[SOURCE_MISSING] $Source"
        return $diffs
    }

    if (-not (Test-Path $Destination)) {
        $diffs += "[DESTINATION_MISSING] $Destination"
        return $diffs
    }

    $sourceFiles = Get-ChildItem $Source -File -Filter $Filter | Where-Object { $_.Name -notin $IgnoreNames }
    $destFiles = Get-ChildItem $Destination -File -Filter $Filter | Where-Object { $_.Name -notin $IgnoreNames }

    foreach ($sf in $sourceFiles) {
        $destFile = Join-Path $Destination $sf.Name
        if (-not (Test-Path $destFile)) {
            $diffs += "[MISSING] $($sf.Name)"
        }
        elseif ((Get-FileHash $sf.FullName -Algorithm MD5).Hash -ne (Get-FileHash $destFile -Algorithm MD5).Hash) {
            $diffs += "[MODIFIED] $($sf.Name)"
        }
    }

    $sourceNames = $sourceFiles | Select-Object -ExpandProperty Name
    foreach ($df in $destFiles) {
        if ($df.Name -notin $sourceNames) {
            $diffs += "[EXTRA] $($df.Name)"
        }
    }

    return $diffs
}

function Get-FileDrift {
    param(
        [string]$SourcePath,
        [string]$DestinationPath,
        [string]$Label
    )

    $diffs = @()

    if (-not (Test-Path $SourcePath)) {
        $diffs += "[SOURCE_MISSING] $Label"
        return $diffs
    }

    if (-not (Test-Path $DestinationPath)) {
        $diffs += "[MISSING] $Label"
        return $diffs
    }

    if ((Get-FileHash $SourcePath -Algorithm MD5).Hash -ne (Get-FileHash $DestinationPath -Algorithm MD5).Hash) {
        $diffs += "[MODIFIED] $Label"
    }

    return $diffs
}

function Write-PrecheckSummary {
    param(
        [string]$Label,
        [string[]]$Diffs
    )

    if ($Diffs.Count -eq 0) {
        Write-Host "[PRECHECK] $Label : already in sync" -ForegroundColor DarkGray
    }
    else {
        Write-Host "[PRECHECK] $Label : $($Diffs.Count) differences will be reconciled" -ForegroundColor Yellow
    }
}

function Assert-NoDrift {
    param(
        [string]$Label,
        [string[]]$Diffs
    )

    if ($Diffs.Count -eq 0) {
        Write-Host "[VERIFY] $Label : in sync" -ForegroundColor Green
        return
    }

    Write-Host "[VERIFY] $Label : drift remains after deploy" -ForegroundColor Red
    $Diffs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    throw "Deploy verification failed for $Label"
}

function Write-ManagedTargetNotice {
    param(
        [string]$Label,
        [string]$Destination
    )

    Write-Host "[MANAGED] $Label : $Destination is deploy-managed. Local edits here may be overwritten." -ForegroundColor DarkYellow
}

function Compare-Directories {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Label,
        [string[]]$IgnoreNames = @()
    )

    $diffs = Get-DirectoryDrift -Source $Source -Destination $Destination -IgnoreNames $IgnoreNames

    if ($diffs.Count -eq 0) {
        Write-Host "[OK] $Label : in sync" -ForegroundColor Green
    }
    else {
        Write-Host "[DRIFT] $Label : $($diffs.Count) differences found" -ForegroundColor Red
        $diffs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    }
}

# ── Backup ──
function Backup-DeployTarget {
    param(
        [string]$TargetPath,
        [string]$Label
    )

    if (-not (Test-Path $TargetPath)) { return }

    $backupRoot = Join-Path $TargetPath ".bak"
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDir = Join-Path $backupRoot $timestamp

    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    $items = Get-ChildItem -Path $TargetPath -File | Where-Object { $_.Name -ne '.bak' -and $_.DirectoryName -ne $backupRoot }
    foreach ($item in $items) {
        Copy-Item -Path $item.FullName -Destination $backupDir -Force
    }

    # Keep only last 3 backups
    $backups = Get-ChildItem -Path $backupRoot -Directory | Sort-Object Name -Descending
    if ($backups.Count -gt 3) {
        $backups | Select-Object -Skip 3 | ForEach-Object {
            Remove-Item -Path $_.FullName -Recurse -Force
        }
    }

    Write-Host "[BACKUP] $Label : $($items.Count) files → $backupDir" -ForegroundColor DarkCyan
}

# ── Main ──
Write-Host ""
Write-Host "DCR Products Deploy" -ForegroundColor Cyan
Write-Host "Source: $RepoRoot" -ForegroundColor DarkGray
Write-Host ""

if ($Check) {
    Write-Host "Running drift check..." -ForegroundColor Cyan
    Write-Host ""
    if ($Target -eq "all" -or $Target -eq "vscode") {
        Compare-Directories -Source $SourceSkills -Destination $DestVSCodeSkills -Label "VS Code Copilot skills"
    }
    if ($Target -eq "all" -or $Target -eq "cursor") {
        $cursorTempDir = Get-TempDirectory
        try {
            New-CursorRulePackage -RulesSource $SourceRules -SkillsSource $SourceSkills -KernelSource $SourceCursorKernel -OutputDir $cursorTempDir
            Compare-Directories -Source $cursorTempDir -Destination $DestCursorRules -Label "Cursor rules (user)" -IgnoreNames @('.dcr-managed-files.json')
            Compare-Directories -Source $cursorTempDir -Destination $DestProjectCursorRules -Label "Cursor rules (project)"
        }
        finally {
            if (Test-Path $cursorTempDir) {
                Remove-Item -Path $cursorTempDir -Recurse -Force
            }
        }
    }
    if ($Target -eq "all" -or $Target -eq "windsurf") {
        $windsurfDiffs = Get-WindsurfDrift -RepoRootPath $RepoRoot -DestinationPath (Join-Path $RepoRoot ".windsurf") -AdapterScriptPath $WindsurfAdapter
        if ($windsurfDiffs.Count -eq 0) {
            Write-Host "[OK] Windsurf rules/workflows/config : in sync" -ForegroundColor Green
        }
        else {
            Write-Host "[DRIFT] Windsurf rules/workflows/config : $($windsurfDiffs.Count) differences" -ForegroundColor Red
            $windsurfDiffs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        }
    }
    if ($Target -eq "all" -or $Target -eq "agents") {
        $codexDiffs = Get-FlatFileDrift -Source $SourceAgents -Destination $DestCodexAgents -Filter '*.toml'
        if ($codexDiffs.Count -eq 0) {
            Write-Host "[OK] Codex agents : in sync" -ForegroundColor Green
        }
        else {
            Write-Host "[DRIFT] Codex agents : $($codexDiffs.Count) differences" -ForegroundColor Red
            $codexDiffs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        }

        $claudeDiffs = Get-FlatFileDrift -Source $SourceAgents -Destination $DestClaudeAgents -Filter '*.md' -IgnoreNames @('README.md')
        if ($claudeDiffs.Count -eq 0) {
            Write-Host "[OK] Claude agents : in sync" -ForegroundColor Green
        }
        else {
            Write-Host "[DRIFT] Claude agents : $($claudeDiffs.Count) differences" -ForegroundColor Red
            $claudeDiffs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        }
    }
    if ($Target -eq "all" -or $Target -eq "dcr") {
        $dcrConfigPath = Join-Path $RepoRoot ".dcr\config.json"
        $dcrConfigDest = Join-Path $HOME ".config\dcr\config.json"
        if (-not (Test-Path $dcrConfigPath)) {
            Write-Host "[SKIP] .dcr config : not found" -ForegroundColor Yellow
        }
        else {
            $dcrDiffs = Get-FileDrift -SourcePath $dcrConfigPath -DestinationPath $dcrConfigDest -Label "config.json"
            if ($dcrDiffs.Count -eq 0) {
                Write-Host "[OK] .dcr config : in sync" -ForegroundColor Green
            }
            else {
                Write-Host "[DRIFT] .dcr config : $($dcrDiffs.Count) differences" -ForegroundColor Red
                $dcrDiffs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
            }
        }
    }
    Write-Host ""
    Write-Host "Drift check complete." -ForegroundColor Cyan
    return
}

if ($Target -eq "all" -or $Target -eq "vscode") {
    if ($Backup) { Backup-DeployTarget -TargetPath $DestVSCodeSkills -Label "VS Code Copilot skills" }
    if (-not $DryRun) {
        Write-ManagedTargetNotice -Label "VS Code Copilot skills" -Destination $DestVSCodeSkills
        Write-PrecheckSummary -Label "VS Code Copilot skills" -Diffs (Get-DirectoryDrift -Source $SourceSkills -Destination $DestVSCodeSkills)
    }
    Sync-Directory -Source $SourceSkills -Destination $DestVSCodeSkills -Label "VS Code Copilot skills"
    if (-not $DryRun) {
        Assert-NoDrift -Label "VS Code Copilot skills" -Diffs (Get-DirectoryDrift -Source $SourceSkills -Destination $DestVSCodeSkills)
    }
}

if ($Target -eq "all" -or $Target -eq "cursor") {
    if ($Backup) { Backup-DeployTarget -TargetPath $DestCursorRules -Label "Cursor rules (user)" }
    if (-not $DryRun) {
        Write-ManagedTargetNotice -Label "Cursor rules (user)" -Destination $DestCursorRules
    }
    $cursorTempDir = Get-TempDirectory
    try {
        New-CursorRulePackage -RulesSource $SourceRules -SkillsSource $SourceSkills -KernelSource $SourceCursorKernel -OutputDir $cursorTempDir
        if (-not $DryRun) {
            Write-PrecheckSummary -Label "Cursor rules (user)" -Diffs (Get-DirectoryDrift -Source $cursorTempDir -Destination $DestCursorRules -IgnoreNames @('.dcr-managed-files.json'))
            Write-PrecheckSummary -Label "Cursor rules (project)" -Diffs (Get-DirectoryDrift -Source $cursorTempDir -Destination $DestProjectCursorRules)
        }
        Sync-Files -Source $cursorTempDir -Destination $DestCursorRules -Label "Cursor rules (user)" -Prune -PruneManifestPath $DestCursorManifest
        Sync-Files -Source $cursorTempDir -Destination $DestProjectCursorRules -Label "Cursor rules (project)" -Prune
        if (-not $DryRun) {
            Assert-NoDrift -Label "Cursor rules (user)" -Diffs (Get-DirectoryDrift -Source $cursorTempDir -Destination $DestCursorRules -IgnoreNames @('.dcr-managed-files.json'))
            Assert-NoDrift -Label "Cursor rules (project)" -Diffs (Get-DirectoryDrift -Source $cursorTempDir -Destination $DestProjectCursorRules)
        }
    }
    finally {
        if (Test-Path $cursorTempDir) {
            Remove-Item -Path $cursorTempDir -Recurse -Force
        }
    }
}

if ($Target -eq "all" -or $Target -eq "agents") {
    if (-not $DryRun) {
        Write-PrecheckSummary -Label "Codex agents" -Diffs (Get-FlatFileDrift -Source $SourceAgents -Destination $DestCodexAgents -Filter '*.toml')
        Write-PrecheckSummary -Label "Claude agents" -Diffs (Get-FlatFileDrift -Source $SourceAgents -Destination $DestClaudeAgents -Filter '*.md' -IgnoreNames @('README.md'))
    }
    Sync-Agents -Source $SourceAgents -CodexDest $DestCodexAgents -ClaudeDest $DestClaudeAgents
    if (-not $DryRun) {
        Assert-NoDrift -Label "Codex agents" -Diffs (Get-FlatFileDrift -Source $SourceAgents -Destination $DestCodexAgents -Filter '*.toml')
        Assert-NoDrift -Label "Claude agents" -Diffs (Get-FlatFileDrift -Source $SourceAgents -Destination $DestClaudeAgents -Filter '*.md' -IgnoreNames @('README.md'))
    }
}

if ($Target -eq "all" -or $Target -eq "dcr") {
    $dcrConfigPath = Join-Path $RepoRoot ".dcr/config.json"
    if ((-not $DryRun) -and (Test-Path $dcrConfigPath)) {
        Write-ManagedTargetNotice -Label ".dcr config" -Destination (Join-Path $HOME ".config\dcr\config.json")
        Write-PrecheckSummary -Label ".dcr config" -Diffs (Get-FileDrift -SourcePath $dcrConfigPath -DestinationPath (Join-Path $HOME ".config\dcr\config.json") -Label "config.json")
    }
    Sync-DCRConfig -Source $SourceRules -ConfigPath $dcrConfigPath
    if ((-not $DryRun) -and (Test-Path $dcrConfigPath)) {
        Assert-NoDrift -Label ".dcr config" -Diffs (Get-FileDrift -SourcePath $dcrConfigPath -DestinationPath (Join-Path $HOME ".config\dcr\config.json") -Label "config.json")
    }
}

Write-Host ""
if ($DryRun) {
    Write-Host "Dry run complete. No files were copied." -ForegroundColor Yellow
}
else {
    Write-Host "Deploy complete." -ForegroundColor Green
}

# ── Deprecation Aliases Summary (Phase A/B/C consolidation) ──
$catalogRoot = Join-Path $RepoRoot ".ai\catalog"
if (Test-Path $catalogRoot) {
    Write-DeprecationSummary -CatalogRoot $catalogRoot
}

# ── Watch Mode ──
if ($Watch) {
    Write-Host ""
    Write-Host "Watch mode active. Monitoring source catalog paths for changes..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
    Write-Host ""

    $watchPaths = @($SourceRules, $SourceSkills, $SourceAgents) | Where-Object { Test-Path $_ }
    $watchers = @()

    foreach ($watchPath in $watchPaths) {
        $watcher = New-Object System.IO.FileSystemWatcher
        $watcher.Path = $watchPath
        $watcher.Filter = "*.*"
        $watcher.IncludeSubdirectories = $true
        $watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::LastWrite
        $watcher.EnableRaisingEvents = $false
        $watchers += $watcher
    }

    $lastDeploy = [DateTime]::MinValue
    $debounceSeconds = 2

    try {
        foreach ($w in $watchers) { $w.EnableRaisingEvents = $true }

        while ($true) {
            $changed = $false
            foreach ($w in $watchers) {
                $result = $w.WaitForChanged([System.IO.WatcherChangeTypes]::All, 1000)
                if (-not $result.TimedOut) { $changed = $true }
            }

            if ($changed -and ([DateTime]::Now - $lastDeploy).TotalSeconds -ge $debounceSeconds) {
                $lastDeploy = [DateTime]::Now
                Write-Host ""
                Write-Host "[WATCH] Change detected at $(Get-Date -Format 'HH:mm:ss'). Re-deploying..." -ForegroundColor Yellow

                # Re-run deploy logic
                if ($Target -eq "all" -or $Target -eq "vscode") {
                    Sync-Directory -Source $SourceSkills -Destination $DestVSCodeSkills -Label "VS Code Copilot skills"
                }
                if ($Target -eq "all" -or $Target -eq "cursor") {
                    $cursorWatchDir = Get-TempDirectory
                    try {
                        New-CursorRulePackage -RulesSource $SourceRules -SkillsSource $SourceSkills -KernelSource $SourceCursorKernel -OutputDir $cursorWatchDir
                        Sync-Files -Source $cursorWatchDir -Destination $DestCursorRules -Label "Cursor rules (user)" -Prune -PruneManifestPath $DestCursorManifest
                        Sync-Files -Source $cursorWatchDir -Destination $DestProjectCursorRules -Label "Cursor rules (project)" -Prune
                    }
                    finally {
                        if (Test-Path $cursorWatchDir) { Remove-Item -Path $cursorWatchDir -Recurse -Force }
                    }
                }
                if ($Target -eq "all" -or $Target -eq "agents") {
                    Sync-Agents -Source $SourceAgents -CodexDest $DestCodexAgents -ClaudeDest $DestClaudeAgents
                }

                Write-Host "[WATCH] Deploy complete. Watching..." -ForegroundColor Green
            }
        }
    }
    finally {
        foreach ($w in $watchers) {
            $w.EnableRaisingEvents = $false
            $w.Dispose()
        }
        Write-Host "Watch mode stopped." -ForegroundColor DarkGray
    }
}
