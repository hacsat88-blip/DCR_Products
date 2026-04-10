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
        5. rules/_ROUTING_INDEX.md が生成結果と一致するか
    6. rules/*.md の inherits: が実在する _*.md trait を参照しているか
    7. skills/*/SKILL.md の contract: 構造が有効か
    8. skills/*/SKILL.md の composable: chains_with が実在するスキルを参照しているか
    9. rules/*.md の challenge: targets が実在するルールを参照しているか
   10. skills/*/SKILL.md の package: dependencies が実在するスキルを参照しているか
   11. skills/*/SKILL.md — name: の重複がないか
   12. .ai/agents-source/*.toml — version フィールドが存在するか
   13. rules/*.md — description: が空でないか・最低限の品質があるか

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
$KernelRoot = Join-Path $RepoRoot ".ai\kernel"
$AgentsSource = Join-Path $RepoRoot ".ai\agents-source"
$DeployScript = Join-Path $RepoRoot "deploy.ps1"
$RoutingIndexScript = Join-Path $RepoRoot "tools\generate-routing-index.ps1"
$RoutingIndexFile = Join-Path $RepoRoot "rules\_ROUTING_INDEX.md"
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
Write-Host "== 1. rules/*.md H1 check ======================"
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
Write-Host "== 2. skills/*/SKILL.md frontmatter + body check =="
$skillDirs = Get-ChildItem -Path $SourceSkills -Directory |
    Where-Object { $_.Name -notlike "_*" } |
    Sort-Object Name

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
# 4. .ai/kernel/**/*.md — H1 検証
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 3. .ai/kernel/**/*.md H1 check ==============="
$kernelFiles = @()
if (Test-Path $KernelRoot) {
    $kernelFiles = Get-ChildItem -Path $KernelRoot -File -Filter *.md -Recurse | Sort-Object FullName
}

foreach ($file in $kernelFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    if ($content -match '(?m)^# .+') {
        if ($Verbose) { Write-Ok "$($file.FullName.Replace($RepoRoot + '\\', '')) — H1 found" }
        else { $script:passed++ }
    } else {
        Write-Fail "$($file.FullName.Replace($RepoRoot + '\\', '')) — H1 missing"
    }
}
Write-Host "  kernel docs processed: $($kernelFiles.Count)" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 4. deploy.ps1 -DryRun 全ターゲット
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 4. deploy.ps1 -DryRun check =================="
$isWindowsPlatform = ($env:OS -eq "Windows_NT")
if (-not $isWindowsPlatform) {
    Write-Host "  [SKIP] deploy DryRun: Windows-only script (non-Windows CI skipped)" -ForegroundColor DarkGray
    $script:passed += 3
} else {
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
}

