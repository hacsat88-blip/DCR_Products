#Requires -Version 5.1
<#
.SYNOPSIS
  UserPromptSubmit フックから呼び出され、p/ プレフィックスを検出して gate-state を自動初期化する

.DESCRIPTION
  ユーザープロンプトに p/ が含まれていれば gate-state.json を初期化または再確認する。
  q/ が含まれていれば plan_passed を警告チェック、sh/ なら qa_passed をハードチェック。
  未完了セッションがあれば継続を提示する。

.EXAMPLE
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/lib/gate-auto-init.ps1
#>

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"

if (-not (Test-Path $GateStateLib)) {
    exit 0
}

. $GateStateLib

# プロンプト取得
$toolInput = $env:CLAUDE_TOOL_INPUT
if ([string]::IsNullOrWhiteSpace($toolInput)) {
    exit 0
}

try {
    $parsed = $toolInput | ConvertFrom-Json
    $prompt = $parsed.prompt
    if ([string]::IsNullOrWhiteSpace($prompt)) { exit 0 }
} catch {
    exit 0
}

$gateFile = Get-GateStatePath -RepoRoot $RepoRoot
$trimmedPrompt = $prompt.TrimStart()

# p/ トリガー: gate-state.json を初期化または確認
if ($trimmedPrompt -match '^p/') {
    if (-not (Test-Path $gateFile)) {
        $newState = New-DefaultGateState
        Write-GateState -RepoRoot $RepoRoot -State $newState
        Write-Host "[GATE INIT] gate-state.json を初期化しました (session: $($newState.session_id))" -ForegroundColor Green
    } else {
        $state = Read-GateState -RepoRoot $RepoRoot
        Write-Host "[GATE] 既存セッション検出 (session: $($state.session_id), phase: $($state.phase))" -ForegroundColor Cyan
    }
    exit 0
}

# q/ トリガー: plan_passed チェック (警告)
if ($trimmedPrompt -match '^q/') {
    if (Test-Path $gateFile) {
        $state = Read-GateState -RepoRoot $RepoRoot
        if (-not $state.gates.plan_passed) {
            Write-Host "[WARN] [GATE] p/ Plan Gate が未通過です。q/ の結果は非公式な検証となります。" -ForegroundColor Yellow
        }
    }
    exit 0
}

# sh/ トリガー: qa_passed チェック (ハードブロック)
if ($trimmedPrompt -match '^sh/') {
    if (-not (Test-Path $gateFile)) {
        Write-Host "[STOP] [GATE BLOCK] gate-state.json が存在しません。sh/ を実行できません。" -ForegroundColor Red
        Write-Host "   p/ → q/ → sh/ の順序でゲートを通過してください。" -ForegroundColor Yellow
        exit 1
    }
    $state = Read-GateState -RepoRoot $RepoRoot
    if (-not $state.gates.qa_passed) {
        Write-Host "[STOP] [GATE BLOCK] q/ QA Gate が未通過です。sh/ を実行できません。" -ForegroundColor Red
        exit 1
    }
    Write-Host "[GATE] sh/ ゲート前提: 通過済み" -ForegroundColor Green
    exit 0
}

# 未完了セッションの検出 (通常プロンプト時)
if (Test-Path $gateFile) {
    $state = Read-GateState -RepoRoot $RepoRoot
    if ($state.gates.plan_passed -and -not $state.gates.ship_ready) {
        Write-Host "[PLAN HANDOFF] 未完了セッション: $($state.session_id) (phase: $($state.phase))" -ForegroundColor DarkCyan
    }
}

exit 0
