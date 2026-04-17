<#
.SYNOPSIS
    J-Quants CLI を使ったバルクデータ取得スクリプト
.DESCRIPTION
    stock_monitor_app_next の開発・分析向けに、銘柄マスタ・日次株価・
    財務データを CSV / Parquet 形式で一括取得します。
    事前に `jquants login` か JQUANTS_API_KEY 環境変数の設定が必要です。
.PARAMETER OutputDir
    出力先ディレクトリ（デフォルト: ./data）
.PARAMETER Format
    出力フォーマット: csv または parquet（デフォルト: csv）
.PARAMETER FromDate
    取得開始日（YYYY-MM-DD）。省略時は 30 日前
.EXAMPLE
    .\fetch-bulk.ps1
    .\fetch-bulk.ps1 -OutputDir C:\data\jquants -Format parquet -FromDate 2025-01-01
#>

param(
    [string]$OutputDir = (Join-Path $PSScriptRoot "data"),
    [ValidateSet("csv", "parquet")]
    [string]$Format = "csv",
    [string]$FromDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
)

$ErrorActionPreference = "Stop"
$jquants = Join-Path $PSScriptRoot "jquants.exe"

if (-not (Test-Path $jquants)) {
    Write-Error "jquants.exe が見つかりません: $jquants"
    exit 1
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
Write-Host "出力先: $OutputDir  フォーマット: $Format  開始日: $FromDate"

function Fetch {
    param([string]$Label, [string[]]$Args, [string]$OutFile)
    $outPath = Join-Path $OutputDir $OutFile
    Write-Host "取得中: $Label → $outPath"
    & $jquants --output $Format --save $outPath @Args
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "失敗: $Label (exit $LASTEXITCODE)"
    }
}

# --- 銘柄マスタ（プラン問わず利用可）---
Fetch "銘柄マスタ" @("eq", "master") "eq-master.$Format"

# --- 取引所カレンダー ---
Fetch "取引カレンダー" @("mkt", "calendar") "mkt-calendar.$Format"

# --- 日次株価（東証全銘柄、バルク）---
Fetch "日次株価バルク" @("bulk", "daily", "--from", $FromDate) "bulk-daily.$Format"

# --- 財務データバルク ---
Fetch "財務データバルク" @("bulk", "fins") "bulk-fins.$Format"

Write-Host "完了。$OutputDir に出力されました。"
