<#
.SYNOPSIS
  DCR Products - Deploy script
  サトシ開発 (Git管理) の source-of-truth から runtime entrypoint / generated mirror へ一方向同期

.DESCRIPTION
  対象エディタと同期先:
    VS Code Copilot : .github/copilot-instructions.md
    Cursor          : .cursor/
    Agents          : .ai/catalog/agents-source/ -> .codex/agents/ (toml) + .claude/agents/ (md)

.PARAMETER Target
    同期先を指定: all | vscode | cursor | agents | dcr
  デフォルト: all

.PARAMETER DryRun
  実際にはコピーせず、対象ファイルを表示するだけ

.PARAMETER Check
  エディタ側とリポジトリ側の差分を検出する（逆同期チェック）

.EXAMPLE
  .\deploy.ps1
  .\deploy.ps1 -Target vscode
  .\deploy.ps1 -Target agents
  .\deploy.ps1 -Check
#>

param(
    [ValidateSet("all", "vscode", "cursor", "agents", "dcr")]
    [string]$Target = "all",
    [switch]$DryRun,
    [switch]$Check,
    [switch]$Watch,
    [switch]$Backup,
    [switch]$EnforceGate
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
$UserHome = $env:USERPROFILE
$CatalogPaths = Join-Path $RepoRoot "tools\lib\catalog-paths.ps1"
. $CatalogPaths
$DeprecatedAliases = Join-Path $RepoRoot "tools\lib\deprecated-aliases.ps1"
. $DeprecatedAliases

function Resolve-Source {
    param([string]$NewRel, [string]$OldRel)
    $new = Join-Path $RepoRoot $NewRel
    if (Test-Path $new) { return $new }
    return (Join-Path $RepoRoot $OldRel)   # fallback during migration
}

# ── Gate enforcement ──
if ($EnforceGate) {
    $GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"
    if (-not (Test-Path $GateStateLib)) {
        Write-Host "STOP gate-state.ps1 が見つかりません: $GateStateLib" -ForegroundColor Red
        exit 1
    }
    . $GateStateLib
    if (-not (Test-GateReady -RepoRoot $RepoRoot -RequireGate 'qa_passed')) {
        Write-Host "STOP q/ QA Gate 未通過。deploy をブロックします。" -ForegroundColor Red
        Write-Host "   先に q/ トリガーで検証を完了してください。" -ForegroundColor Red
        exit 1
    }
    $state = Read-GateState -RepoRoot $RepoRoot
    if ($state.findings -and $state.findings.critical -gt 0) {
        Write-Host "STOP Critical findings $($state.findings.critical) 件残存。deploy をブロックします。" -ForegroundColor Red
        exit 1
    }
    Write-Host "PASS Gate check passed (qa_passed=true, critical=0)" -ForegroundColor Green
}

# ── Unified Adapter Framework (new) ──
$DeployAll = Join-Path $RepoRoot "tools\deploy-all.ps1"
if ((Test-Path $DeployAll) -and -not $Check -and ($Target -in @("all", "vscode", "cursor", "agents"))) {
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
$SourceRuntimeKernel = Resolve-Source -NewRel ".ai\core\kernel.md" -OldRel ".ai\kernel\dcr-kernel.md"
$SourceAgents = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"

$DestCodexAgents = Join-Path $RepoRoot ".codex\agents"
$DestClaudeAgents = Join-Path $RepoRoot ".claude\agents"

function Get-TempDirectory {
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("dcr-deploy-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    return $tempDir
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
            Write-Host "[DRY RUN] .dcr config : $ConfigPath -> $dcrConfigDest" -ForegroundColor Yellow
            return
        }

        New-Item -ItemType Directory -Force -Path $dcrConfigDest | Out-Null
        Copy-Item -Path $ConfigPath -Destination (Join-Path $dcrConfigDest "config.json") -Force
        Write-Host "[OK] .dcr config : config.json -> $dcrConfigDest" -ForegroundColor Green
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

    $sourceItems = Get-ChildItem $Source -Directory -Force |
    Where-Object { $_.Name -notlike "_*" }
    $sourceNames = @($sourceItems | Select-Object -ExpandProperty Name)
    $count = $sourceItems.Count

    if ($DryRun) {
        Write-Host "[DRY RUN] $Label : $count items -> $Destination" -ForegroundColor Yellow
        $sourceItems | ForEach-Object { Write-Host "  $_" }
        if (Test-Path $Destination) {
            $extraItems = Get-ChildItem $Destination -Directory -Force | Where-Object { $_.Name -notin $sourceNames }
            $extraItems | ForEach-Object { Write-Host "  [REMOVE] $($_.FullName)" -ForegroundColor DarkYellow }
        }
        return
    }

    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }

    foreach ($item in $sourceItems) {
        Copy-Item -Path $item.FullName -Destination $Destination -Recurse -Force
    }

    $destinationRoot = (Resolve-Path -LiteralPath $Destination).Path
    $extraItems = Get-ChildItem $destinationRoot -Directory -Force | Where-Object { $_.Name -notin $sourceNames }
    foreach ($extra in $extraItems) {
        $resolvedExtra = (Resolve-Path -LiteralPath $extra.FullName).Path
        if (-not $resolvedExtra.StartsWith($destinationRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove path outside deploy target: $resolvedExtra"
        }
        Remove-Item -LiteralPath $resolvedExtra -Recurse -Force
    }

    Write-Host "[OK] $Label : $count items -> $Destination" -ForegroundColor Green
}

function Write-DeprecationSummary {
    param(
        [string]$CatalogRoot
    )

    $deprecatedEntries = @(Get-DcrDeprecatedAliases -RepoRoot $RepoRoot |
        ForEach-Object {
            [pscustomobject]@{
                Kind = $_.kind
                Name = $_.name
                Successor = $_.successor
                State = $_.state
            }
        })

    if ($deprecatedEntries.Count -eq 0) {
        Write-Host "No deprecated aliases found." -ForegroundColor DarkGray
        return
    }

    Write-Host "Deprecated alias summary:" -ForegroundColor Cyan
    $deprecatedEntries | Group-Object Kind | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor DarkGray
    }

    foreach ($entry in $deprecatedEntries | Sort-Object Kind, Name) {
        $line = "  - $($entry.Kind): $($entry.Name)"
        if ($entry.Successor) { $line += " -> $($entry.Successor)" }
        if ($entry.State -eq "removed") { $line += " [removed]" }
        Write-Host $line -ForegroundColor DarkGray
    }
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

    $destFiles = Get-ChildItem $Destination -Recurse -File -Force | Where-Object { $_.Name -notin $IgnoreNames }
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

    $sourceFiles = Get-ChildItem $Source -Recurse -File -Force | Where-Object { $_.Name -notin $IgnoreNames }
    foreach ($sf in $sourceFiles) {
        $relativePath = $sf.FullName.Substring($Source.Length + 1)
        # Skip root-level _* files - Sync-Directory copies only subdirectories (not root files)
        if ($relativePath -notlike '*\*' -and $relativePath -like '_*') { continue }
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

    $sourceFiles = Get-ChildItem $Source -File -Filter $Filter -Force | Where-Object { $_.Name -notin $IgnoreNames }
    $destFiles = Get-ChildItem $Destination -File -Filter $Filter -Force | Where-Object { $_.Name -notin $IgnoreNames }

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

function Get-GitStatusDrift {
    param(
        [string[]]$Paths
    )

    $status = @(git -C $RepoRoot status --short -- $Paths 2>$null)
    return @($status | ForEach-Object { "[DIRTY] $_" })
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

    Write-Host "[BACKUP] $Label : $($items.Count) files -> $backupDir" -ForegroundColor DarkCyan
}

# ── Main ──
Write-Host ""
Write-Host "DCR Products Deploy" -ForegroundColor Cyan
Write-Host "Source: $RepoRoot" -ForegroundColor DarkGray
Write-Host ""

# -- Gate Enforcement --
if ($EnforceGate) {
    $GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"
    if (-not (Test-Path $GateStateLib)) {
        Write-Host "[EnforceGate] STOP: gate-state.ps1 not found: $GateStateLib" -ForegroundColor Red
        exit 1
    }
    . $GateStateLib

    Write-Host "[EnforceGate] Checking gate chain..." -ForegroundColor Cyan

    if (-not (Test-GateReady -RepoRoot $RepoRoot -RequireGate 'qa_passed')) {
        Write-Host "[EnforceGate] STOP: q/ QA Gate not passed. Deploy blocked." -ForegroundColor Red
        Write-Host "  Run q/ QA Gate first, then retry deploy." -ForegroundColor Yellow
        exit 1
    }

    $state = Read-GateState -RepoRoot $RepoRoot
    if ($state.findings.critical -gt 0) {
        Write-Host "[EnforceGate] STOP: $($state.findings.critical) critical finding(s) remain." -ForegroundColor Red
        Write-Host "  Resolve all critical findings before deploying." -ForegroundColor Yellow
        exit 1
    }

    Write-Host "[EnforceGate] GO: All gates passed. Proceeding with deploy." -ForegroundColor Green
    Write-Host ""
}

if ($Check) {
    Write-Host "Running drift check..." -ForegroundColor Cyan
    Write-Host ""
    $script:checkFailed = $false

    function Write-CheckDrift {
        param(
            [string]$Label,
            [object[]]$Diffs
        )

        if ($Diffs.Count -eq 0) {
            Write-Host "[OK] $Label : in sync" -ForegroundColor Green
            return
        }

        Write-Host "[DRIFT] $Label : $($Diffs.Count) differences" -ForegroundColor Red
        $Diffs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        $script:checkFailed = $true
    }

    if ($Target -eq "all" -or $Target -eq "agents") {
        $codexDiffs = Get-FlatFileDrift -Source $SourceAgents -Destination $DestCodexAgents -Filter '*.toml'
        Write-CheckDrift -Label "Codex agents" -Diffs $codexDiffs

        $claudeDiffs = Get-FlatFileDrift -Source $SourceAgents -Destination $DestClaudeAgents -Filter '*.md' -IgnoreNames @('README.md')
        Write-CheckDrift -Label "Claude agents" -Diffs $claudeDiffs
    }
    if ($Target -eq "all" -or $Target -eq "vscode") {
        $vscodeEntryDiffs = Get-GitStatusDrift -Paths @(".github/copilot-instructions.md")
        Write-CheckDrift -Label "VS Code Copilot entrypoint" -Diffs $vscodeEntryDiffs
    }
    if ($Target -eq "all") {
        $sharedEntrypointDiffs = Get-GitStatusDrift -Paths @("AGENTS.md", "CLAUDE.md", ".ai/catalog/rules/_ROUTING_INDEX.md")
        Write-CheckDrift -Label "Shared tracked entrypoints" -Diffs $sharedEntrypointDiffs
    }
    if ($Target -eq "all" -or $Target -eq "dcr") {
        $dcrConfigPath = Join-Path $RepoRoot ".dcr\config.json"
        $dcrConfigDest = Join-Path $HOME ".config\dcr\config.json"
        if (-not (Test-Path $dcrConfigPath)) {
            Write-Host "[SKIP] .dcr config : not found" -ForegroundColor Yellow
        }
        else {
            $dcrDiffs = Get-FileDrift -SourcePath $dcrConfigPath -DestinationPath $dcrConfigDest -Label "config.json"
            Write-CheckDrift -Label ".dcr config" -Diffs $dcrDiffs
        }
    }
    Write-Host ""
    Write-Host "Drift check complete." -ForegroundColor Cyan
    if ($script:checkFailed) { exit 1 }
    return
}

if ($Target -eq "all" -or $Target -eq "agents") {
    if (-not $DryRun) {
        Write-PrecheckSummary -Label "Codex agents" -Diffs (Get-FlatFileDrift -Source $SourceAgents -Destination $DestCodexAgents -Filter '*.toml')
        Write-PrecheckSummary -Label "Claude agents" -Diffs (Get-FlatFileDrift -Source $SourceAgents -Destination $DestClaudeAgents -Filter '*.md' -IgnoreNames @('README.md'))
    }
    elseif ($DryRun) {
        Write-Host "[DRY RUN] Agents mirror generation is delegated to tools/adapters/agents.ps1" -ForegroundColor Yellow
    }
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
                if ($Target -eq "all" -or $Target -eq "agents") {
                    & $DeployAll -Target agents
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
