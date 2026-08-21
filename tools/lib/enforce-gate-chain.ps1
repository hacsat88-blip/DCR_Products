#Requires -Version 5.1
<#
.SYNOPSIS
  p/ → q/ → sh/ ゲートチェーンを機械的に強制する

.DESCRIPTION
  Claude Code の PreToolUse フック (Bash(git push *)) から呼び出される。
  指定フェーズの前提ゲートが通過していない場合は exit 2 でブロックする。
  gate-state.json が存在しない場合: plan フェーズなら自動初期化、他は exit 2。

.PARAMETER RequiredPhase
  確認するフェーズ: plan | qa | ship

.PARAMETER SoftWarn
  指定した場合、ブロックではなく警告のみ (exit 0)

.EXAMPLE
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/lib/enforce-gate-chain.ps1 -RequiredPhase ship
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/lib/enforce-gate-chain.ps1 -RequiredPhase qa -SoftWarn
#>

param(
    [Parameter(Mandatory)]
    [ValidateSet('plan', 'qa', 'ship')]
    [string]$RequiredPhase,

    [switch]$SoftWarn
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"

if (-not (Test-Path $GateStateLib)) {
    Write-Host "[WARN] gate-state.ps1 が見つかりません: $GateStateLib" -ForegroundColor Yellow
    exit 0
}

. $GateStateLib

$gateFile = Get-GateStatePath -RepoRoot $RepoRoot

function Block-Or-Warn {
    param([string]$Message)
    Write-Host ""
    if ($SoftWarn) {
        Write-Host "[WARN] $Message" -ForegroundColor Yellow
        exit 0
    } else {
        Write-Host "[STOP] $Message" -ForegroundColor Red
        exit 2
    }
}

# gate-state.json 不在時の処理
if (-not (Test-Path $gateFile)) {
    if ($RequiredPhase -eq 'plan') {
        # 初回 p/ — 自動初期化
        $newState = New-DefaultGateState
        Write-GateState -RepoRoot $RepoRoot -State $newState
        Write-Host "[OK] gate-state.json を初期化しました (session: $($newState.session_id))" -ForegroundColor Green
        exit 0
    } else {
        Block-Or-Warn "gate-state.json が存在しません。p/ で計画を開始してください。"
    }
}

$state = Read-GateState -RepoRoot $RepoRoot

switch ($RequiredPhase) {
    'qa' {
        if (-not $state.gates.plan_passed) {
            Block-Or-Warn "p/ Plan Gate を通過していません。q/ を実行する前に p/ で計画を策定してください。"
        }
        Write-Host "[OK] Plan Gate: 通過済み" -ForegroundColor Green
    }

    'ship' {
        if (-not $state.gates.plan_passed) {
            Block-Or-Warn "p/ Plan Gate を通過していません。sh/ を実行できません。"
        }
        if (-not $state.gates.qa_passed) {
            Block-Or-Warn "q/ QA Gate を通過していません。sh/ を実行できません。`n   q/ で検証を完了してからpushしてください。"
        }
        if ($state.findings.critical -gt 0) {
            Block-Or-Warn "Critical findings が $($state.findings.critical) 件残存しています。すべて解消してから push してください。"
        }
        Write-Host "[OK] ゲートチェーン全通過: push を許可します" -ForegroundColor Green
    }

    'plan' {
        # plan フェーズは常に許可 (初期化済み)
        Write-Host "[OK] Plan gate: 初期化済み" -ForegroundColor Green
    }
}

exit 0
