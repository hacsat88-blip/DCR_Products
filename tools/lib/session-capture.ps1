#Requires -Version 7.0
<#
.SYNOPSIS
  git push 成功後にセッションの学習内容を mem_cli.py へ記録する

.DESCRIPTION
  Claude Code の PostToolUse フック (Bash(git push *)) から呼び出される (async)。
  gate-state.json からセッション情報を読み取り、mem_cli.py quick-save で永続化する。

.EXAMPLE
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/lib/session-capture.ps1
#>

$ErrorActionPreference = 'SilentlyContinue'  # 非同期フックなのでエラーで止めない

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
. (Join-Path $PSScriptRoot "resolve-claude-memory.ps1")
$MemPaths = Get-ClaudeMemoryPaths
$MemCliPath = if ($MemPaths) { $MemPaths.MemCli } else { $null }
$Python = Get-ClaudePython
$GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"

# mem_cli.py が存在しなければスキップ
if (-not $MemCliPath -or -not $Python) { exit 0 }

$sessionSummary = "push 完了"

if (Test-Path $GateStateLib) {
    try {
        . $GateStateLib
        $gateFile = Get-GateStatePath -RepoRoot $RepoRoot
        if (Test-Path $gateFile) {
            $state = Read-GateState -RepoRoot $RepoRoot
            $sessionId = $state.session_id
            $phase = $state.phase
            $commitCount = ($state.selected_assets | Where-Object { $_ -like "commit:*" }).Count
            $sessionSummary = "session=$sessionId, phase=$phase, commits=$commitCount"
        }
    } catch { }
}

$today = Get-Date -Format 'yyyy-MM-dd'
$title = "session-capture-$today"

try {
    $result = & $Python -X utf8 $MemCliPath quick-save `
        --title $title `
        --type "project" `
        --description "git push 完了時のセッション記録" `
        --body "push 日時: $(Get-Date -Format 'yyyy-MM-dd HH:mm'), $sessionSummary" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SESSION CAPTURE] セッション学習を記録しました: $title" -ForegroundColor DarkGray
    }
} catch {
    # 非同期フックなので失敗は無視
}

exit 0