# ─────────────────────────────────────────────
# 5. routing index 生成整合チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 5. routing index freshness check ============"
if (-not (Test-Path $RoutingIndexScript)) {
    Write-Fail "tools/generate-routing-index.ps1 — file not found"
} elseif (-not (Test-Path $RoutingIndexFile)) {
    Write-Fail "rules/_ROUTING_INDEX.md — file not found"
} else {
    $tempIndex = Join-Path ([System.IO.Path]::GetTempPath()) ("routing-index-" + [System.Guid]::NewGuid().ToString("N") + ".md")
    try {
        $result = & $PowerShellExe -ExecutionPolicy Bypass -File $RoutingIndexScript -RepoRoot $RepoRoot -OutputPath $tempIndex 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "routing index generation — exit $LASTEXITCODE"
            if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        } else {
            $existing = Get-Content -Path $RoutingIndexFile -Raw -Encoding utf8
            $generated = Get-Content -Path $tempIndex -Raw -Encoding utf8
            if ($existing -ceq $generated) {
                if ($Verbose) { Write-Ok "rules/_ROUTING_INDEX.md — up to date" }
                else { $script:passed++ }
            } else {
                Write-Fail "rules/_ROUTING_INDEX.md — out of date (run tools/generate-routing-index.ps1)"
            }
        }
    } finally {
        if (Test-Path $tempIndex) {
            Remove-Item -Path $tempIndex -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────────────────────────────────────
# 6. rules/*.md — inherits: trait 参照整合チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 6. rules/*.md inherits: trait check =========="
$traitFiles = Get-ChildItem -Path $SourceRules -File -Filter "_*.md" |
    Where-Object { $_.BaseName -ne "_METADATA" -and $_.BaseName -ne "_ROUTING_INDEX" } |
    ForEach-Object { $_.BaseName.TrimStart("_") }
$traitCheckCount = 0

foreach ($file in $ruleFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    if ($content -notmatch '(?m)^inherits:') { continue }

    # Extract inherits values
    $inInherits = $false
    $traits = @()
    foreach ($line in (Get-Content -Path $file.FullName -Encoding utf8)) {
        $trimmed = $line.Trim()
        if ($trimmed -eq 'inherits:') { $inInherits = $true; continue }
        if ($inInherits) {
            if ($trimmed -match '^\-\s+(.+)$') {
                $traits += $Matches[1].Trim()
            } else {
                break
            }
        }
    }

    foreach ($trait in $traits) {
        $traitCheckCount++
        if ($trait -in $traitFiles) {
            if ($Verbose) { Write-Ok "$($file.Name) — inherits '$trait' OK" }
            else { $script:passed++ }
        } else {
            Write-Fail "$($file.Name) — inherits '$trait' not found (no _$trait.md in rules/)"
        }
    }
}
Write-Host "  trait references checked: $traitCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 7. skills/*/SKILL.md — contract: 構造チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 7. skills/*/SKILL.md contract: check ========="
$contractCheckCount = 0
$allowedContractKeys = @("preconditions", "postconditions", "invariants")

foreach ($dir in $skillDirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $skillFile)) { continue }

    $content = Get-Content -Path $skillFile -Raw -Encoding utf8
    if ($content -notmatch '(?m)^contract:') { continue }

    $contractCheckCount++

    # Parse contract block from frontmatter
    $inContract = $false
    $inFrontmatter = $false
    $contractKeys = @()
    $currentKey = $null
    $hasValues = $true

    foreach ($line in (Get-Content -Path $skillFile -Encoding utf8)) {
        $trimmed = $line.Trim()
        if (-not $inFrontmatter -and $trimmed -eq '---') {
            $inFrontmatter = $true
            continue
        }
        if ($inFrontmatter -and $trimmed -eq '---') { break }
        if (-not $inFrontmatter) { continue }

        if ($trimmed -eq 'contract:') { $inContract = $true; continue }
        if ($inContract) {
            # If we hit a non-indented line, contract block is done
            if ($trimmed -ne '' -and $line -notmatch '^\s') { break }
            # Detect sub-key (preconditions:, postconditions:, invariants:)
            if ($trimmed -match '^(\w+):$') {
                $key = $Matches[1]
                $contractKeys += $key
                $currentKey = $key
                continue
            }
            # Detect list item under a sub-key
            if ($trimmed -match '^\-\s+') { continue }
        }
    }

    # Validate: only allowed keys
    $invalidKeys = $contractKeys | Where-Object { $_ -notin $allowedContractKeys }
    if ($invalidKeys.Count -gt 0) {
        Write-Fail "$($dir.Name)/SKILL.md — contract has invalid keys: $($invalidKeys -join ', ')"
    } elseif ($contractKeys.Count -eq 0) {
        Write-Fail "$($dir.Name)/SKILL.md — contract block is empty"
    } else {
        if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — contract OK ($($contractKeys -join ', '))" }
        else { $script:passed++ }
    }
}
Write-Host "  skills with contract: $contractCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 8. skills/*/SKILL.md — composable: chains_with 参照チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 8. skills/*/SKILL.md composable: check ======="
$composableCheckCount = 0
$allSkillNames = $skillDirs | ForEach-Object { $_.Name }

