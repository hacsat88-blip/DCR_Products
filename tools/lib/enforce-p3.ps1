#Requires -Version 5.1
<#
.SYNOPSIS
  P3 操作（破壊的・設定変更）を gate-state に基づいてブロックする

.DESCRIPTION
  Claude Code の PreToolUse フックから呼び出される。
  P3 相当の操作は p/ Plan Gate (plan_passed = true) を通過していなければブロックする。
  --force フラグで緊急回避が可能（ログ記録あり）。

.PARAMETER Operation
  操作の種別: delete | config | dependency

.PARAMETER Force
  ゲートチェックをスキップして強制実行（要ログ）

.EXAMPLE
  powershell -File tools/lib/enforce-p3.ps1 -Operation delete
  powershell -File tools/lib/enforce-p3.ps1 -Operation config -Force
#>

param(
    [Parameter(Mandatory)]
    [ValidateSet('delete', 'config', 'dependency')]
    [string]$Operation,

    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"

$OperationLabels = @{
    delete     = "ファイル削除"
    config     = "設定ファイル変更"
    dependency = "依存関係変更"
}
$Label = $OperationLabels[$Operation]

# --force の場合はログして続行
if ($Force) {
    $logPath = Join-Path $RepoRoot ".ai\kernel\p3-force-log.jsonl"
    $logEntry = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        operation = $Operation
        forced    = $true
        tool_input = $env:CLAUDE_TOOL_INPUT
    } | ConvertTo-Json -Compress
    Add-Content -Path $logPath -Value $logEntry -Encoding UTF8
    Write-Host "[WARN] P3強制実行: $Label (force フラグ使用、ログ記録済み)" -ForegroundColor Yellow
    exit 0
}

# gate-state.ps1 が存在しない場合は警告のみ
if (-not (Test-Path $GateStateLib)) {
    Write-Host "[WARN] [P3] gate-state.ps1 未検出。P3チェックをスキップします。" -ForegroundColor Yellow
    exit 0
}

. $GateStateLib

$gateFile = Get-GateStatePath -RepoRoot $RepoRoot

if (-not (Test-Path $gateFile)) {
    Write-Host ""
    Write-Host "[STOP] P3操作検出: $Label" -ForegroundColor Red
    Write-Host "   gate-state.json が存在しません。" -ForegroundColor Yellow
    Write-Host "   p/ で計画を策定・承認してから実行してください。" -ForegroundColor Yellow
    Write-Host "   緊急時: -Force フラグで回避可能（要ログ記録）" -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

$state = Read-GateState -RepoRoot $RepoRoot

if (-not $state.gates.plan_passed) {
    Write-Host ""
    Write-Host "[STOP] P3操作ブロック: $Label" -ForegroundColor Red
    Write-Host "   p/ Plan Gate が未通過です (plan_passed = false)" -ForegroundColor Yellow
    Write-Host "   p/ で計画を策定・承認してから実行してください。" -ForegroundColor Yellow
    Write-Host "   緊急時: -Force フラグで回避可能（要ログ記録）" -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

Write-Host "[OK] P3ゲート通過: $Label を許可します" -ForegroundColor Green
exit 0
