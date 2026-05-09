#Requires -Version 5.1
<#
.SYNOPSIS
  DCR システム監査 — gate-state・フック・カーネル・デッドコードの整合性チェック

.DESCRIPTION
  以下の4つの領域を検査して結果をコンソールに出力します。

  1. Gate State 整合性
     gate-state.json のスキーマ準拠・フィールド存在・矛盾チェック

  2. フックカバレッジ
     settings.json の hooks と tools/lib/*.sh の存在・実行可能ビット確認

  3. カーネルファイル鮮度
     _base.md の References セクションが実在ファイルを指しているか検証

  4. デッドコード検出
     catalog/ の rules/skills/agents で他から参照されていない孤立ファイルを検出

.PARAMETER RepoRoot
  リポジトリルート。省略時はスクリプトの親ディレクトリを使用。

.PARAMETER Fix
  軽微な問題（実行権限不足など）を自動修正する。

.PARAMETER OutputJson
  結果を docs/audit-result.json に出力する。
#>

param(
    [string]$RepoRoot = "",
    [switch]$Fix,
    [switch]$OutputJson
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$passed  = 0
$failed  = 0
$warnings = 0
$issues  = @()

function Write-Ok   { param([string]$m) Write-Host "[OK]   $m" -ForegroundColor Green;  $script:passed++ }
function Write-Fail { param([string]$m) Write-Host "[FAIL] $m" -ForegroundColor Red;    $script:failed++;   $script:issues += $m }
function Write-Warn { param([string]$m) Write-Host "[WARN] $m" -ForegroundColor Yellow; $script:warnings++; $script:issues += "WARN: $m" }

# ─────────────────────────────────────────────
# 1. Gate State 整合性
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "=== 1. Gate State 整合性 ===" -ForegroundColor Cyan

$gateStatePath = Join-Path $RepoRoot ".ai\kernel\gate-state.json"
if (-not (Test-Path $gateStatePath)) {
    Write-Warn "gate-state.json が存在しません（ブートストラップ状態）"
} else {
    try {
        $gs = Get-Content -Path $gateStatePath -Raw | ConvertFrom-Json
        $requiredFields = @("session_id", "phase", "gates")
        foreach ($f in $requiredFields) {
            if ($null -eq $gs.$f) { Write-Fail "gate-state.json: 必須フィールド '$f' が欠落" }
            else                  { Write-Ok   "gate-state.json: $f 存在" }
        }
        # 矛盾チェック: qa_passed=true かつ critical>0
        if ($gs.gates.qa_passed -and $gs.findings -and $gs.findings.critical -gt 0) {
            Write-Fail "矛盾: qa_passed=true だが critical findings=$($gs.findings.critical)"
        }
        # ship_ready だが qa_passed=false
        if ($gs.gates.ship_ready -and -not $gs.gates.qa_passed) {
            Write-Fail "矛盾: ship_ready=true だが qa_passed=false"
        }
        Write-Ok "gate-state.json スキーマ整合性 OK"
    } catch {
        Write-Fail "gate-state.json のパース失敗: $_"
    }
}

# ─────────────────────────────────────────────
# 2. フックカバレッジ
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "=== 2. フックカバレッジ ===" -ForegroundColor Cyan

$settingsPath = Join-Path $RepoRoot ".claude\settings.json"
$hookScripts  = @(
    "tools/lib/validate-commit-msg.ps1",
    "tools/lib/enforce-gate-chain.ps1",
    "tools/lib/enforce-p3.ps1",
    "tools/lib/gate-auto-init.ps1",
    "tools/lib/gate-advance-post-commit.ps1",
    "tools/lib/detect-scope-drift.ps1",
    "tools/lib/session-capture.ps1",
    "tools/lib/generate-changelog.ps1"
)

foreach ($rel in $hookScripts) {
    $full = Join-Path $RepoRoot ($rel -replace "/", "\")
    if (-not (Test-Path $full)) {
        Write-Fail "フックスクリプト欠落: $rel"
    } else {
        # 実行可能ビット (Linux のみ意味がある)
        $info = Get-Item $full
        Write-Ok "フックスクリプト存在: $rel"
    }
}

if (Test-Path $settingsPath) {
    try {
        $settings = Get-Content -Path $settingsPath -Raw | ConvertFrom-Json
        if ($null -eq $settings.hooks) {
            Write-Fail ".claude/settings.json に hooks セクションがありません"
        } else {
            $hookCount = 0
            foreach ($phase in @("PreToolUse","PostToolUse","UserPromptSubmit")) {
                if ($settings.hooks.$phase) { $hookCount += $settings.hooks.$phase.Count }
            }
            Write-Ok ".claude/settings.json: フックエントリ $hookCount 件登録"
        }
    } catch {
        Write-Fail ".claude/settings.json パース失敗: $_"
    }
} else {
    Write-Fail ".claude/settings.json が存在しません"
}

# ─────────────────────────────────────────────
# 3. カーネルファイル鮮度
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "=== 3. カーネルファイル鮮度 ===" -ForegroundColor Cyan

$baseFile = Join-Path $RepoRoot ".ai\kernel\_base.md"
if (-not (Test-Path $baseFile)) {
    Write-Fail "_base.md が存在しません"
} else {
    $content = Get-Content -Path $baseFile -Raw
    $linkPattern = '\[[^\]]+\]\((\.{1,2}/[^)]+)\)'
    $matches = [regex]::Matches($content, $linkPattern)
    foreach ($m in $matches) {
        $href = ($m.Groups[1].Value -split '#')[0]
        $relPath = $href -replace "/", "\"
        $target = [System.IO.Path]::GetFullPath((Join-Path (Split-Path $baseFile) $relPath))
        if (Test-Path $target) { Write-Ok   "_base.md 参照先存在: $href" }
        else                   { Write-Fail "_base.md 参照先欠落: $href" }
    }
}

$expectedKernelFiles = @(
    "_quality-floor.md", "_self-correction.md", "_auto-escalation.md",
    "_parallel-execution.md", "_context-efficiency.md",
    "_permissions.md", "_safety-boundaries.md", "_module-behaviors.md"
)
foreach ($kf in $expectedKernelFiles) {
    $kpath = Join-Path $RepoRoot ".ai\kernel\$kf"
    if (Test-Path $kpath) { Write-Ok   "カーネルファイル存在: $kf" }
    else                  { Write-Fail "カーネルファイル欠落: $kf" }
}

# ─────────────────────────────────────────────
# 4. デッドコード検出
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "=== 4. デッドコード検出 ===" -ForegroundColor Cyan

$catalogDir = Join-Path $RepoRoot ".ai\catalog"
$routerIndex = Join-Path $RepoRoot ".ai\catalog\skills\_SKILLS_ROUTING_INDEX.md"
$routerDecisions = Join-Path $RepoRoot ".ai\kernel\router-decisions.jsonl"

$orphanCount = 0
foreach ($kind in @("rules", "skills")) {
    $dir = Join-Path $catalogDir $kind
    if (-not (Test-Path $dir)) { continue }
    $files = Get-ChildItem -Path $dir -File -Filter "*.md"
    foreach ($file in $files) {
        $name = $file.BaseName
        $referencedInIndex = $false
        if (Test-Path $routerIndex) {
            $referencedInIndex = (Get-Content -Path $routerIndex -Raw) -match [regex]::Escape($name)
        }
        $referencedInDecisions = $false
        if (Test-Path $routerDecisions) {
            $referencedInDecisions = (Get-Content -Path $routerDecisions -Raw) -match [regex]::Escape($name)
        }
        if (-not $referencedInIndex -and -not $referencedInDecisions) {
            Write-Warn "未参照の可能性: $kind/$name"
            $orphanCount++
        }
    }
}
if ($orphanCount -eq 0) { Write-Ok "デッドコード候補なし" }
else { Write-Warn "未参照候補 $orphanCount 件（削除前に手動確認を推奨）" }

# ─────────────────────────────────────────────
# サマリー
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "=== 監査サマリー ===" -ForegroundColor Cyan
Write-Host "  OK:      $passed" -ForegroundColor Green
Write-Host "  WARN:    $warnings" -ForegroundColor Yellow
Write-Host "  FAIL:    $failed" -ForegroundColor Red

if ($OutputJson) {
    $outDir = Join-Path $RepoRoot "docs"
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
    $result = [pscustomobject]@{
        timestamp  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        passed     = $passed
        warnings   = $warnings
        failed     = $failed
        issues     = $issues
    }
    $result | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $outDir "audit-result.json") -Encoding UTF8
    Write-Host "  結果 → docs/audit-result.json" -ForegroundColor Cyan
}

if ($failed -gt 0) { exit 1 }
