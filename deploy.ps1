<#
.SYNOPSIS
  DCR triad deploy script.

.DESCRIPTION
  Generates only the shared Mac migration triad:
    - Codex: AGENTS.md and .codex/agents/
    - Claude Code: CLAUDE.md and .claude/agents/
    - Cursor: .cursor/ and .cursorignore

.PARAMETER Target
  Target to deploy or check: all | codex | claude | cursor | agents

.PARAMETER DryRun
  Prints planned adapter execution without writing files.

.PARAMETER Check
  Detects drift between source-of-truth output and generated triad files.
#>

param(
    [ValidateSet("all", "codex", "claude", "cursor", "agents")]
    [string]$Target = "all",
    [switch]$DryRun,
    [switch]$Check,
    [switch]$Watch,
    [switch]$EnforceGate
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
$CatalogPaths = Join-Path $RepoRoot "tools\lib\catalog-paths.ps1"
. $CatalogPaths
$DeprecatedAliases = Join-Path $RepoRoot "tools\lib\deprecated-aliases.ps1"
. $DeprecatedAliases

$SourceAgents = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"
$DestCodexAgents = Join-Path $RepoRoot ".codex\agents"
$DestClaudeAgents = Join-Path $RepoRoot ".claude\agents"
$DeployAll = Join-Path $RepoRoot "tools\deploy-all.ps1"

function Get-TempDirectory {
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("dcr-deploy-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    return $tempDir
}

function Get-DirectoryDrift {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$IgnoreNames = @()
    )

    $diffs = @()
    if (-not (Test-Path $Source)) { return @("[SOURCE_MISSING] $Source") }
    if (-not (Test-Path $Destination)) { return @("[DESTINATION_MISSING] $Destination") }

    $destFiles = Get-ChildItem $Destination -Recurse -File -Force | Where-Object { $_.Name -notin $IgnoreNames }
    foreach ($df in $destFiles) {
        $relativePath = $df.FullName.Substring($Destination.Length + 1)
        $sourceFile = Join-Path $Source $relativePath
        if (-not (Test-Path $sourceFile)) {
            $diffs += "[EXTRA] $relativePath"
        }
        elseif ((Get-FileHash $sourceFile -Algorithm MD5).Hash -ne (Get-FileHash $df.FullName -Algorithm MD5).Hash) {
            $diffs += "[MODIFIED] $relativePath"
        }
    }

    $sourceFiles = Get-ChildItem $Source -Recurse -File -Force | Where-Object { $_.Name -notin $IgnoreNames }
    foreach ($sf in $sourceFiles) {
        $relativePath = $sf.FullName.Substring($Source.Length + 1)
        $destFile = Join-Path $Destination $relativePath
        if (-not (Test-Path $destFile)) {
            $diffs += "[MISSING] $relativePath"
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
    if (-not (Test-Path $Source)) { return @("[SOURCE_MISSING] $Source") }
    if (-not (Test-Path $Destination)) { return @("[DESTINATION_MISSING] $Destination") }

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

    if (-not (Test-Path $SourcePath)) { return @("[SOURCE_MISSING] $Label") }
    if (-not (Test-Path $DestinationPath)) { return @("[MISSING] $Label") }
    if ((Get-FileHash $SourcePath -Algorithm MD5).Hash -ne (Get-FileHash $DestinationPath -Algorithm MD5).Hash) {
        return @("[MODIFIED] $Label")
    }
    return @()
}

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

function Write-DeprecationSummary {
    $deprecatedEntries = @(Get-DcrDeprecatedAliases -RepoRoot $RepoRoot)
    if ($deprecatedEntries.Count -eq 0) { return }

    Write-Host "Deprecated alias summary:" -ForegroundColor Cyan
    $deprecatedEntries | Group-Object Kind | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor DarkGray
    }
}

if ($EnforceGate) {
    $GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"
    if (-not (Test-Path $GateStateLib)) {
        Write-Host "STOP gate-state.ps1 not found: $GateStateLib" -ForegroundColor Red
        exit 1
    }
    . $GateStateLib
    if (-not (Test-GateReady -RepoRoot $RepoRoot -RequireGate 'qa_passed')) {
        Write-Host "STOP q/ QA Gate not passed." -ForegroundColor Red
        exit 1
    }
    $state = Read-GateState -RepoRoot $RepoRoot
    if ($state.findings -and $state.findings.critical -gt 0) {
        Write-Host "STOP critical findings remain: $($state.findings.critical)" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "DCR Triad Deploy" -ForegroundColor Cyan
Write-Host "Source: $RepoRoot" -ForegroundColor DarkGray
Write-Host ""

if ($Check) {
    $script:checkFailed = $false

    if ($Target -eq "all" -or $Target -eq "codex") {
        $tempDir = Get-TempDirectory
        try {
            $tempAgents = Join-Path $tempDir "AGENTS.md"
            & (Join-Path $RepoRoot "tools\adapters\codex.ps1") -RepoRoot $RepoRoot -OutputPath $tempAgents -Quiet
            Write-CheckDrift -Label "Codex entrypoint" -Diffs (Get-FileDrift -SourcePath $tempAgents -DestinationPath (Join-Path $RepoRoot "AGENTS.md") -Label "AGENTS.md")
        }
        finally {
            if (Test-Path $tempDir) { Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
        }
    }

    if ($Target -eq "all" -or $Target -eq "claude") {
        $tempDir = Get-TempDirectory
        try {
            $tempClaude = Join-Path $tempDir "CLAUDE.md"
            & (Join-Path $RepoRoot "tools\adapters\claude.ps1") -RepoRoot $RepoRoot -OutputPath $tempClaude -Quiet
            Write-CheckDrift -Label "Claude entrypoint" -Diffs (Get-FileDrift -SourcePath $tempClaude -DestinationPath (Join-Path $RepoRoot "CLAUDE.md") -Label "CLAUDE.md")
        }
        finally {
            if (Test-Path $tempDir) { Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
        }
    }

    if ($Target -eq "all" -or $Target -eq "cursor") {
        $tempDir = Get-TempDirectory
        try {
            $tempCursor = Join-Path $tempDir ".cursor"
            & (Join-Path $RepoRoot "tools\adapters\cursor.ps1") -RepoRoot $RepoRoot -OutputRoot $tempCursor -Quiet
            Write-CheckDrift -Label "Cursor mirror" -Diffs (Get-DirectoryDrift -Source $tempCursor -Destination (Join-Path $RepoRoot ".cursor"))
            Write-CheckDrift -Label "Cursor ignore" -Diffs (Get-FileDrift -SourcePath (Join-Path $tempDir ".cursorignore") -DestinationPath (Join-Path $RepoRoot ".cursorignore") -Label ".cursorignore")
        }
        finally {
            if (Test-Path $tempDir) { Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
        }
    }

    if ($Target -eq "all" -or $Target -eq "agents") {
        Write-CheckDrift -Label "Codex agents" -Diffs (Get-FlatFileDrift -Source $SourceAgents -Destination $DestCodexAgents -Filter '*.toml')
        Write-CheckDrift -Label "Claude agents" -Diffs (Get-FlatFileDrift -Source $SourceAgents -Destination $DestClaudeAgents -Filter '*.md' -IgnoreNames @('README.md'))
    }

    Write-Host ""
    Write-Host "Drift check complete." -ForegroundColor Cyan
    if ($script:checkFailed) { exit 1 }
    return
}

if (-not (Test-Path $DeployAll)) {
    throw "Deploy orchestrator not found: $DeployAll"
}

if ($DryRun) {
    & $DeployAll -Target $Target -DryRun
}
else {
    & $DeployAll -Target $Target
}

if ($DryRun) {
    Write-Host "Dry run complete. No files were copied." -ForegroundColor Yellow
}
else {
    Write-Host "Deploy complete." -ForegroundColor Green
}

Write-DeprecationSummary

if ($Watch) {
    Write-Host ""
    Write-Host "Watch mode active. Monitoring triad source paths..." -ForegroundColor Cyan
    $watchPaths = @(
        (Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"),
        (Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"),
        (Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"),
        (Join-Path $RepoRoot ".ai\book"),
        (Join-Path $RepoRoot ".ai\kernel"),
        (Join-Path $RepoRoot ".ai\environments")
    ) | Where-Object { Test-Path $_ }

    $watchers = @()
    foreach ($watchPath in $watchPaths) {
        $watcher = New-Object System.IO.FileSystemWatcher
        $watcher.Path = $watchPath
        $watcher.Filter = "*.*"
        $watcher.IncludeSubdirectories = $true
        $watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::LastWrite
        $watcher.EnableRaisingEvents = $true
        $watchers += $watcher
    }

    try {
        while ($true) {
            foreach ($w in $watchers) {
                $result = $w.WaitForChanged([System.IO.WatcherChangeTypes]::All, 1000)
                if (-not $result.TimedOut) {
                    Write-Host "[WATCH] Change detected. Re-deploying..." -ForegroundColor Yellow
                    & $DeployAll -Target $Target
                    Write-Host "[WATCH] Deploy complete." -ForegroundColor Green
                    break
                }
            }
        }
    }
    finally {
        foreach ($w in $watchers) {
            $w.EnableRaisingEvents = $false
            $w.Dispose()
        }
    }
}
