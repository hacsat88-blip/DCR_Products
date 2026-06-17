#Requires -Version 7.0
<#
.SYNOPSIS
  新PCでの冪等セットアップ単一入口。「フォルダ移動 → このスクリプト1回」で復元する。
.DESCRIPTION
  1) git hooks パス設定  2) deploy で entrypoint/ミラー再生成
  3) 外部依存ゼロ自己検査（external-footprint.md と照合）
#>
param([switch]$DryRun)
$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Write-Host "=== bootstrap: $RepoRoot ===" -ForegroundColor Cyan

# 1) git hooks
$hooks = Join-Path $RepoRoot "tools\install-git-hooks.ps1"
if (Test-Path $hooks) {
    if ($DryRun) { Write-Host "[dry] would run install-git-hooks.ps1" }
    else { & $hooks }
} else { Write-Warning "install-git-hooks.ps1 not found" }

# 2) deploy（entrypoint + mirror 再生成）
$deploy = Join-Path $RepoRoot "deploy.ps1"
if ($DryRun) { Write-Host "[dry] would run deploy.ps1" }
else { & $deploy }

# 3) 外部依存の自己検査
$footprint = Join-Path $RepoRoot ".ai\adapters\external-footprint.md"
if (Test-Path $footprint) {
    Write-Host "[OK] external-footprint ledger present" -ForegroundColor Green
} else {
    throw "external-footprint.md missing — portability ledger required"
}
Write-Host "=== bootstrap done ===" -ForegroundColor Cyan
