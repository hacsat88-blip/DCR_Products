<#
.SYNOPSIS
  DCR Products — Validate script
    .ai/catalog/rules/*.md と .ai/catalog/skills/*/SKILL.md の構造品質を検証し、
  deploy.ps1 の全ターゲット DryRun を確認する

.DESCRIPTION
  検証内容:
    1. .ai/catalog/rules/*.md (アンダースコアプレフィクス除外) — H1 見出しが存在するか
    2. .ai/catalog/skills/*/SKILL.md — YAML frontmatter に name: と description: が存在するか
    3. .ai/catalog/skills/*/SKILL.md — frontmatter 以外の本文が存在するか
    4. deploy.ps1 -DryRun が exit 0 で完了するか
    5. catalog rules の _ROUTING_INDEX.md が生成結果と一致するか
    6. .ai/catalog/rules/*.md の inherits: が実在する _*.md trait を参照しているか
    7. .ai/catalog/skills/*/SKILL.md の contract: 構造が有効か
    8. .ai/catalog/skills/*/SKILL.md の composable: chains_with が実在するスキルを参照しているか
    9. .ai/catalog/rules/*.md の challenge: targets が実在するルールを参照しているか
   10. .ai/catalog/skills/*/SKILL.md の package: dependencies が実在するスキルを参照しているか
   11. .ai/catalog/skills/*/SKILL.md — name: の重複がないか
   12. .ai/catalog/rules/*.md と .ai/catalog/skills/*/SKILL.md の basename collision がないか
   13. .ai/catalog/rules/*.md の routing_category が許可集合に含まれるか
   14. catalog agents-source/*.toml — version フィールドが存在するか
   15. .ai/catalog/rules/*.md — description: が空でないか・最低限の品質があるか
   16. external Superpowers checkout の drift がないか
   17. shared book contract が有効か
   18. routing fixture が一貫しているか
   19. proposal reply vocabulary の V5 自然語返答が一貫しているか
   20. routing entrypoint contract の V6 CLI/IDE 生成物が一貫しているか
   21. router decision report の V3 見える化が一貫しているか
   22. reduction advisor の V7 実ログ削減判断が一貫しているか
   23. shadow routing trial の V7.1 実ログ収集が一貫しているか
   24. display policy advisor の V8 表示抑制判断が一貫しているか
   25. display policy proposal の V9 承認待ち変換が一貫しているか
   26. bundle advisor の V10 親候補提案が一貫しているか
   27. bundle proposal の V10.1 承認待ち変換が一貫しているか
   28. PowerShell 実行ファイルに絵文字・装飾記号が含まれていないか

.EXAMPLE
  pwsh -ExecutionPolicy Bypass -File .\validate.ps1
  pwsh -ExecutionPolicy Bypass -File .\validate.ps1 -Verbose
#>

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
$CatalogPaths = Join-Path $RepoRoot "tools\lib\catalog-paths.ps1"
. $CatalogPaths
$SourceRules = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$SourceSkills = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"
$KernelRoot = Join-Path $RepoRoot ".ai\kernel"
$EnvironmentRoot = Join-Path $RepoRoot ".ai\environments"
$AgentsSource = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"
$DeployScript = Join-Path $RepoRoot "deploy.ps1"
$RoutingIndexScript = Join-Path $RepoRoot "tools\generate-routing-index.ps1"
$ExternalSuperpowersCheckScript = Join-Path $RepoRoot "tools\check-external-superpowers.ps1"
$SharedBookCheckScript = Join-Path $RepoRoot "tools\validate-shared-book.ps1"
$RoutingAccuracyScript = Join-Path $RepoRoot "tools\eval-routing-accuracy.ps1"
$ProposalReplyVocabularyTestScript = Join-Path $RepoRoot "tools\test-proposal-reply-vocabulary.ps1"
$RoutingEntrypointContractTestScript = Join-Path $RepoRoot "tools\test-routing-entrypoint-contract.ps1"
$RouterDecisionReportTestScript = Join-Path $RepoRoot "tools\test-router-decisions-report.ps1"
$ReductionAdvisorTestScript = Join-Path $RepoRoot "tools\test-reduction-advisor.ps1"
$ShadowRoutingTrialTestScript = Join-Path $RepoRoot "tools\test-shadow-routing-trial.ps1"
$DisplayPolicyAdvisorTestScript = Join-Path $RepoRoot "tools\test-display-policy-advisor.ps1"
$DisplayPolicyProposalTestScript = Join-Path $RepoRoot "tools\test-display-policy-proposal.ps1"
$BundleAdvisorTestScript = Join-Path $RepoRoot "tools\test-bundle-advisor.ps1"
$BundleProposalTestScript = Join-Path $RepoRoot "tools\test-bundle-proposal.ps1"
$RoutingIndexFile = Join-Path $SourceRules "_ROUTING_INDEX.md"
function Resolve-DcrPowerShellExe {
    $pwshCommand = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwshCommand -and $pwshCommand.Source) {
        return $pwshCommand.Source
    }

    return (Get-Process -Id $PID).Path
}

$PowerShellExe = Resolve-DcrPowerShellExe

$passed = 0
$failed = 0
$errors = @()
$AllowedRuleSkillBasenameCollisions = @()
$AllowedRoutingCategories = @("growth", "documents", "ui-ux", "devops", "governance")

function Write-Ok { param($msg) Write-Host "[OK]   $msg" -ForegroundColor Green; $script:passed++ }
function Write-Fail { param($msg) Write-Host "[FAIL] $msg" -ForegroundColor Red; $script:failed++; $script:errors += $msg }

Write-Host ""
Write-Host "DCR Products Validate" -ForegroundColor Cyan
Write-Host "Source: $RepoRoot"
Write-Host ""

# ─────────────────────────────────────────────
# 1. catalog rules/*.md — H1 見出し検証
# ─────────────────────────────────────────────
Write-Host "== 1. catalog rules/*.md H1 check =============="
$ruleFiles = Get-ChildItem -Path $SourceRules -File -Filter *.md |
Where-Object { $_.BaseName -notlike "_*" } |
Sort-Object Name

foreach ($file in $ruleFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    if ($content -match '(?m)^# .+') {
        if ($Verbose) { Write-Ok "$($file.Name) — H1 found" }
        else { $script:passed++ }
    }
    else {
        Write-Fail "$($file.Name) — H1 missing"
    }
}
Write-Host "  rules processed: $($ruleFiles.Count)" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 2 & 3. catalog skills/*/SKILL.md — frontmatter + body 検証
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 2. catalog skills/*/SKILL.md check =========="
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
    $hasName = $content -match '(?m)^name:\s*.+'
    $hasDescription = $content -match '(?m)^description:\s*.+'
    if (-not $hasName) {
        Write-Fail "$($dir.Name)/SKILL.md — 'name:' missing in frontmatter"
    }
    elseif (-not $hasDescription) {
        Write-Fail "$($dir.Name)/SKILL.md — 'description:' missing in frontmatter"
    }
    else {
        if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — frontmatter OK" }
        else { $script:passed++ }
    }

    # body チェック (frontmatter 終端 "---" 以降に内容があるか)
    $bodyMatch = $content -match '(?s)^---.*?---\s*\n(.+)'
    if (-not $bodyMatch -or [string]::IsNullOrWhiteSpace($Matches[1])) {
        Write-Fail "$($dir.Name)/SKILL.md — body empty"
    }
    else {
        if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — body OK" }
        else { $script:passed++ }
    }
}
Write-Host "  skills processed: $($skillDirs.Count)" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 4. .ai/kernel/**/*.md + .ai/environments/**/*.md — H1 検証
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 3. .ai/kernel + .ai/environments H1 check ==="
$kernelFiles = @()
if (Test-Path $KernelRoot) {
    $kernelFiles = Get-ChildItem -Path $KernelRoot -File -Filter *.md -Recurse | Sort-Object FullName
}
$environmentFiles = @()
if (Test-Path $EnvironmentRoot) {
    $environmentFiles = Get-ChildItem -Path $EnvironmentRoot -File -Filter *.md -Recurse | Sort-Object FullName
}

