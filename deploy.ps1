<#
.SYNOPSIS
  DCR Products — Deploy script
  サトシ開発 (Git管理) から各エディタのユーザーレベルパスへ一方向同期

.DESCRIPTION
  対象エディタと同期先:
    VS Code Copilot : ~/.agents/skills/
    Cursor          : ~/.cursor/rules/  (rules/ から .mdc を生成して同期)
    Agents          : .ai/agents-source/ → .codex/agents/ (toml) + .claude/agents/ (md)

.PARAMETER Target
  同期先を指定: all | vscode | cursor | agents
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
    [ValidateSet("all", "vscode", "cursor", "agents")]
    [string]$Target = "all",
    [switch]$DryRun,
    [switch]$Check
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
$UserHome = $env:USERPROFILE

# ── Paths ──
$SourceSkills = Join-Path $RepoRoot "skills"
$SourceRules  = Join-Path $RepoRoot "rules"
$SourceCursorKernel = Join-Path $RepoRoot ".cursor\rules\dcr-kernel.md"
$SourceAgents = Join-Path $RepoRoot ".ai\agents-source"

$DestVSCodeSkills = Join-Path $UserHome ".agents\skills"
$DestCursorRules  = Join-Path $UserHome ".cursor\rules"
$DestCursorManifest = Join-Path $DestCursorRules ".dcr-managed-files.json"
$DestProjectCursorRules = Join-Path $RepoRoot ".cursor\rules"
$DestCodexAgents  = Join-Path $RepoRoot ".codex\agents"
$DestClaudeAgents = Join-Path $RepoRoot ".claude\agents"

