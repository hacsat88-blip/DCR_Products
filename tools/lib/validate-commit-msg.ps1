#Requires -Version 5.1
<#
.SYNOPSIS
  Conventional Commits 規約に従ってコミットメッセージを検証する

.DESCRIPTION
  Claude Code の PreToolUse フック (Bash(git commit *)) から呼び出される。
  $env:CLAUDE_TOOL_INPUT から JSON を読み取り、-m 引数を抽出して検証する。
  違反なら exit 1 でコミットをブロックする。

.EXAMPLE
  # hooks から呼び出し
  powershell -ExecutionPolicy Bypass -File tools/lib/validate-commit-msg.ps1
#>

$ErrorActionPreference = 'Stop'

# Conventional Commits パターン
$ConventionalPattern = '^(feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert)(\(.{1,30}\))?(!)?: .{1,72}$'

function Get-CommitMessage {
    # CLAUDE_TOOL_INPUT から JSON を読み取る
    $toolInput = $env:CLAUDE_TOOL_INPUT
    if ([string]::IsNullOrWhiteSpace($toolInput)) {
        return $null
    }

    try {
        $parsed = $toolInput | ConvertFrom-Json
        $command = $parsed.command
        if ([string]::IsNullOrWhiteSpace($command)) {
            return $null
        }

        # -m "message" または -m 'message' を抽出
        if ($command -match '-m\s+"([^"]+)"') {
            return $Matches[1]
        }
        if ($command -match "-m\s+'([^']+)'") {
            return $Matches[1]
        }
        # --message= 形式
        if ($command -match '--message=["'']?([^"'']+)["'']?') {
            return $Matches[1]
        }

        return $null
    } catch {
        # JSON パース失敗は無視してスキップ
        return $null
    }
}

$msg = Get-CommitMessage

if ([string]::IsNullOrWhiteSpace($msg)) {
    # メッセージ取得不可 (--amend, -F, COMMIT_EDITMSG 経由等) はスキップ
    exit 0
}

# 先頭行だけ検証
$subject = ($msg -split "`n")[0].Trim()

if ($subject -notmatch $ConventionalPattern) {
    Write-Host ""
    Write-Host "🔴 コミットメッセージが Conventional Commits 規約に違反しています" -ForegroundColor Red
    Write-Host ""
    Write-Host "   入力: $subject" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   正しい形式: <type>(<scope>)?: <description>" -ForegroundColor Cyan
    Write-Host "   使用可能な type:" -ForegroundColor Cyan
    Write-Host "     feat, fix, docs, style, refactor, test, chore, ci, perf, build, revert" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   例: feat: ユーザー認証機能を追加" -ForegroundColor Green
    Write-Host "       fix(auth): ログインエラーを修正" -ForegroundColor Green
    Write-Host "       feat!: 破壊的変更を含む新機能" -ForegroundColor Green
    Write-Host ""
    exit 1
}

Write-Host "[OK] コミットメッセージ規約: 適合" -ForegroundColor Green
exit 0
