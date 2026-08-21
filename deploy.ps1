<#
.SYNOPSIS
  DCR Products Mac triad deploy script.

.DESCRIPTION
  Generates only the tracked Codex, Claude Code, and Cursor mirrors from .ai/:
    - Codex: AGENTS.md and .codex/agents/
    - Claude Code: CLAUDE.md and .claude/agents/
    - Cursor: .cursor/README.md, .cursor/rules/dcr-kernel.mdc, and .cursorignore

  Cursor files not owned by this adapter are preserved.

.PARAMETER Target
  Target to deploy or check: all | codex | claude | cursor | agents

.PARAMETER DryRun
  Prints planned adapter execution without writing files.

.PARAMETER Check
  Generates expected output in a temporary directory and compares it with the
  tracked triad mirrors without modifying the repository.
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
$DestClaudeSkills = Join-Path $RepoRoot ".claude\skills"
$DeployAll = Join-Path $RepoRoot "tools\deploy-all.ps1"

function Get-ClaudeSkillsLinkTarget {
    # .claude/skills is a symlink into the catalog rather than a copy, so the
    # 69 skill directories stay single-sourced under .ai/catalog/skills.
    return "../.ai/catalog/skills"
}

function Get-SymlinkDrift {
    param(
        [string]$LinkPath,
        [string]$ExpectedTarget,
        [string]$ResolvedRoot
    )

    if (-not (Test-Path -LiteralPath $ResolvedRoot)) { return @("[SOURCE_MISSING] $ResolvedRoot") }
    $item = Get-Item -LiteralPath $LinkPath -Force -ErrorAction SilentlyContinue
    if (-not $item) { return @("[MISSING] $LinkPath") }
    if (-not $item.LinkType) { return @("[NOT_A_LINK] $LinkPath") }
    if ($item.Target -notcontains $ExpectedTarget) {
        return @("[WRONG_TARGET] $LinkPath -> $($item.Target -join ',')")
    }
    if (-not (Test-Path -LiteralPath $LinkPath)) { return @("[BROKEN_LINK] $LinkPath") }
    return @()
}

function Set-ClaudeSkillsLink {
    param([string]$LinkPath, [string]$ExpectedTarget)

    $item = Get-Item -LiteralPath $LinkPath -Force -ErrorAction SilentlyContinue
    if ($item -and $item.LinkType -and ($item.Target -contains $ExpectedTarget)) { return }
    if ($item) { Remove-Item -LiteralPath $LinkPath -Force -Recurse }
    New-Item -ItemType SymbolicLink -Path $LinkPath -Target $ExpectedTarget | Out-Null
    Write-Host "  [OK] .claude/skills -> $ExpectedTarget" -ForegroundColor Green
}

function Get-TempDirectory {
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("dcr-deploy-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    return $tempDir
}

function Get-FileDrift {
    param(
        [string]$ExpectedPath,
        [string]$ActualPath,
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $ExpectedPath)) { return @("[EXPECTED_MISSING] $Label") }
    if (-not (Test-Path -LiteralPath $ActualPath)) { return @("[MISSING] $Label") }
    if ((Get-FileHash -LiteralPath $ExpectedPath -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $ActualPath -Algorithm SHA256).Hash) {
        return @("[MODIFIED] $Label")
    }
    return @()
}