function Get-TempDirectory {
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("dcr-cursor-rules-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    return $tempDir
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
    $sourceNames = $sourceItems | Select-Object -ExpandProperty Name
    $managedNames = @()
    if ($PruneManifestPath -and (Test-Path $PruneManifestPath)) {
        $managedNames = Get-Content -Path $PruneManifestPath -Raw -Encoding utf8 | ConvertFrom-Json
    }

    $staleItems = @()
    if (Test-Path $Destination) {
        $destItems = Get-ChildItem $Destination -File | Where-Object {
            -not $PruneManifestPath -or $_.FullName -ne $PruneManifestPath
        }
        if ($PruneManifestPath) {
            $staleItems = $destItems | Where-Object {
                $_.Name -in $managedNames -and $_.Name -notin $sourceNames
            }
        } else {
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
        Write-Utf8NoBom -Path $PruneManifestPath -Content (($sourceNames | ConvertTo-Json) + "`r`n")
    }

    Write-Host "[OK] $Label : $count files → $Destination" -ForegroundColor Green
}

# ── Diff Check ──
function Compare-Directories {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Label
    )

    if (-not (Test-Path $Source) -or -not (Test-Path $Destination)) {
        Write-Warning "$Label : source or destination missing"
        return
    }

    $diffs = @()

    # Files only in destination (edited outside repo)
    $destFiles = Get-ChildItem $Destination -Recurse -File
    foreach ($df in $destFiles) {
        $relativePath = $df.FullName.Substring($Destination.Length + 1)
        $sourceFile = Join-Path $Source $relativePath
        if (-not (Test-Path $sourceFile)) {
            $diffs += "[EXTRA] $relativePath (exists only in editor)"
        } else {
            $sourceHash = (Get-FileHash $sourceFile -Algorithm MD5).Hash
            $destHash   = (Get-FileHash $df.FullName -Algorithm MD5).Hash
            if ($sourceHash -ne $destHash) {
                $diffs += "[MODIFIED] $relativePath (editor differs from repo)"
            }
        }
    }

    # Files only in source (not yet deployed)
    $sourceFiles = Get-ChildItem $Source -Recurse -File
    foreach ($sf in $sourceFiles) {
        $relativePath = $sf.FullName.Substring($Source.Length + 1)
        $destFile = Join-Path $Destination $relativePath
        if (-not (Test-Path $destFile)) {
            $diffs += "[MISSING] $relativePath (not deployed to editor)"
        }
    }

    if ($diffs.Count -eq 0) {
        Write-Host "[OK] $Label : in sync" -ForegroundColor Green
    } else {
        Write-Host "[DRIFT] $Label : $($diffs.Count) differences found" -ForegroundColor Red
        $diffs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    }
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
            Compare-Directories -Source $cursorTempDir -Destination $DestCursorRules -Label "Cursor rules (user)"
            Compare-Directories -Source $cursorTempDir -Destination $DestProjectCursorRules -Label "Cursor rules (project)"
        } finally {
            if (Test-Path $cursorTempDir) {
                Remove-Item -Path $cursorTempDir -Recurse -Force
            }
        }
    }
    if ($Target -eq "all" -or $Target -eq "agents") {
        # Codex agents: compare .toml files
        if ((Test-Path $SourceAgents) -and (Test-Path $DestCodexAgents)) {
            $codexDiffs = @()
            $srcToml = Get-ChildItem $SourceAgents -File -Filter '*.toml'
            foreach ($sf in $srcToml) {
                $destFile = Join-Path $DestCodexAgents $sf.Name
                if (-not (Test-Path $destFile)) {
                    $codexDiffs += "[MISSING] $($sf.Name)"
                } elseif ((Get-FileHash $sf.FullName -Algorithm MD5).Hash -ne (Get-FileHash $destFile -Algorithm MD5).Hash) {
                    $codexDiffs += "[MODIFIED] $($sf.Name)"
                }
            }
            $srcTomlNames = $srcToml | Select-Object -ExpandProperty BaseName
            $destToml = Get-ChildItem $DestCodexAgents -File -Filter '*.toml' -ErrorAction SilentlyContinue
            foreach ($df in $destToml) {
                if ($df.BaseName -notin $srcTomlNames) {
                    $codexDiffs += "[EXTRA] $($df.Name)"
                }
            }
            if ($codexDiffs.Count -eq 0) {
                Write-Host "[OK] Codex agents : in sync" -ForegroundColor Green
            } else {
                Write-Host "[DRIFT] Codex agents : $($codexDiffs.Count) differences" -ForegroundColor Red
                $codexDiffs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
            }
        }
        # Claude agents: compare .md files
        if ((Test-Path $SourceAgents) -and (Test-Path $DestClaudeAgents)) {
            $claudeDiffs = @()
            $srcMd = Get-ChildItem $SourceAgents -File -Filter '*.md' | Where-Object { $_.Name -ne 'README.md' }
            foreach ($sf in $srcMd) {
                $destFile = Join-Path $DestClaudeAgents $sf.Name
                if (-not (Test-Path $destFile)) {
                    $claudeDiffs += "[MISSING] $($sf.Name)"
                } elseif ((Get-FileHash $sf.FullName -Algorithm MD5).Hash -ne (Get-FileHash $destFile -Algorithm MD5).Hash) {
                    $claudeDiffs += "[MODIFIED] $($sf.Name)"
                }
            }
            $srcMdNames = $srcMd | Select-Object -ExpandProperty BaseName
            $destMd = Get-ChildItem $DestClaudeAgents -File -Filter '*.md' -ErrorAction SilentlyContinue
            foreach ($df in $destMd) {
                if ($df.BaseName -notin $srcMdNames) {
                    $claudeDiffs += "[EXTRA] $($df.Name)"
                }
            }
            if ($claudeDiffs.Count -eq 0) {
                Write-Host "[OK] Claude agents : in sync" -ForegroundColor Green
            } else {
                Write-Host "[DRIFT] Claude agents : $($claudeDiffs.Count) differences" -ForegroundColor Red
                $claudeDiffs | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
            }
        }
    }
    Write-Host ""
    Write-Host "Drift check complete." -ForegroundColor Cyan
    return
}

if ($Target -eq "all" -or $Target -eq "vscode") {
    Sync-Directory -Source $SourceSkills -Destination $DestVSCodeSkills -Label "VS Code Copilot skills"
}

if ($Target -eq "all" -or $Target -eq "cursor") {
    $cursorTempDir = Get-TempDirectory
    try {
        New-CursorRulePackage -RulesSource $SourceRules -SkillsSource $SourceSkills -KernelSource $SourceCursorKernel -OutputDir $cursorTempDir
        Sync-Files -Source $cursorTempDir -Destination $DestCursorRules -Label "Cursor rules (user)" -Prune -PruneManifestPath $DestCursorManifest
        Sync-Files -Source $cursorTempDir -Destination $DestProjectCursorRules -Label "Cursor rules (project)" -Prune
    } finally {
        if (Test-Path $cursorTempDir) {
            Remove-Item -Path $cursorTempDir -Recurse -Force
        }
    }
}

if ($Target -eq "all" -or $Target -eq "agents") {
    Sync-Agents -Source $SourceAgents -CodexDest $DestCodexAgents -ClaudeDest $DestClaudeAgents
}

Write-Host ""
if ($DryRun) {
    Write-Host "Dry run complete. No files were copied." -ForegroundColor Yellow
} else {
    Write-Host "Deploy complete." -ForegroundColor Green
}
