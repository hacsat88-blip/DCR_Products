#Requires -Version 5.1
<#
.SYNOPSIS
  Conventional Commits から CHANGELOG を自動生成する

.DESCRIPTION
  git log を Conventional Commits 形式でパースし、バージョン別の CHANGELOG.md を生成します。
  sh/ Ship Gate 通過後に実行することを想定しています。

  生成される CHANGELOG エントリの形式:
    ## [バージョン] - YYYY-MM-DD
    ### Features
    - feat: ... (#PR)
    ### Bug Fixes
    - fix: ...
    ...

.PARAMETER RepoRoot
  リポジトリルート。省略時はスクリプトの親ディレクトリを使用。

.PARAMETER Since
  この git ref 以降のコミットを対象にする（例: v1.0.0, HEAD~20）。省略時は直近タグから。

.PARAMETER Version
  生成するエントリのバージョン文字列（例: v1.2.0）。省略時は "Unreleased"。

.PARAMETER OutputPath
  出力先。省略時は CHANGELOG.md にマージ（先頭に追記）。

.PARAMETER DryRun
  ファイルへの書き込みをせずにコンソール出力のみ行う。
#>

param(
    [string]$RepoRoot = "",
    [string]$Since    = "",
    [string]$Version  = "Unreleased",
    [string]$OutputPath = "",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $RepoRoot "CHANGELOG.md"
}

# Since 未指定時は直近タグを使用
if ([string]::IsNullOrWhiteSpace($Since)) {
    try {
        $Since = (git -C $RepoRoot describe --tags --abbrev=0 2>$null).Trim()
    } catch { $Since = "" }
}

$gitRange = if ($Since) { "${Since}..HEAD" } else { "HEAD" }

# git log をパース
$logOutput = git -C $RepoRoot log $gitRange `
    --pretty=format:"%H|%s|%D" `
    --no-merges 2>&1

$typeMap = @{
    "feat"     = "Features"
    "fix"      = "Bug Fixes"
    "docs"     = "Documentation"
    "refactor" = "Refactoring"
    "perf"     = "Performance"
    "test"     = "Tests"
    "chore"    = "Chores"
    "ci"       = "CI/CD"
    "build"    = "Build"
    "revert"   = "Reverts"
}

$sections = @{}
foreach ($type in $typeMap.Keys) { $sections[$type] = @() }

$ccPattern = '^(?<type>feat|fix|docs|refactor|perf|test|chore|ci|build|revert)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?:\s*(?<desc>.+)$'

foreach ($line in ($logOutput -split "`n")) {
    $line = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $parts = $line -split '\|', 3
    if ($parts.Count -lt 2) { continue }

    $sha     = $parts[0].Substring(0, [Math]::Min(7, $parts[0].Length))
    $subject = $parts[1].Trim()

    $m = [regex]::Match($subject, $ccPattern)
    if (-not $m.Success) { continue }

    $type     = $m.Groups['type'].Value
    $scope    = $m.Groups['scope'].Value
    $breaking = $m.Groups['breaking'].Value
    $desc     = $m.Groups['desc'].Value.Trim()

    $entry = if ($scope) { "**${scope}**: $desc ($sha)" } else { "$desc ($sha)" }
    if ($breaking) { $entry = "BREAKING: $entry" }

    if ($sections.ContainsKey($type)) {
        $sections[$type] += "- $entry"
    }
}

# CHANGELOG エントリ生成
$date   = (Get-Date -Format "yyyy-MM-dd")
$header = "## [$Version] - $date"
$body   = New-Object System.Collections.Generic.List[string]
$body.Add($header)
$body.Add("")

$hasContent = $false
foreach ($type in @("feat","fix","refactor","perf","docs","test","chore","ci","build","revert")) {
    if ($sections[$type].Count -eq 0) { continue }
    $hasContent = $true
    $body.Add("### $($typeMap[$type])")
    $sections[$type] | ForEach-Object { $body.Add($_) }
    $body.Add("")
}

if (-not $hasContent) {
    Write-Host "Conventional Commits 形式のコミットが見つかりませんでした（範囲: $gitRange）" -ForegroundColor Yellow
    exit 0
}

$newEntry = $body -join [Environment]::NewLine

if ($DryRun) {
    Write-Host $newEntry
    exit 0
}

# 既存 CHANGELOG.md に先頭追記
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
if (Test-Path $OutputPath) {
    $existing = [System.IO.File]::ReadAllText((Resolve-Path $OutputPath).Path, $utf8NoBom)
    # # Changelog ヘッダーがあれば直後に挿入、なければ先頭に追記
    if ($existing -match '^# ') {
        $lines = $existing -split "`n"
        $insertAt = 1
        while ($insertAt -lt $lines.Count -and $lines[$insertAt] -match '^\s*$') { $insertAt++ }
        $before = ($lines[0..($insertAt-1)] -join "`n")
        $after  = ($lines[$insertAt..($lines.Count-1)] -join "`n")
        $merged = $before + [Environment]::NewLine + [Environment]::NewLine + $newEntry + [Environment]::NewLine + $after
    } else {
        $merged = $newEntry + [Environment]::NewLine + $existing
    }
    [System.IO.File]::WriteAllText((Resolve-Path $OutputPath).Path, $merged, $utf8NoBom)
} else {
    $content = "# Changelog" + [Environment]::NewLine + [Environment]::NewLine + $newEntry + [Environment]::NewLine
    [System.IO.File]::WriteAllText($OutputPath, $content, $utf8NoBom)
}

Write-Host "PASS CHANGELOG を更新しました: $OutputPath" -ForegroundColor Green
Write-Host "   範囲: $gitRange -> [$Version]" -ForegroundColor Cyan