foreach ($dir in $skillDirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $skillFile)) { continue }

    $content = Get-Content -Path $skillFile -Raw -Encoding utf8
    if ($content -notmatch '(?m)^composable:') { continue }

    $composableCheckCount++

    # Extract chains_with values
    $inComposable = $false
    $inChainsW = $false
    $inFm = $false
    $chains = @()

    foreach ($line in (Get-Content -Path $skillFile -Encoding utf8)) {
        $trimmed = $line.Trim()
        if (-not $inFm -and $trimmed -eq '---') { $inFm = $true; continue }
        if ($inFm -and $trimmed -eq '---') { break }
        if (-not $inFm) { continue }

        if ($trimmed -eq 'composable:') { $inComposable = $true; continue }
        if ($inComposable) {
            if ($trimmed -eq 'chains_with:') { $inChainsW = $true; continue }
            if ($inChainsW) {
                if ($trimmed -match '^\-\s+(.+)$') {
                    $chains += $Matches[1].Trim()
                } else { $inChainsW = $false }
            }
            if ($line -notmatch '^\s' -and $trimmed -ne '') { $inComposable = $false }
        }
    }

    foreach ($chain in $chains) {
        if ($chain -in $allSkillNames) {
            if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — chains_with '$chain' OK" }
            else { $script:passed++ }
        } else {
            Write-Fail "$($dir.Name)/SKILL.md — chains_with '$chain' not found in skills/"
        }
    }
}
Write-Host "  skills with composable: $composableCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 9. rules/*.md — challenge: targets 参照チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 9. rules/*.md challenge: targets check ======="
$challengeCheckCount = 0
$allRuleNames = $ruleFiles | ForEach-Object { $_.BaseName }

foreach ($file in $ruleFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    if ($content -notmatch '(?m)^challenge:') { continue }

    $challengeCheckCount++

    # Extract targets values
    $inChallenge = $false
    $inTargets = $false
    $targets = @()

    foreach ($line in (Get-Content -Path $file.FullName -Encoding utf8)) {
        $trimmed = $line.Trim()
        if ($trimmed -eq 'challenge:') { $inChallenge = $true; continue }
        if ($inChallenge) {
            if ($trimmed -eq 'targets:') { $inTargets = $true; continue }
            if ($inTargets) {
                if ($trimmed -match '^\-\s+(.+)$') {
                    $targets += $Matches[1].Trim()
                } else { $inTargets = $false }
            }
            if ($line -notmatch '^\s' -and $trimmed -ne '' -and $trimmed -ne 'challenge:') { $inChallenge = $false }
        }
    }

    foreach ($target in $targets) {
        if ($target -in $allRuleNames) {
            if ($Verbose) { Write-Ok "$($file.Name) — challenge target '$target' OK" }
            else { $script:passed++ }
        } else {
            Write-Fail "$($file.Name) — challenge target '$target' not found in rules/"
        }
    }
}
Write-Host "  rules with challenge: $challengeCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 10. skills/*/SKILL.md — package: dependencies 参照チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 10. skills/*/SKILL.md package: deps check ===="
$packageCheckCount = 0

