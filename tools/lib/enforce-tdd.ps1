#Requires -Version 5.1
<#
.SYNOPSIS
  テストファイルが存在しない新規実装ファイルの作成をブロックする (TDD強制)

.DESCRIPTION
  Claude Code の PreToolUse フック (Write(src/**/*.ts) 等) から呼び出される。
  新規ファイル作成時に対応テストファイルの存在を確認する。
  既存ファイルの編集は許可する。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/lib/enforce-tdd.ps1
#>

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

# スキップ対象ファイルパターン
$SkipPatterns = @(
    '.*\bindex\.(ts|js|tsx|jsx)$',
    '.*\btypes?\.(ts|js)$',
    '.*\bconstants?\.(ts|js)$',
    '.*\bconfig\.(ts|js)$',
    '.*\.d\.ts$',
    '.*__mocks__.*',
    '.*(test|spec)\.(ts|js|tsx|jsx|py)$'
)

function Get-TargetFilePath {
    $toolInput = $env:CLAUDE_TOOL_INPUT
    if ([string]::IsNullOrWhiteSpace($toolInput)) { return $null }
    try {
        $parsed = $toolInput | ConvertFrom-Json
        return $parsed.file_path
    } catch {
        return $null
    }
}

$filePath = Get-TargetFilePath
if ([string]::IsNullOrWhiteSpace($filePath)) { exit 0 }

# 絶対パスに変換
if (-not [System.IO.Path]::IsPathRooted($filePath)) {
    $filePath = Join-Path $RepoRoot $filePath
}

# 既存ファイルの編集は許可
if (Test-Path $filePath) { exit 0 }

# スキップ対象パターンに一致する場合は許可
foreach ($pattern in $SkipPatterns) {
    if ($filePath -match $pattern) { exit 0 }
}

# 対応テストファイルを検索
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($filePath)
$ext = [System.IO.Path]::GetExtension($filePath)
$dir = [System.IO.Path]::GetDirectoryName($filePath)

$testCandidates = @(
    # 同一ディレクトリ
    (Join-Path $dir "$baseName.test$ext"),
    (Join-Path $dir "$baseName.spec$ext"),
    (Join-Path $dir "test_$baseName$ext"),
    # __tests__ サブディレクトリ
    (Join-Path $dir "__tests__" "$baseName.test$ext"),
    (Join-Path $dir "__tests__" "$baseName.spec$ext"),
    # tests/ サブディレクトリ
    (Join-Path $dir "tests" "$baseName.test$ext"),
    (Join-Path $dir "tests" "test_$baseName$ext")
)

$testExists = $testCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($testExists) {
    Write-Host "[TDD] テストファイル確認済み: $testExists" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "🔴 TDD違反: 対応テストファイルが存在しません" -ForegroundColor Red
Write-Host "   対象: $filePath" -ForegroundColor Yellow
Write-Host ""
Write-Host "   先に以下のいずれかを作成してください:" -ForegroundColor Cyan
foreach ($candidate in $testCandidates[0..2]) {
    Write-Host "     $candidate" -ForegroundColor DarkCyan
}
Write-Host ""
Write-Host "   除外したい場合: index.ts / types.ts / *.d.ts / config.ts 等は自動スキップされます" -ForegroundColor DarkGray
Write-Host ""
exit 1
