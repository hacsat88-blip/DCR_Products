<#
.SYNOPSIS
  DCR Products — Project Init script
  テンプレートと project-context.md からプロジェクト固有の AI 指示ファイルを生成

.DESCRIPTION
    対象ファイル:
        CLAUDE.md                          (Claude Code)
        .claude/commands/*.md             (Claude Code)
        .claude/mcp_config.example.json   (Claude Code)
        .claude/hooks.example.json        (Claude Code)
        AGENTS.md                          (Codex)
        .codex/workflows/*.md             (Codex)
        .codex/mcp_config.example.json    (Codex)
        .codex/hooks.example.md           (Codex)
        .github/copilot-instructions.md    (VS Code Copilot)
        .github/prompts/*.prompt.md       (VS Code Copilot)
        .vscode/mcp.json                  (VS Code Copilot)
        .vscode/tasks.hooks.json          (VS Code Copilot)
        .windsurf/rules/dcr-kernel.md      (Windsurf)
        .windsurf/hooks.json               (Windsurf)
        .windsurf/mcp_config.example.json  (Windsurf)
        .windsurf/workflows/*.md           (Windsurf)

  共有リソース（-SkipShared で省略可）:
    .ai/kernel.md                   (DCR Kernel)
    .ai/module/*                    (モジュールファイル)
    .ai/kernel/gates/*              (トリガーゲートファイル)

  project-context.md の key: value を読み取り、テンプレート内の
  {key} プレースホルダーを置換して出力先に書き出す。

.PARAMETER ProjectPath
  AI 指示ファイルを生成するプロジェクトフォルダのパス（必須）

.PARAMETER ContextFile
  project-context.md のパス。省略時は ProjectPath 直下を探す

.PARAMETER Target
    生成対象: all | claude | codex | copilot | windsurf

.PARAMETER SkipShared
  共有リソース（.ai/kernel.md, .ai/module/, .ai/kernel/gates/）のコピーをスキップ

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
    [ValidateSet("all", "claude", "codex", "copilot", "windsurf")]
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
    claude   = @{
        Source = Join-Path $RepoRoot "templates\claude-code\.claude\CLAUDE.md"
        Dest   = Join-Path $ProjectPath ".claude\CLAUDE.md"
    }
    codex    = @{
        Source = Join-Path $RepoRoot "templates\codex\AGENTS.md"
        Dest   = Join-Path $ProjectPath "AGENTS.md"
    }
    copilot  = @{
        Source = Join-Path $RepoRoot "templates\vscode-copilot\.github\copilot-instructions.md"
        Dest   = Join-Path $ProjectPath ".github\copilot-instructions.md"
    }
    windsurf = @{
        Source = Join-Path $RepoRoot "templates\windsurf\.windsurf\rules\dcr-kernel.md"
        Dest   = Join-Path $ProjectPath ".windsurf\rules\dcr-kernel.md"
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

$targets = if ($Target -eq "all") { @("claude", "codex", "copilot", "windsurf") } else { @($Target) }
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

        # Claude settings template copy
        if ($t -eq "claude") {
            $claudeSettingsSource = Join-Path $RepoRoot "templates\claude-code\.claude\settings.local.json"
            $claudeSettingsDest = Join-Path $ProjectPath ".claude\settings.local.json"
            if (Test-Path $claudeSettingsSource) {
                Copy-Item -Path $claudeSettingsSource -Destination $claudeSettingsDest -Force
                Write-Host "[OK] $claudeSettingsDest" -ForegroundColor Green
                $generated++
            }

            $claudeExtraFiles = @(
                @{ Source = Join-Path $RepoRoot "templates\claude-code\.claude\mcp_config.example.json"; Dest = Join-Path $ProjectPath ".claude\mcp_config.example.json" },
                @{ Source = Join-Path $RepoRoot "templates\claude-code\.claude\hooks.example.json"; Dest = Join-Path $ProjectPath ".claude\hooks.example.json" }
            )

            foreach ($extra in $claudeExtraFiles) {
                if (Test-Path $extra.Source) {
                    $extraDestDir = Split-Path $extra.Dest -Parent
                    if (-not (Test-Path $extraDestDir)) {
                        New-Item -ItemType Directory -Path $extraDestDir -Force | Out-Null
                    }
                    Copy-Item -Path $extra.Source -Destination $extra.Dest -Force
                    Write-Host "[OK] $($extra.Dest)" -ForegroundColor Green
                    $generated++
                }
            }

            $claudeCommandsSourceDir = Join-Path $RepoRoot "templates\claude-code\.claude\commands"
            if (Test-Path $claudeCommandsSourceDir) {
                $claudeCommandsDestDir = Join-Path $ProjectPath ".claude\commands"
                if (-not (Test-Path $claudeCommandsDestDir)) {
                    New-Item -ItemType Directory -Path $claudeCommandsDestDir -Force | Out-Null
                }

                Get-ChildItem -Path $claudeCommandsSourceDir -File -Filter *.md | ForEach-Object {
                    $commandDest = Join-Path $claudeCommandsDestDir $_.Name
                    Copy-Item -Path $_.FullName -Destination $commandDest -Force
                    Write-Host "[OK] $commandDest" -ForegroundColor Green
                    $generated++
                }
            }
        }

        if ($t -eq "codex") {
            $codexExtraFiles = @(
                @{ Source = Join-Path $RepoRoot "templates\codex\.codex\mcp_config.example.json"; Dest = Join-Path $ProjectPath ".codex\mcp_config.example.json" },
                @{ Source = Join-Path $RepoRoot "templates\codex\.codex\hooks.example.md"; Dest = Join-Path $ProjectPath ".codex\hooks.example.md" }
            )

            foreach ($extra in $codexExtraFiles) {
                if (Test-Path $extra.Source) {
                    $extraDestDir = Split-Path $extra.Dest -Parent
                    if (-not (Test-Path $extraDestDir)) {
                        New-Item -ItemType Directory -Path $extraDestDir -Force | Out-Null
                    }
                    Copy-Item -Path $extra.Source -Destination $extra.Dest -Force
                    Write-Host "[OK] $($extra.Dest)" -ForegroundColor Green
                    $generated++
                }
            }

            $codexWorkflowsSourceDir = Join-Path $RepoRoot "templates\codex\.codex\workflows"
            if (Test-Path $codexWorkflowsSourceDir) {
                $codexWorkflowsDestDir = Join-Path $ProjectPath ".codex\workflows"
                if (-not (Test-Path $codexWorkflowsDestDir)) {
                    New-Item -ItemType Directory -Path $codexWorkflowsDestDir -Force | Out-Null
                }

                Get-ChildItem -Path $codexWorkflowsSourceDir -File -Filter *.md | ForEach-Object {
                    $workflowDest = Join-Path $codexWorkflowsDestDir $_.Name
                    Copy-Item -Path $_.FullName -Destination $workflowDest -Force
                    Write-Host "[OK] $workflowDest" -ForegroundColor Green
                    $generated++
                }
            }
        }

        if ($t -eq "copilot") {
            $copilotExtraFiles = @(
                @{ Source = Join-Path $RepoRoot "templates\vscode-copilot\.vscode\mcp.json"; Dest = Join-Path $ProjectPath ".vscode\mcp.json" },
                @{ Source = Join-Path $RepoRoot "templates\vscode-copilot\.vscode\tasks.hooks.json"; Dest = Join-Path $ProjectPath ".vscode\tasks.hooks.json" }
            )

            foreach ($extra in $copilotExtraFiles) {
                if (Test-Path $extra.Source) {
                    $extraDestDir = Split-Path $extra.Dest -Parent
                    if (-not (Test-Path $extraDestDir)) {
                        New-Item -ItemType Directory -Path $extraDestDir -Force | Out-Null
                    }
                    Copy-Item -Path $extra.Source -Destination $extra.Dest -Force
                    Write-Host "[OK] $($extra.Dest)" -ForegroundColor Green
                    $generated++
                }
            }

            $copilotPromptsSourceDir = Join-Path $RepoRoot "templates\vscode-copilot\.github\prompts"
            if (Test-Path $copilotPromptsSourceDir) {
                $copilotPromptsDestDir = Join-Path $ProjectPath ".github\prompts"
                if (-not (Test-Path $copilotPromptsDestDir)) {
                    New-Item -ItemType Directory -Path $copilotPromptsDestDir -Force | Out-Null
                }

                Get-ChildItem -Path $copilotPromptsSourceDir -File -Filter *.md | ForEach-Object {
                    $promptDest = Join-Path $copilotPromptsDestDir $_.Name
                    Copy-Item -Path $_.FullName -Destination $promptDest -Force
                    Write-Host "[OK] $promptDest" -ForegroundColor Green
                    $generated++
                }
            }
        }

        if ($t -eq "windsurf") {
            $windsurfExtraFiles = @(
                @{ Source = Join-Path $RepoRoot "templates\windsurf\.windsurf\hooks.json"; Dest = Join-Path $ProjectPath ".windsurf\hooks.json" },
                @{ Source = Join-Path $RepoRoot "templates\windsurf\.windsurf\mcp_config.example.json"; Dest = Join-Path $ProjectPath ".windsurf\mcp_config.example.json" }
            )

            foreach ($extra in $windsurfExtraFiles) {
                if (Test-Path $extra.Source) {
                    $extraDestDir = Split-Path $extra.Dest -Parent
                    if (-not (Test-Path $extraDestDir)) {
                        New-Item -ItemType Directory -Path $extraDestDir -Force | Out-Null
                    }
                    Copy-Item -Path $extra.Source -Destination $extra.Dest -Force
                    Write-Host "[OK] $($extra.Dest)" -ForegroundColor Green
                    $generated++
                }
            }

            $windsurfWorkflowsSourceDir = Join-Path $RepoRoot "templates\windsurf\.windsurf\workflows"
            if (Test-Path $windsurfWorkflowsSourceDir) {
                $windsurfWorkflowsDestDir = Join-Path $ProjectPath ".windsurf\workflows"
                if (-not (Test-Path $windsurfWorkflowsDestDir)) {
                    New-Item -ItemType Directory -Path $windsurfWorkflowsDestDir -Force | Out-Null
                }

                Get-ChildItem -Path $windsurfWorkflowsSourceDir -File -Filter *.md | ForEach-Object {
                    $workflowDest = Join-Path $windsurfWorkflowsDestDir $_.Name
                    Copy-Item -Path $_.FullName -Destination $workflowDest -Force
                    Write-Host "[OK] $workflowDest" -ForegroundColor Green
                    $generated++
                }
            }
        }
    }

    if ($DryRun -and $t -eq "claude") {
        $claudeSettingsSource = Join-Path $RepoRoot "templates\claude-code\.claude\settings.local.json"
        if (Test-Path $claudeSettingsSource) {
            Write-Host "[DryRun] .claude/settings.local.json" -ForegroundColor Yellow
        }

        $claudeDryExtras = @(
            (Join-Path $RepoRoot "templates\claude-code\.claude\mcp_config.example.json"),
            (Join-Path $RepoRoot "templates\claude-code\.claude\hooks.example.json")
        )
        foreach ($extraPath in $claudeDryExtras) {
            if (Test-Path $extraPath) {
                Write-Host "[DryRun] .claude/$([IO.Path]::GetFileName($extraPath))" -ForegroundColor Yellow
            }
        }

        $claudeCommandsSourceDir = Join-Path $RepoRoot "templates\claude-code\.claude\commands"
        if (Test-Path $claudeCommandsSourceDir) {
            Get-ChildItem -Path $claudeCommandsSourceDir -File -Filter *.md | ForEach-Object {
                Write-Host "[DryRun] .claude/commands/$($_.Name)" -ForegroundColor Yellow
            }
        }
    }

    if ($DryRun -and $t -eq "codex") {
        $codexDryExtras = @(
            (Join-Path $RepoRoot "templates\codex\.codex\mcp_config.example.json"),
            (Join-Path $RepoRoot "templates\codex\.codex\hooks.example.md")
        )
        foreach ($extraPath in $codexDryExtras) {
            if (Test-Path $extraPath) {
                Write-Host "[DryRun] .codex/$([IO.Path]::GetFileName($extraPath))" -ForegroundColor Yellow
            }
        }

        $codexWorkflowsSourceDir = Join-Path $RepoRoot "templates\codex\.codex\workflows"
        if (Test-Path $codexWorkflowsSourceDir) {
            Get-ChildItem -Path $codexWorkflowsSourceDir -File -Filter *.md | ForEach-Object {
                Write-Host "[DryRun] .codex/workflows/$($_.Name)" -ForegroundColor Yellow
            }
        }
    }

    if ($DryRun -and $t -eq "copilot") {
        $copilotDryExtras = @(
            (Join-Path $RepoRoot "templates\vscode-copilot\.vscode\mcp.json"),
            (Join-Path $RepoRoot "templates\vscode-copilot\.vscode\tasks.hooks.json")
        )
        foreach ($extraPath in $copilotDryExtras) {
            if (Test-Path $extraPath) {
                Write-Host "[DryRun] .vscode/$([IO.Path]::GetFileName($extraPath))" -ForegroundColor Yellow
            }
        }

        $copilotPromptsSourceDir = Join-Path $RepoRoot "templates\vscode-copilot\.github\prompts"
        if (Test-Path $copilotPromptsSourceDir) {
            Get-ChildItem -Path $copilotPromptsSourceDir -File -Filter *.md | ForEach-Object {
                Write-Host "[DryRun] .github/prompts/$($_.Name)" -ForegroundColor Yellow
            }
        }
    }

    if ($DryRun -and $t -eq "windsurf") {
        $windsurfExtras = @(
            (Join-Path $RepoRoot "templates\windsurf\.windsurf\hooks.json"),
            (Join-Path $RepoRoot "templates\windsurf\.windsurf\mcp_config.example.json")
        )

        foreach ($extraPath in $windsurfExtras) {
            if (Test-Path $extraPath) {
                Write-Host "[DryRun] .windsurf/$([IO.Path]::GetFileName($extraPath))" -ForegroundColor Yellow
            }
        }

        $windsurfWorkflowsSourceDir = Join-Path $RepoRoot "templates\windsurf\.windsurf\workflows"
        if (Test-Path $windsurfWorkflowsSourceDir) {
            Get-ChildItem -Path $windsurfWorkflowsSourceDir -File -Filter *.md | ForEach-Object {
                Write-Host "[DryRun] .windsurf/workflows/$($_.Name)" -ForegroundColor Yellow
            }
        }
    }
}

# ── Copy shared resources ──

if (-not $SkipShared) {
    Write-Host "--- Shared resources ---" -ForegroundColor Cyan

    $sharedItems = @(
        @{ Source = Join-Path $RepoRoot ".ai\kernel.md"; Dest = Join-Path $ProjectPath ".ai\kernel.md"; Label = ".ai/kernel.md" }
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

    # .ai/kernel/gates/* files
    $gatesDir = Join-Path $RepoRoot ".ai\kernel\gates"
    if (Test-Path $gatesDir) {
        Get-ChildItem -Path $gatesDir -File | ForEach-Object {
            $sharedItems += @{
                Source = $_.FullName
                Dest   = Join-Path $ProjectPath ".ai\kernel\gates\$($_.Name)"
                Label  = ".ai/kernel/gates/$($_.Name)"
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