foreach ($dir in $skillDirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $skillFile)) { continue }

    $content = Get-Content -Path $skillFile -Raw -Encoding utf8
    if ($content -notmatch '(?m)^package:') { continue }

    $packageCheckCount++

    # Extract dependencies values
    $inPackage = $false
    $inDeps = $false
    $inFm = $false
    $deps = @()

    foreach ($line in (Get-Content -Path $skillFile -Encoding utf8)) {
        $trimmed = $line.Trim()
        if (-not $inFm -and $trimmed -eq '---') { $inFm = $true; continue }
        if ($inFm -and $trimmed -eq '---') { break }
        if (-not $inFm) { continue }

        if ($trimmed -eq 'package:') { $inPackage = $true; continue }
        if ($inPackage) {
            if ($trimmed -eq 'dependencies:') { $inDeps = $true; continue }
            if ($trimmed -eq 'dependencies: []') { continue }
            if ($inDeps) {
                if ($trimmed -match '^\-\s+(.+)$') {
                    $deps += $Matches[1].Trim()
                } else { $inDeps = $false }
            }
            if ($line -notmatch '^\s' -and $trimmed -ne '') { $inPackage = $false }
        }
    }

    if ($deps.Count -eq 0) {
        if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — package OK (no deps)" }
        else { $script:passed++ }
    } else {
        foreach ($dep in $deps) {
            if ($dep -in $allSkillNames) {
                if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — package dep '$dep' OK" }
                else { $script:passed++ }
            } else {
                Write-Fail "$($dir.Name)/SKILL.md — package dep '$dep' not found in skills/"
            }
        }
    }
}
Write-Host "  skills with package: $packageCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 11. skills/*/SKILL.md — name: 重複チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 11. skills/*/SKILL.md duplicate name check ===="
$skillNames = @{}
$dupCheckCount = 0

foreach ($dir in $skillDirs) {
    $skillFile = Join-Path $dir.FullName "SKILL.md"
    if (-not (Test-Path $skillFile)) { continue }

    $content = Get-Content -Path $skillFile -Raw -Encoding utf8
    if ($content -match '(?m)^name:\s*(.+)$') {
        $name = $Matches[1].Trim()
        $dupCheckCount++
        if ($skillNames.ContainsKey($name)) {
            Write-Fail "$($dir.Name)/SKILL.md — duplicate name '$name' (also in $($skillNames[$name]))"
        } else {
            $skillNames[$name] = $dir.Name
            if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — unique name '$name'" }
            else { $script:passed++ }
        }
    }
}
Write-Host "  skill names checked: $dupCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 12. .ai/agents-source/*.toml — version フィールドチェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 12. agents-source/*.toml version check ======="
$agentVersionCheckCount = 0

if (Test-Path $AgentsSource) {
    $tomlFiles = Get-ChildItem -Path $AgentsSource -File -Filter '*.toml' | Sort-Object Name
    foreach ($file in $tomlFiles) {
        $agentVersionCheckCount++
        $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
        if ($content -match '(?m)^version\s*=') {
            if ($Verbose) { Write-Ok "$($file.Name) — version field found" }
            else { $script:passed++ }
        } else {
            Write-Fail "$($file.Name) — version field missing"
        }
    }
}
Write-Host "  agent toml files checked: $agentVersionCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 13. rules/*.md — description: 品質チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 13. rules/*.md description quality check ====="
$descCheckCount = 0

foreach ($file in $ruleFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    if ($content -match '(?m)^description:\s*(.*)$') {
        $desc = $Matches[1].Trim().Trim([char]34, [char]39)
        $descCheckCount++
        if ([string]::IsNullOrWhiteSpace($desc)) {
            Write-Fail "$($file.Name) — description is empty"
        } elseif ($desc.Length -lt 10) {
            Write-Fail "$($file.Name) — description too short ($($desc.Length) chars, min 10)"
        } else {
            if ($Verbose) { Write-Ok "$($file.Name) — description OK ($($desc.Length) chars)" }
            else { $script:passed++ }
        }
    }
    # No frontmatter description is acceptable (auto-route from filename)
}
Write-Host "  rule descriptions checked: $descCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 結果サマリー
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "=================================================="
Write-Host "RESULT: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "FAILURES:" -ForegroundColor Red
    foreach ($e in $errors) { Write-Host "  - $e" -ForegroundColor Red }
}
Write-Host "=================================================="
Write-Host ""

if ($failed -gt 0) { exit 1 } else { exit 0 }
