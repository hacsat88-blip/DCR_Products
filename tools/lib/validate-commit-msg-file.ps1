#Requires -Version 7.0
<#
.SYNOPSIS
  Conventional Commits 規約に従ってコミットメッセージファイルを検証する

.DESCRIPTION
  git の commit-msg フックから呼び出される。git が渡すメッセージファイル
  (.git/COMMIT_EDITMSG) のパスを受け取り、違反なら exit 2 でブロックする。

  Claude Code の PreToolUse フック版は tools/lib/validate-commit-msg.ps1。
  こちらは git ネイティブなので、Claude / Codex / Cursor / 手動 git の
  どの経路からコミットしても効く。

.EXAMPLE
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/lib/validate-commit-msg-file.ps1 "$1"
#>
param(
    [Parameter(Mandatory)]
    [string]$MessagePath
)

$ErrorActionPreference = 'Stop'

# Conventional Commits パターン (validate-commit-msg.ps1 と同一)
$ConventionalPattern = '^(feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert)(\(.{1,30}\))?(!)?: .{1,72}$'

if (-not (Test-Path -LiteralPath $MessagePath)) { exit 0 }

$lines = Get-Content -LiteralPath $MessagePath -Encoding utf8
# コメント行と空行を除いた最初の行が subject
$subject = ($lines | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' } | Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace($subject)) { exit 0 }
# merge / revert / fixup は git が生成するのでスキップ
if ($subject -match '^(Merge |Revert "|fixup!|squash!)') { exit 0 }

if ($subject.Trim() -notmatch $ConventionalPattern) {
    Write-Host ""
    Write-Host "[STOP] コミットメッセージが Conventional Commits 規約に違反しています" -ForegroundColor Red
    Write-Host ""
    Write-Host "   入力: $($subject.Trim())" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   正しい形式: <type>(<scope>)?: <description>" -ForegroundColor Cyan
    Write-Host "   使用可能な type:" -ForegroundColor Cyan
    Write-Host "     feat, fix, docs, style, refactor, test, chore, ci, perf, build, revert" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   例: feat: ユーザー認証機能を追加" -ForegroundColor Green
    Write-Host "       fix(auth): ログインエラーを修正" -ForegroundColor Green
    Write-Host ""
    exit 2
}

exit 0
