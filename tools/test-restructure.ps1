#Requires -Version 5.1
<#
.SYNOPSIS
  Concept-zone restructure verification (structure + content preservation).
.DESCRIPTION
  新ゾーンの存在・移行ファイルの存在・統合ファイルの内容保全を検証する。
  各タスクでアサーションを追記していく。throw で fail を表現。
#>
param([string]$RepoRoot = "")
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) { $RepoRoot = Split-Path $PSScriptRoot -Parent }

function Assert-Path {
    param([string]$Rel)
    $full = Join-Path $RepoRoot $Rel
    if (-not (Test-Path $full)) { throw "MISSING required path: $Rel" }
}
function Assert-FileContains {
    param([string]$Rel, [string]$Needle)
    $full = Join-Path $RepoRoot $Rel
    if (-not (Test-Path $full)) { throw "MISSING file: $Rel" }
    $text = Get-Content $full -Raw
    if ($text -notmatch [regex]::Escape($Needle)) { throw "$Rel missing required text: $Needle" }
}

# --- Task 1: zones exist ---
$zones = @(".ai/core", ".ai/routing", ".ai/routing/gates", ".ai/routing/state",
           ".ai/catalog/playbooks", ".ai/adapters", ".ai/_generated")
foreach ($z in $zones) { Assert-Path $z }

# --- Task 2: core single-source files ---
Assert-Path ".ai/core/kernel.md"
Assert-Path ".ai/core/identity.md"
Assert-Path ".ai/core/safety.md"
Assert-Path ".ai/core/quality-floor.md"
Assert-Path ".ai/core/context-efficiency.md"
Assert-Path ".ai/core/runtime.md"
Assert-Path ".ai/core/tool-contract.md"

Write-Host "restructure test passed" -ForegroundColor Green