function Get-ManagedDirectoryDrift {
    param(
        [string]$ExpectedRoot,
        [string]$ActualRoot
    )

    $diffs = @()
    if (-not (Test-Path -LiteralPath $ExpectedRoot)) { return @("[EXPECTED_MISSING] $ExpectedRoot") }
    if (-not (Test-Path -LiteralPath $ActualRoot)) { return @("[DESTINATION_MISSING] $ActualRoot") }

    foreach ($expectedFile in Get-ChildItem -LiteralPath $ExpectedRoot -Recurse -File -Force) {
        $relativePath = $expectedFile.FullName.Substring($ExpectedRoot.Length + 1)
        $actualFile = Join-Path $ActualRoot $relativePath
        if (-not (Test-Path -LiteralPath $actualFile)) {
            $diffs += "[MISSING] $relativePath"
        }
        elseif ((Get-FileHash -LiteralPath $expectedFile.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $actualFile -Algorithm SHA256).Hash) {
            $diffs += "[MODIFIED] $relativePath"
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
    if (-not (Test-Path -LiteralPath $Source)) { return @("[SOURCE_MISSING] $Source") }
    if (-not (Test-Path -LiteralPath $Destination)) { return @("[DESTINATION_MISSING] $Destination") }

    $sourceFiles = @(Get-ChildItem -LiteralPath $Source -File -Filter $Filter -Force | Where-Object { $_.Name -notin $IgnoreNames })
    $destinationFiles = @(Get-ChildItem -LiteralPath $Destination -File -Filter $Filter -Force | Where-Object { $_.Name -notin $IgnoreNames })
    $sourceNames = @($sourceFiles | Select-Object -ExpandProperty Name)

    foreach ($sourceFile in $sourceFiles) {
        $destinationFile = Join-Path $Destination $sourceFile.Name
        if (-not (Test-Path -LiteralPath $destinationFile)) {
            $diffs += "[MISSING] $($sourceFile.Name)"
        }
        elseif ((Get-FileHash -LiteralPath $sourceFile.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $destinationFile -Algorithm SHA256).Hash) {
            $diffs += "[MODIFIED] $($sourceFile.Name)"
        }
    }

    foreach ($destinationFile in $destinationFiles) {
        if ($destinationFile.Name -notin $sourceNames) {
            $diffs += "[EXTRA] $($destinationFile.Name)"
        }
    }

    return $diffs
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
    $script:CheckFailed = $true
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
    if (-not (Test-Path -LiteralPath $GateStateLib)) {
        Write-Host "STOP gate-state.ps1 not found: $GateStateLib" -ForegroundColor Red
        exit 1
    }
    . $GateStateLib
    if (-not (Test-GateReady -RepoRoot $RepoRoot -RequireGate "qa_passed")) {
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
Write-Host "DCR Products Mac Triad Deploy" -ForegroundColor Cyan
Write-Host "Source: $RepoRoot" -ForegroundColor DarkGray
Write-Host ""

if ($Check) {
    $script:CheckFailed = $false

    if ($Target -eq "all" -or $Target -eq "codex") {
        $tempDir = Get-TempDirectory
        try {
            $expectedAgents = Join-Path $tempDir "AGENTS.md"
            & (Join-Path $RepoRoot "tools\adapters\codex.ps1") -RepoRoot $RepoRoot -OutputPath $expectedAgents -Quiet
            Write-CheckDrift -Label "Codex entrypoint" -Diffs (Get-FileDrift -ExpectedPath $expectedAgents -ActualPath (Join-Path $RepoRoot "AGENTS.md") -Label "AGENTS.md")
        }
        finally {
            if (Test-Path -LiteralPath $tempDir) { Remove-Item -LiteralPath $tempDir -Recurse -Force }
        }
    }

    if ($Target -eq "all" -or $Target -eq "claude") {
        $tempDir = Get-TempDirectory
        try {
            $expectedClaude = Join-Path $tempDir "CLAUDE.md"
            & (Join-Path $RepoRoot "tools\adapters\claude.ps1") -RepoRoot $RepoRoot -OutputPath $expectedClaude -Quiet
            Write-CheckDrift -Label "Claude entrypoint" -Diffs (Get-FileDrift -ExpectedPath $expectedClaude -ActualPath (Join-Path $RepoRoot "CLAUDE.md") -Label "CLAUDE.md")
        }
        finally {
            if (Test-Path -LiteralPath $tempDir) { Remove-Item -LiteralPath $tempDir -Recurse -Force }
        }
    }

    if ($Target -eq "all" -or $Target -eq "cursor") {
        $tempDir = Get-TempDirectory
        try {
            $expectedCursor = Join-Path $tempDir ".cursor"
            & (Join-Path $RepoRoot "tools\adapters\cursor.ps1") -RepoRoot $RepoRoot -OutputRoot $expectedCursor -Quiet
            Write-CheckDrift -Label "Cursor mirror" -Diffs (Get-ManagedDirectoryDrift -ExpectedRoot $expectedCursor -ActualRoot (Join-Path $RepoRoot ".cursor"))
            Write-CheckDrift -Label "Cursor ignore" -Diffs (Get-FileDrift -ExpectedPath (Join-Path $tempDir ".cursorignore") -ActualPath (Join-Path $RepoRoot ".cursorignore") -Label ".cursorignore")
        }
        finally {
            if (Test-Path -LiteralPath $tempDir) { Remove-Item -LiteralPath $tempDir -Recurse -Force }
        }
    }

    if ($Target -eq "all" -or $Target -eq "agents") {
        Write-CheckDrift -Label "Codex agents" -Diffs (Get-FlatFileDrift -Source $SourceAgents -Destination $DestCodexAgents -Filter "*.toml")
        Write-CheckDrift -Label "Claude agents" -Diffs (Get-FlatFileDrift -Source $SourceAgents -Destination $DestClaudeAgents -Filter "*.md" -IgnoreNames @("README.md"))
        Write-CheckDrift -Label "Claude skills" -Diffs (Get-SymlinkDrift -LinkPath $DestClaudeSkills -ExpectedTarget (Get-ClaudeSkillsLinkTarget) -ResolvedRoot (Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"))
    }

    Write-Host ""
    Write-Host "Drift check complete." -ForegroundColor Cyan
    if ($script:CheckFailed) { exit 1 }
    return
}

if (-not (Test-Path -LiteralPath $DeployAll)) {
    throw "Deploy orchestrator not found: $DeployAll"
}

& $DeployAll -Target $Target -DryRun:$DryRun

if (-not $DryRun -and ($Target -eq "all" -or $Target -eq "claude" -or $Target -eq "agents")) {
    Set-ClaudeSkillsLink -LinkPath $DestClaudeSkills -ExpectedTarget (Get-ClaudeSkillsLinkTarget)
}

if ($DryRun) {
    Write-Host "Dry run complete. No files were written." -ForegroundColor Yellow
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
        (Join-Path $RepoRoot ".ai\core"),
        (Join-Path $RepoRoot ".ai\routing"),
        (Join-Path $RepoRoot ".ai\adapters")
    ) | Where-Object { Test-Path -LiteralPath $_ }

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
            foreach ($watcher in $watchers) {
                $result = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 1000)
                if (-not $result.TimedOut) {
                    Write-Host "[WATCH] Change detected. Re-deploying..." -ForegroundColor Yellow
                    & $DeployAll -Target $Target
                    break
                }
            }
        }
    }
    finally {
        foreach ($watcher in $watchers) {
            $watcher.EnableRaisingEvents = $false
            $watcher.Dispose()
        }
    }
}
