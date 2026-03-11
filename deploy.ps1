<#
.SYNOPSIS
  DCR Products — Deploy script
  サトシ開発 (Git管理) から各エディタのユーザーレベルパスへ一方向同期

.DESCRIPTION
  対象エディタと同期先:
    VS Code Copilot : ~/.agents/skills/
    Cursor          : ~/.cursor/rules/  (rules/ から .mdc を生成して同期)
    Claude Code     : プロジェクト単位 (CLAUDE.md を生成する場合は別途)

.PARAMETER Target
  同期先を指定: all | vscode | cursor
  デフォルト: all

.PARAMETER DryRun
  実際にはコピーせず、対象ファイルを表示するだけ

.PARAMETER Check
  エディタ側とリポジトリ側の差分を検出する（逆同期チェック）

.EXAMPLE
  .\deploy.ps1
  .\deploy.ps1 -Target vscode
  .\deploy.ps1 -Target cursor -DryRun
  .\deploy.ps1 -Check
#>

param(
    [ValidateSet("all", "vscode", "cursor")]
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

$DestVSCodeSkills = Join-Path $UserHome ".agents\skills"
$DestCursorRules  = Join-Path $UserHome ".cursor\rules"

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
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
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

function New-CursorRulePackage {
    param(
        [string]$RulesSource,
        [string]$KernelSource,
        [string]$OutputDir
    )

    if (-not (Test-Path $RulesSource)) {
        throw "Source rules not found: $RulesSource"
    }

    if (-not (Test-Path $KernelSource)) {
        throw "Cursor kernel not found: $KernelSource"
    }

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
        Set-Content -Path $destination -Value $cursorContent -Encoding utf8
    }

    Copy-Item -Path $KernelSource -Destination (Join-Path $OutputDir "dcr-kernel.md") -Force
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

    $sourceItems = Get-ChildItem $Source -Directory
    $count = $sourceItems.Count

    if ($DryRun) {
        Write-Host "[DRY RUN] $Label : $count items → $Destination" -ForegroundColor Yellow
        $sourceItems | ForEach-Object { Write-Host "  $_" }
        return
    }

    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }

    Copy-Item -Path "$Source\*" -Destination $Destination -Recurse -Force
    Write-Host "[OK] $Label : $count items → $Destination" -ForegroundColor Green
}

function Sync-Files {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Label
    )

    if (-not (Test-Path $Source)) {
        Write-Warning "Source not found: $Source"
        return
    }

    $sourceItems = Get-ChildItem $Source -File
    $count = $sourceItems.Count

    if ($DryRun) {
        Write-Host "[DRY RUN] $Label : $count files → $Destination" -ForegroundColor Yellow
        $sourceItems | ForEach-Object { Write-Host "  $_" }
        return
    }

    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }

    Copy-Item -Path "$Source\*" -Destination $Destination -Force
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
            New-CursorRulePackage -RulesSource $SourceRules -KernelSource $SourceCursorKernel -OutputDir $cursorTempDir
            Compare-Directories -Source $cursorTempDir -Destination $DestCursorRules -Label "Cursor rules"
        } finally {
            if (Test-Path $cursorTempDir) {
                Remove-Item -Path $cursorTempDir -Recurse -Force
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
        New-CursorRulePackage -RulesSource $SourceRules -KernelSource $SourceCursorKernel -OutputDir $cursorTempDir
        Sync-Files -Source $cursorTempDir -Destination $DestCursorRules -Label "Cursor rules"
    } finally {
        if (Test-Path $cursorTempDir) {
            Remove-Item -Path $cursorTempDir -Recurse -Force
        }
    }
}

Write-Host ""
if ($DryRun) {
    Write-Host "Dry run complete. No files were copied." -ForegroundColor Yellow
} else {
    Write-Host "Deploy complete." -ForegroundColor Green
}
