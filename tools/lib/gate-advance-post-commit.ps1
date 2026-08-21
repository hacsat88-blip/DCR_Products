#Requires -Version 5.1
<#
.SYNOPSIS
  git commit 成功後に gate-state を自動進行する

.DESCRIPTION
  Claude Code の PostToolUse フック (Bash(git commit *)) から呼び出される。
  コミット成功後、gate-state.json に最新コミット SHA を記録し phase を更新する。

.EXAMPLE
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/lib/gate-advance-post-commit.ps1
#>

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"

if (-not (Test-Path $GateStateLib)) { exit 0 }
. $GateStateLib

$gateFile = Get-GateStatePath -RepoRoot $RepoRoot
if (-not (Test-Path $gateFile)) { exit 0 }

$state = Read-GateState -RepoRoot $RepoRoot

# 最新コミット SHA を取得
try {
    $sha = git -C $RepoRoot rev-parse --short HEAD 2>$null
    if ([string]::IsNullOrWhiteSpace($sha)) { exit 0 }
} catch {
    exit 0
}

# selected_assets にコミット SHA を追加
$assets = [System.Collections.Generic.List[object]]($state.selected_assets ?? @())
$commitEntry = "commit:$sha"
if ($assets -notcontains $commitEntry) {
    $assets.Add($commitEntry)
}

# フェーズ進行: plan → implementation
$newPhase = $state.phase
if ($state.phase -eq "plan" -and $state.gates.plan_passed) {
    $newPhase = "implementation"
    Write-Host "[GATE ADVANCE] phase: plan → implementation (commit $sha)" -ForegroundColor Cyan
}

Update-GateState -RepoRoot $RepoRoot -Phase $newPhase -GateUpdate @{
    selected_assets = $assets.ToArray()
}

Write-Host "[GATE] commit $sha を記録しました (phase: $newPhase)" -ForegroundColor DarkGray
exit 0
