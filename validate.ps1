<#
.SYNOPSIS
  DCR Products — Validate script
  rules/*.md と skills/*/SKILL.md の構造品質を検証し、
  deploy.ps1 の全ターゲット DryRun を確認する

.DESCRIPTION
  検証内容:
    1. rules/*.md (アンダースコアプレフィクス除外) — H1 見出しが存在するか
    2. skills/*/SKILL.md — YAML frontmatter に name: と description: が存在するか
    3. skills/*/SKILL.md — frontmatter 以外の本文が存在するか
    4. deploy.ps1 -DryRun が exit 0 で完了するか

.EXAMPLE
  .\validate.ps1
  .\validate.ps1 -Verbose
#>

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$RepoRoot  = $PSScriptRoot
$SourceRules  = Join-Path $RepoRoot "rules"
$SourceSkills = Join-Path $RepoRoot "skills"
$DeployScript = Join-Path $RepoRoot "deploy.ps1"
$PowerShellExe = (Get-Process -Id $PID).Path

$passed = 0
$failed = 0
$errors = @()

function Write-Ok   { param($msg) Write-Host "[OK]   $msg" -ForegroundColor Green;  $script:passed++ }
function Write-Fail { param($msg) Write-Host "[FAIL] $msg" -ForegroundColor Red;    $script:failed++; $script:errors += $msg }

Write-Host ""
Write-Host "DCR Products Validate" -ForegroundColor Cyan
Write-Host "Source: $RepoRoot"
Write-Host ""

# ─────────────────────────────────────────────
# 1. rules/*.md — H1 見出し検証
# ─────────────────────────────────────────────
Write-Host "── 1. rules/*.md H1 check ──────────────────────"
$ruleFiles = Get-ChildItem -Path $SourceRules -File -Filter *.md |
    Where-Object { $_.BaseName -notlike "_*" } |
    Sort-Object Name

foreach ($file in $ruleFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    if ($content -match '(?m)^# .+') {
        if ($Verbose) { Write-Ok "$($file.Name) — H1 found" }
        else { $script:passed++ }
    } else {
        Write-Fail "$($file.Name) — H1 missing"
    }
}
Write-Host "  rules processed: $($ruleFiles.Count)" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 2 & 3. skills/*/SKILL.md — frontmatter + body 検証
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "── 2. skills/*/SKILL.md frontmatter + body check ──"
$skillDirs = Get-ChildItem -Path $SourceSkills -Directory | Sort-Object Name

foreach ($dir in $skillDirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $skillFile)) {
        Write-Fail "$($dir.Name)/SKILL.md — file not found"
        continue
    }

    $content = Get-Content -Path $skillFile -Raw -Encoding utf8

    # frontmatter チェック
    $hasName        = $content -match '(?m)^name:\s*.+'
    $hasDescription = $content -match '(?m)^description:\s*.+'
    if (-not $hasName) {
        Write-Fail "$($dir.Name)/SKILL.md — 'name:' missing in frontmatter"
    } elseif (-not $hasDescription) {
        Write-Fail "$($dir.Name)/SKILL.md — 'description:' missing in frontmatter"
    } else {
        if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — frontmatter OK" }
        else { $script:passed++ }
    }

    # body チェック (frontmatter 終端 "---" 以降に内容があるか)
    $bodyMatch = $content -match '(?s)^---.*?---\s*\n(.+)'
    if (-not $bodyMatch -or [string]::IsNullOrWhiteSpace($Matches[1])) {
        Write-Fail "$($dir.Name)/SKILL.md — body empty"
    } else {
        if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — body OK" }
        else { $script:passed++ }
    }
}
Write-Host "  skills processed: $($skillDirs.Count)" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 4. deploy.ps1 -DryRun 全ターゲット
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "── 3. deploy.ps1 -DryRun check ─────────────────"
foreach ($target in @("vscode", "cursor", "agents")) {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $DeployScript -DryRun -Target $target 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose) { Write-Ok "deploy -Target $target — exit 0" }
        else { $script:passed++ }
    } else {
        Write-Fail "deploy -Target $target — exit $LASTEXITCODE"
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 結果サマリー
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════"
Write-Host "RESULT: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "FAILURES:" -ForegroundColor Red
    foreach ($e in $errors) { Write-Host "  - $e" -ForegroundColor Red }
}
Write-Host "══════════════════════════════════════════════════"
Write-Host ""

if ($failed -gt 0) { exit 1 } else { exit 0 }