foreach ($file in @($kernelFiles + $environmentFiles)) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    if ($content -match '(?m)^# .+') {
        if ($Verbose) { Write-Ok "$($file.FullName.Replace($RepoRoot + '\\', '')) — H1 found" }
        else { $script:passed++ }
    }
    else {
        Write-Fail "$($file.FullName.Replace($RepoRoot + '\\', '')) — H1 missing"
    }
}
Write-Host "  kernel docs processed: $($kernelFiles.Count)" -ForegroundColor DarkGray
Write-Host "  environment docs processed: $($environmentFiles.Count)" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 4. deploy.ps1 -DryRun 全ターゲット
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 4. deploy.ps1 -DryRun check =================="
$isWindowsPlatform = ($env:OS -eq "Windows_NT")
$deployDryRunTargets = @("vscode", "cursor", "agents", "dcr")
if (-not $isWindowsPlatform) {
    Write-Host "  [SKIP] deploy DryRun: Windows-only script (non-Windows CI skipped)" -ForegroundColor DarkGray
    $script:passed += $deployDryRunTargets.Count
}
else {
    foreach ($target in $deployDryRunTargets) {
        $result = & $PowerShellExe -ExecutionPolicy Bypass -File $DeployScript -DryRun -Target $target 2>&1
        if ($LASTEXITCODE -eq 0) {
            if ($Verbose) { Write-Ok "deploy -Target $target — exit 0" }
            else { $script:passed++ }
        }
        else {
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
}
elseif (-not (Test-Path $RoutingIndexFile)) {
    Write-Fail ".ai/catalog/rules/_ROUTING_INDEX.md — file not found"
}
else {
    $tempIndex = Join-Path ([System.IO.Path]::GetTempPath()) ("routing-index-" + [System.Guid]::NewGuid().ToString("N") + ".md")
    try {
        $result = & $PowerShellExe -ExecutionPolicy Bypass -File $RoutingIndexScript -RepoRoot $RepoRoot -OutputPath $tempIndex 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "routing index generation — exit $LASTEXITCODE"
            if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        }
        else {
            $existing = (Get-Content -Path $RoutingIndexFile -Raw -Encoding utf8) -replace "`r`n", "`n"
            $generated = (Get-Content -Path $tempIndex -Raw -Encoding utf8) -replace "`r`n", "`n"
            if ($existing -ceq $generated) {
                if ($Verbose) { Write-Ok ".ai/catalog/rules/_ROUTING_INDEX.md — up to date" }
                else { $script:passed++ }
            }
            else {
                Write-Fail ".ai/catalog/rules/_ROUTING_INDEX.md — out of date (run tools/generate-routing-index.ps1)"
            }
        }
    }
    finally {
        if (Test-Path $tempIndex) {
            Remove-Item -Path $tempIndex -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────────────────────────────────────
# 6. catalog rules/*.md — inherits: trait 参照整合チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 6. catalog rules/*.md trait check =========="
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
            }
            else {
                break
            }
        }
    }

    foreach ($trait in $traits) {
        $traitCheckCount++
        if ($trait -in $traitFiles) {
            if ($Verbose) { Write-Ok "$($file.Name) — inherits '$trait' OK" }
            else { $script:passed++ }
        }
        else {
            Write-Fail "$($file.Name) — inherits '$trait' not found (no _$trait.md in .ai/catalog/rules/)"
        }
    }
}
Write-Host "  trait references checked: $traitCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 7. catalog skills/*/SKILL.md — contract: 構造チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 7. catalog skills/*/SKILL.md contract ======"
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
    }
    elseif ($contractKeys.Count -eq 0) {
        Write-Fail "$($dir.Name)/SKILL.md — contract block is empty"
    }
    else {
        if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — contract OK ($($contractKeys -join ', '))" }
        else { $script:passed++ }
    }
}
Write-Host "  skills with contract: $contractCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 8. catalog skills/*/SKILL.md — composable: chains_with 参照チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 8. catalog skills/*/SKILL.md compose ======"
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
                }
                else { $inChainsW = $false }
            }
            if ($line -notmatch '^\s' -and $trimmed -ne '') { $inComposable = $false }
        }
    }

    foreach ($chain in $chains) {
        if ($chain -in $allSkillNames) {
            if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — chains_with '$chain' OK" }
            else { $script:passed++ }
        }
        else {
            Write-Fail "$($dir.Name)/SKILL.md — chains_with '$chain' not found in .ai/catalog/skills/"
        }
    }
}
Write-Host "  skills with composable: $composableCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 9. catalog rules/*.md — challenge: targets 参照チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 9. catalog rules/*.md challenge check ======"
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
                }
                else { $inTargets = $false }
            }
            if ($line -notmatch '^\s' -and $trimmed -ne '' -and $trimmed -ne 'challenge:') { $inChallenge = $false }
        }
    }

    foreach ($target in $targets) {
        if ($target -in $allRuleNames) {
            if ($Verbose) { Write-Ok "$($file.Name) — challenge target '$target' OK" }
            else { $script:passed++ }
        }
        else {
            Write-Fail "$($file.Name) — challenge target '$target' not found in .ai/catalog/rules/"
        }
    }
}
Write-Host "  rules with challenge: $challengeCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 10. catalog skills/*/SKILL.md — package: dependencies 参照チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 10. catalog skills/*/SKILL.md package ====="
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
                }
                else { $inDeps = $false }
            }
            if ($line -notmatch '^\s' -and $trimmed -ne '') { $inPackage = $false }
        }
    }

    if ($deps.Count -eq 0) {
        if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — package OK (no deps)" }
        else { $script:passed++ }
    }
    else {
        foreach ($dep in $deps) {
            if ($dep -in $allSkillNames) {
                if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — package dep '$dep' OK" }
                else { $script:passed++ }
            }
            else {
                Write-Fail "$($dir.Name)/SKILL.md — package dep '$dep' not found in .ai/catalog/skills/"
            }
        }
    }
}
Write-Host "  skills with package: $packageCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 11. catalog skills/*/SKILL.md — name: 重複チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 11. catalog skills/*/SKILL.md names ======"
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
        }
        else {
            $skillNames[$name] = $dir.Name
            if ($Verbose) { Write-Ok "$($dir.Name)/SKILL.md — unique name '$name'" }
            else { $script:passed++ }
        }
    }
}
Write-Host "  skill names checked: $dupCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 12. catalog rules/*.md / skills/*/SKILL.md — basename collision チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 12. rule/skill basename collision check ===="
$basenameCollisionCheckCount = 0
$ruleBasenames = $ruleFiles | ForEach-Object { $_.BaseName }
$skillBasenames = $skillDirs | ForEach-Object { $_.Name }
$collisions = $ruleBasenames | Where-Object { $_ -in $skillBasenames } | Sort-Object -Unique

