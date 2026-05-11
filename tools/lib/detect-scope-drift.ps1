#Requires -Version 5.1
<#
.SYNOPSIS
  変更ファイルがプランのスコープ外かどうかを検出する

.DESCRIPTION
  Claude Code の PostToolUse フック (Write|Edit) から呼び出される (async)。
  gate-state.json からアクティブなプランを読み取り、
  変更ファイルがプランで言及されていない場合に警告を発する。
  3回超過でエスカレーション推奨メッセージを表示する。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/lib/detect-scope-drift.ps1
#>

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"

if (-not (Test-Path $GateStateLib)) { exit 0 }
. $GateStateLib

$gateFile = Get-GateStatePath -RepoRoot $RepoRoot
if (-not (Test-Path $gateFile)) { exit 0 }

$state = Read-GateState -RepoRoot $RepoRoot
if (-not $state.gates.plan_passed) { exit 0 }

# 変更対象ファイルパスを取得
$toolInput = $env:CLAUDE_TOOL_INPUT
$filePath = $null
if (-not [string]::IsNullOrWhiteSpace($toolInput)) {
    try {
        $parsed = $toolInput | ConvertFrom-Json
        $filePath = $parsed.file_path
    } catch { }
}
if ([string]::IsNullOrWhiteSpace($filePath)) { exit 0 }

# プランファイルを検索 (docs/dcr/plans/ 内の最新)
$plansDir = Join-Path $RepoRoot "docs\dcr\plans"
if (-not (Test-Path $plansDir)) { exit 0 }

$planFiles = Get-ChildItem -Path $plansDir -Filter "*.md" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $planFiles) { exit 0 }

$planContent = Get-Content $planFiles.FullName -Raw -Encoding UTF8

# ファイル名（パスではなくベース名）がプランに言及されているか確認
$fileName = [System.IO.Path]::GetFileName($filePath)
$relativePath = $filePath.Replace($RepoRoot, "").TrimStart('\', '/')

$inPlan = ($planContent -match [regex]::Escape($fileName)) -or
          ($planContent -match [regex]::Escape($relativePath))

if ($inPlan) { exit 0 }

# スコープ外: drift カウンターを更新
$driftLogPath = Join-Path $RepoRoot ".ai\kernel\scope-drift-count.json"
$driftCount = 0
if (Test-Path $driftLogPath) {
    try {
        $driftData = Get-Content $driftLogPath -Raw | ConvertFrom-Json
        $sessionDrifts = $driftData.PSObject.Properties[$state.session_id]
        if ($sessionDrifts) { $driftCount = $sessionDrifts.Value }
    } catch { }
}

$driftCount++
$driftData = @{ $state.session_id = $driftCount } | ConvertTo-Json
Set-Content -Path $driftLogPath -Value $driftData -Encoding UTF8

if ($driftCount -ge 3) {
    Write-Host ""
    Write-Host "[STOP] スコープドリフト警告 ($driftCount 件目): $relativePath" -ForegroundColor Red
    Write-Host "   このファイルはアクティブなプランに含まれていません。" -ForegroundColor Yellow
    Write-Host "   [WARN] p/ でスコープを再確認・更新することを推奨します。" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "[WARN] スコープ外変更 ($driftCount 件目): $relativePath" -ForegroundColor Yellow
    Write-Host "   プラン ($($planFiles.Name)) に含まれていません。" -ForegroundColor DarkGray
}

exit 0
