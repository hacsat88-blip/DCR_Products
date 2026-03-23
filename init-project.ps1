<#
.SYNOPSIS
  DCR Products — Project Init script
  テンプレートと project-context.md からプロジェクト固有の AI 指示ファイルを生成

.DESCRIPTION
  対象ファイル:
    CLAUDE.md                       (Claude Code)
    AGENTS.md                       (Codex)
    .github/copilot-instructions.md (VS Code Copilot)

  共有リソース（-SkipShared で省略可）:
    .ai/kernel.md                   (DCR Kernel)
    .ai/module/*                    (モジュールファイル)
    .commands/*                     (コマンドファイル)

  project-context.md の key: value を読み取り、テンプレート内の
  {key} プレースホルダーを置換して出力先に書き出す。

.PARAMETER ProjectPath
  AI 指示ファイルを生成するプロジェクトフォルダのパス（必須）

.PARAMETER ContextFile
  project-context.md のパス。省略時は ProjectPath 直下を探す

.PARAMETER Target
  生成対象: all | claude | codex | copilot

.PARAMETER SkipShared
  共有リソース（.ai/kernel.md, .ai/module/, .commands/）のコピーをスキップ

.PARAMETER DryRun
  実際にはファイルを書き出さず、生成内容をコンソールに表示する

.EXAMPLE
  .\init-project.ps1 -ProjectPath .\prototypes\my-app
  .\init-project.ps1 -ProjectPath .\prototypes\my-app -DryRun
  .\init-project.ps1 -ProjectPath .\prototypes\my-app -Target claude
  .\init-project.ps1 -ProjectPath .\prototypes\my-app -SkipShared
  .\init-project.ps1 -ProjectPath .\prototypes\my-app -ContextFile .\custom-context.md
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,
    [string]$ContextFile,
    [ValidateSet("all", "claude", "codex", "copilot")]
    [string]$Target = "all",
    [switch]$SkipShared,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

# ── Resolve paths ──

$ProjectPath = (Resolve-Path -Path $ProjectPath -ErrorAction Stop).Path

if (-not $ContextFile) {
    $ContextFile = Join-Path $ProjectPath "project-context.md"
}

if (-not (Test-Path $ContextFile)) {
    Write-Error "project-context.md が見つかりません: $ContextFile"
    exit 1
}

# ── Template paths ──

$Templates = @{
    claude = @{
        Source = Join-Path $RepoRoot "templates\claude-code\.claude\CLAUDE.md"
        Dest   = Join-Path $ProjectPath ".claude\CLAUDE.md"
    }
    codex = @{
        Source = Join-Path $RepoRoot "templates\codex\AGENTS.md"
        Dest   = Join-Path $ProjectPath "AGENTS.md"
    }
    copilot = @{
        Source = Join-Path $RepoRoot "templates\vscode-copilot\.github\copilot-instructions.md"
        Dest   = Join-Path $ProjectPath ".github\copilot-instructions.md"
    }
}

# ── Parse project-context.md ──

function Read-ProjectContext {
    param([string]$Path)

    $context = @{}
    $multiLineKey = $null
    $multiLineValue = [System.Text.StringBuilder]::new()

    foreach ($line in (Get-Content -Path $Path -Encoding UTF8)) {
        # Skip comments and blank lines (outside multi-line)
        if ($null -eq $multiLineKey) {
            if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
        }

        # Multi-line block (key: |)
        if ($null -ne $multiLineKey) {
            if ($line -match '^\S' -and $line -notmatch '^\s') {
                # New key starts — save accumulated value
                $context[$multiLineKey] = $multiLineValue.ToString().TrimEnd("`n")
                $multiLineKey = $null
                $multiLineValue.Clear() | Out-Null
                # Fall through to parse this line as a new key
            }
            else {
                # Continuation of multi-line value (strip 2-space indent)
                $stripped = $line -replace '^  ', ''
                $multiLineValue.AppendLine($stripped) | Out-Null
                continue
            }
        }

        # key: value
        if ($line -match '^([a-z_][a-z0-9_]*)\s*:\s*\|?\s*$') {
            # Multi-line start (key: |)
            $multiLineKey = $matches[1]
            $multiLineValue.Clear() | Out-Null
        }
        elseif ($line -match '^([a-z_][a-z0-9_]*)\s*:\s*(.+)$') {
            $context[$matches[1]] = $matches[2].Trim()
        }
    }

    # Flush last multi-line
    if ($null -ne $multiLineKey) {
        $context[$multiLineKey] = $multiLineValue.ToString().TrimEnd("`n")
    }

    return $context
}

$context = Read-ProjectContext -Path $ContextFile

Write-Host "`n=== DCR init-project ===" -ForegroundColor Cyan
Write-Host "Project : $ProjectPath"
Write-Host "Context : $ContextFile"
Write-Host "Target  : $Target"
if ($DryRun) { Write-Host "Mode    : DryRun" -ForegroundColor Yellow }
Write-Host ""

# ── Apply placeholders ──

function Expand-Template {
    param(
        [string]$TemplatePath,
        [hashtable]$Context
    )

    $content = Get-Content -Path $TemplatePath -Raw -Encoding UTF8

    foreach ($key in $Context.Keys) {
        $placeholder = "{$key}"
        $content = $content.Replace($placeholder, $Context[$key])
    }

    return $content
}

# ── Generate files ──

$targets = if ($Target -eq "all") { @("claude", "codex", "copilot") } else { @($Target) }
$generated = 0

foreach ($t in $targets) {
    $tmpl = $Templates[$t]

    if (-not (Test-Path $tmpl.Source)) {
        Write-Warning "テンプレートが見つかりません: $($tmpl.Source)"
        continue
    }

    $output = Expand-Template -TemplatePath $tmpl.Source -Context $context

    if ($DryRun) {
        Write-Host "--- [$t] $($tmpl.Dest) ---" -ForegroundColor Green
        Write-Host $output
        Write-Host ""
    }
    else {
        $destDir = Split-Path $tmpl.Dest -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }

        # UTF-8 without BOM
        [System.IO.File]::WriteAllText($tmpl.Dest, $output, [System.Text.UTF8Encoding]::new($false))
        Write-Host "[OK] $($tmpl.Dest)" -ForegroundColor Green
        $generated++
    }
}

# ── Copy shared resources ──

if (-not $SkipShared) {
    Write-Host "--- Shared resources ---" -ForegroundColor Cyan

    $sharedItems = @(
        @{ Source = Join-Path $RepoRoot ".ai\kernel.md";  Dest = Join-Path $ProjectPath ".ai\kernel.md"; Label = ".ai/kernel.md" }
    )

    # .ai/module/* files
    $moduleDir = Join-Path $RepoRoot ".ai\module"
    if (Test-Path $moduleDir) {
        Get-ChildItem -Path $moduleDir -File | ForEach-Object {
            $sharedItems += @{
                Source = $_.FullName
                Dest   = Join-Path $ProjectPath ".ai\module\$($_.Name)"
                Label  = ".ai/module/$($_.Name)"
            }
        }
    }

    # .commands/* files
    $commandsDir = Join-Path $RepoRoot ".commands"
    if (Test-Path $commandsDir) {
        Get-ChildItem -Path $commandsDir -File | ForEach-Object {
            $sharedItems += @{
                Source = $_.FullName
                Dest   = Join-Path $ProjectPath ".commands\$($_.Name)"
                Label  = ".commands/$($_.Name)"
            }
        }
    }

    foreach ($item in $sharedItems) {
        if (-not (Test-Path $item.Source)) {
            Write-Warning "ソースが見つかりません: $($item.Source)"
            continue
        }

        if ($DryRun) {
            Write-Host "[DryRun] $($item.Label)" -ForegroundColor Yellow
        }
        else {
            $destDir = Split-Path $item.Dest -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item -Path $item.Source -Destination $item.Dest -Force
            Write-Host "[OK] $($item.Label)" -ForegroundColor Green
            $generated++
        }
    }
}

# ── Summary ──

Write-Host ""
if ($DryRun) {
    Write-Host "DryRun 完了 — 実際のファイルは生成されていません" -ForegroundColor Yellow
}
else {
    Write-Host "$generated ファイルを生成しました" -ForegroundColor Cyan
}

# Warn about remaining placeholders
$remaining = ($targets | ForEach-Object {
    $tmpl = $Templates[$_]
    if (Test-Path $tmpl.Dest) {
        $c = Get-Content -Path $tmpl.Dest -Raw -Encoding UTF8
        [regex]::Matches($c, '\{[a-z_]+\}') | ForEach-Object { $_.Value }
    }
}) | Sort-Object -Unique

if ($remaining) {
    Write-Host ""
    Write-Warning "未置換のプレースホルダーがあります:"
    $remaining | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host "project-context.md に対応するキーを追加してください"
}