if ($collisions.Count -eq 0) {
    if ($Verbose) { Write-Ok ".ai/catalog/rules/ and .ai/catalog/skills/ — no basename collisions" }
    else { $script:passed++ }
}
else {
    foreach ($name in $collisions) {
        $basenameCollisionCheckCount++
        if ($name -in $AllowedRuleSkillBasenameCollisions) {
            if ($Verbose) { Write-Ok "basename '$name' — allowlisted collision" }
            else { $script:passed++ }
        }
        else {
            Write-Fail "basename '$name' exists in both .ai/catalog/rules/ and .ai/catalog/skills/"
        }
    }
}
Write-Host "  basename collisions checked: $($basenameCollisionCheckCount)" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 13. catalog rules/*.md — routing_category 許可値チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 13. catalog rules/*.md routing check ====="
$routingCategoryCheckCount = 0

foreach ($file in $ruleFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    if ($content -match '(?m)^routing_category:\s*(.+)$') {
        $routingCategoryCheckCount++
        $routingCategory = $Matches[1].Trim().Trim([char]34, [char]39)
        if ($routingCategory -in $AllowedRoutingCategories) {
            if ($Verbose) { Write-Ok "$($file.Name) — routing_category '$routingCategory' OK" }
            else { $script:passed++ }
        }
        else {
            Write-Fail "$($file.Name) — routing_category '$routingCategory' is not in allowed set: $($AllowedRoutingCategories -join ', ')"
        }
    }
}
Write-Host "  rule routing categories checked: $routingCategoryCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 14. .ai/catalog/agents-source/*.toml — version フィールドチェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 14. agents-source/*.toml version check ======="
$agentVersionCheckCount = 0

if (Test-Path $AgentsSource) {
    $tomlFiles = Get-ChildItem -Path $AgentsSource -File -Filter '*.toml' | Sort-Object Name
    foreach ($file in $tomlFiles) {
        $agentVersionCheckCount++
        $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
        if ($content -match '(?m)^version\s*=') {
            if ($Verbose) { Write-Ok "$($file.Name) — version field found" }
            else { $script:passed++ }
        }
        else {
            Write-Fail "$($file.Name) — version field missing"
        }
    }
}
Write-Host "  agent toml files checked: $agentVersionCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 15. catalog rules/*.md — description: 品質チェック
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 15. catalog rules/*.md descriptions ====="
$descCheckCount = 0

foreach ($file in $ruleFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding utf8
    if ($content -match '(?m)^description:\s*(.*)$') {
        $desc = $Matches[1].Trim().Trim([char]34, [char]39)
        $descCheckCount++
        if ([string]::IsNullOrWhiteSpace($desc)) {
            Write-Fail "$($file.Name) — description is empty"
        }
        elseif ($desc.Length -lt 10) {
            Write-Fail "$($file.Name) — description too short ($($desc.Length) chars, min 10)"
        }
        else {
            if ($Verbose) { Write-Ok "$($file.Name) — description OK ($($desc.Length) chars)" }
            else { $script:passed++ }
        }
    }
    # No frontmatter description is acceptable (auto-route from filename)
}
Write-Host "  rule descriptions checked: $descCheckCount" -ForegroundColor DarkGray

# ─────────────────────────────────────────────
# 16. external Superpowers checkout — drift check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 16. external Superpowers drift check ========"
if (-not (Test-Path $ExternalSuperpowersCheckScript)) {
    Write-Fail "tools/check-external-superpowers.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $ExternalSuperpowersCheckScript 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "external Superpowers checkout — drift detected"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 17. shared book contract + thin environment check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 17. shared book contract check =============="
if (-not (Test-Path $SharedBookCheckScript)) {
    Write-Fail "tools/validate-shared-book.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $SharedBookCheckScript -RepoRoot $RepoRoot 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "shared book contract — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 18. routing fixture consistency check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 18. routing fixture consistency check ======="
if (-not (Test-Path $RoutingAccuracyScript)) {
    Write-Fail "tools/eval-routing-accuracy.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $RoutingAccuracyScript 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "routing fixture consistency — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 19. proposal reply vocabulary V5 smoke check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 19. proposal reply vocabulary check ========"
if (-not (Test-Path $ProposalReplyVocabularyTestScript)) {
    Write-Fail "tools/test-proposal-reply-vocabulary.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $ProposalReplyVocabularyTestScript -RepoRoot $RepoRoot 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "proposal reply vocabulary V5 smoke — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 20. routing entrypoint contract V6 smoke check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 20. routing entrypoint contract check ======"
if (-not (Test-Path $RoutingEntrypointContractTestScript)) {
    Write-Fail "tools/test-routing-entrypoint-contract.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $RoutingEntrypointContractTestScript -RepoRoot $RepoRoot 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "routing entrypoint contract V6 smoke — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 21. router decisions report V3 smoke check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 21. router decision report check ==========="
if (-not (Test-Path $RouterDecisionReportTestScript)) {
    Write-Fail "tools/test-router-decisions-report.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $RouterDecisionReportTestScript -RepoRoot $RepoRoot 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "router decision report V3 smoke — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 22. reduction advisor V7 smoke check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 22. reduction advisor check ================"
if (-not (Test-Path $ReductionAdvisorTestScript)) {
    Write-Fail "tools/test-reduction-advisor.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $ReductionAdvisorTestScript -RepoRoot $RepoRoot 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "reduction advisor V7 smoke — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 23. shadow routing trial V7.1 smoke check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 23. shadow routing trial check ============="
if (-not (Test-Path $ShadowRoutingTrialTestScript)) {
    Write-Fail "tools/test-shadow-routing-trial.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $ShadowRoutingTrialTestScript -RepoRoot $RepoRoot 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "shadow routing trial V7.1 smoke — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 24. display policy advisor V8 smoke check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 24. display policy advisor check =========="
if (-not (Test-Path $DisplayPolicyAdvisorTestScript)) {
    Write-Fail "tools/test-display-policy-advisor.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $DisplayPolicyAdvisorTestScript -RepoRoot $RepoRoot 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "display policy advisor V8 smoke — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 25. display policy proposal V9 smoke check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 25. display policy proposal check ========="
if (-not (Test-Path $DisplayPolicyProposalTestScript)) {
    Write-Fail "tools/test-display-policy-proposal.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $DisplayPolicyProposalTestScript -RepoRoot $RepoRoot 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "display policy proposal V9 smoke — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 26. bundle advisor V10 smoke check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 26. bundle advisor check =================="
if (-not (Test-Path $BundleAdvisorTestScript)) {
    Write-Fail "tools/test-bundle-advisor.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $BundleAdvisorTestScript -RepoRoot $RepoRoot 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "bundle advisor V10 smoke — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 27. bundle proposal V10.1 smoke check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 27. bundle proposal check ================="
if (-not (Test-Path $BundleProposalTestScript)) {
    Write-Fail "tools/test-bundle-proposal.ps1 — file not found"
}
else {
    $result = & $PowerShellExe -ExecutionPolicy Bypass -File $BundleProposalTestScript -RepoRoot $RepoRoot 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($Verbose -and $result) { Write-Host "  $result" -ForegroundColor DarkGray }
        $script:passed++
    }
    else {
        Write-Fail "bundle proposal V10.1 smoke — failed"
        if ($result) { Write-Host "  $result" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────
# 28. PowerShell script status glyph check
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "== 28. PowerShell script glyph check =========="
$PowerShellStatusGlyphPattern = '[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u26FF\u2700-\u27BF]'
$PowerShellScriptFiles = Get-ChildItem -Path $RepoRoot -Recurse -File -Include *.ps1,*.psm1,*.psd1 -ErrorAction SilentlyContinue |
Where-Object {
    $_.FullName -notmatch '\\\.git\\' -and
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\Product\\' -and
    $_.FullName -notmatch '\\\.venv\\' -and
    $_.FullName -notmatch '\\__pycache__\\'
} |
Sort-Object FullName

$glyphHits = @()
foreach ($file in $PowerShellScriptFiles) {
    $matches = Select-String -LiteralPath $file.FullName -Pattern $PowerShellStatusGlyphPattern
    foreach ($match in $matches) {
        $relativePath = $match.Path.Replace($RepoRoot + '\', '')
        $glyphHits += "$($relativePath):$($match.LineNumber)"
    }
}

if ($glyphHits.Count -eq 0) {
    if ($Verbose) { Write-Ok "PowerShell scripts - no emoji/status glyphs" }
    else { $script:passed++ }
}
else {
    Write-Fail "PowerShell scripts - emoji/status glyphs found: $($glyphHits -join ', ')"
}

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
