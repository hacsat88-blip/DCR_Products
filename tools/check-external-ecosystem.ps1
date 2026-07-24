<#
.SYNOPSIS
  Detect drift between docs/dcr/external-ecosystem-registry.md baseline and the
  actual ~/.claude / ~/.agents ecosystem on this machine.

.DESCRIPTION
  Read-only. Verifies that the user-level external AI assets (skills via
  ~/.agents/.skill-lock.json, plugins via ~/.claude/plugins, loose agents under
  ~/.claude/agents) still match the recorded registry snapshot. Reports
  added/removed items so the registry can be kept honest. Treats vendor packs as
  immutable-upstream (it never modifies them).

  Baseline snapshot: 2026-06-19 (keep in sync with the registry doc).

.PARAMETER UserHome
  Home directory to inspect. Defaults to $HOME.

.PARAMETER RequireInstalled
  Treat a missing source file as FAIL instead of SKIP (use on the primary machine).

.EXAMPLE
  pwsh -File tools/check-external-ecosystem.ps1
  pwsh -File tools/check-external-ecosystem.ps1 -RequireInstalled
#>

param(
    [string]$UserHome = $HOME,
    [switch]$RequireInstalled
)

$ErrorActionPreference = "Stop"

# --- Recorded baseline (mirror of external-ecosystem-registry.md sections 1-3) ---
$ExpectedSkillCount   = 50
$ExpectedSkillSources = @(
    'coreyhaines31/marketingskills', 'anthropics/skills', 'vercel-labs/agent-skills',
    'vercel-labs/skills', 'remotion-dev/skills', 'nextlevelbuilder/ui-ux-pro-max-skill'
)
$ExpectedPlugins      = @('agent-sdk-dev', 'claude-code-setup', 'github', 'superpowers', 'warp')
$ExpectedMarketplaces = @('claude-plugins-official', 'claude-code-warp')
$ExpectedAgentCount   = 85

$script:failures = 0
function Write-CheckOk   { param([string]$m) Write-Host "[OK]   $m" -ForegroundColor Green }
function Write-CheckSkip { param([string]$m) Write-Host "[SKIP] $m" -ForegroundColor DarkGray }
function Write-CheckWarn { param([string]$m) Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-CheckFail { param([string]$m) Write-Host "[FAIL] $m" -ForegroundColor Red; $script:failures++ }

function Test-SourcePresent {
    param([string]$Path, [string]$Label)
    if (Test-Path -LiteralPath $Path) { return $true }
    if ($RequireInstalled) { Write-CheckFail "$Label not found: $Path" }
    else { Write-CheckSkip "$Label not found: $Path" }
    return $false
}

function Compare-Set {
    param([string[]]$Expected, [string[]]$Actual, [string]$Label)
    $added   = @($Actual   | Where-Object { $_ -and ($Expected -notcontains $_) })
    $removed = @($Expected | Where-Object { $_ -and ($Actual   -notcontains $_) })
    if ($added.Count -eq 0 -and $removed.Count -eq 0) {
        Write-CheckOk "$Label set matches baseline ($($Actual.Count))"
    }
    else {
        if ($removed.Count) { Write-CheckFail "$Label missing vs baseline: $($removed -join ', ')" }
        if ($added.Count)   { Write-CheckFail "$Label added vs baseline: $($added -join ', ')" }
    }
}

Write-Host ""
Write-Host "=== External Ecosystem Drift Check ===" -ForegroundColor Cyan
Write-Host "Home: $UserHome" -ForegroundColor DarkGray
Write-Host ""

# --- 1. Skills (skill-lock.json) ---
$lockPath = Join-Path $UserHome ".agents\.skill-lock.json"
if (Test-SourcePresent -Path $lockPath -Label "skill-lock.json") {
    try {
        $lock = Get-Content -LiteralPath $lockPath -Raw -Encoding utf8 | ConvertFrom-Json
        $skillProps = @($lock.skills.PSObject.Properties)
        if ($skillProps.Count -eq $ExpectedSkillCount) { Write-CheckOk "skills count = $ExpectedSkillCount" }
        else { Write-CheckFail "skills count = $($skillProps.Count) (expected $ExpectedSkillCount)" }
        $actualSources = @($skillProps | ForEach-Object { $_.Value.source } | Sort-Object -Unique)
        Compare-Set -Expected $ExpectedSkillSources -Actual $actualSources -Label "skill source"
    }
    catch { Write-CheckFail "skill-lock.json parse failed: $_" }
}

# broken-symlink hygiene note (skills physical dir points at ~/.agents/skills)
$agentsSkillsDir = Join-Path $UserHome ".agents\skills"
$claudeSkillsDir = Join-Path $UserHome ".claude\skills"
if ((Test-Path -LiteralPath $claudeSkillsDir) -and -not (Test-Path -LiteralPath $agentsSkillsDir)) {
    Write-CheckWarn "~/.claude/skills exists but ~/.agents/skills is missing (broken symlinks; lock is source of truth)"
}

# --- 2. Plugins + marketplaces ---
$pluginsPath = Join-Path $UserHome ".claude\plugins\installed_plugins.json"
if (Test-SourcePresent -Path $pluginsPath -Label "installed_plugins.json") {
    try {
        $ip = Get-Content -LiteralPath $pluginsPath -Raw -Encoding utf8 | ConvertFrom-Json
        $pluginNames = @($ip.plugins.PSObject.Properties.Name | ForEach-Object { ($_ -split '@')[0] } | Sort-Object -Unique)
        Compare-Set -Expected $ExpectedPlugins -Actual $pluginNames -Label "plugin"
    }
    catch { Write-CheckFail "installed_plugins.json parse failed: $_" }
}

$marketsPath = Join-Path $UserHome ".claude\plugins\known_marketplaces.json"
if (Test-SourcePresent -Path $marketsPath -Label "known_marketplaces.json") {
    try {
        $mk = Get-Content -LiteralPath $marketsPath -Raw -Encoding utf8 | ConvertFrom-Json
        $marketNames = @($mk.PSObject.Properties.Name | Sort-Object -Unique)
        Compare-Set -Expected $ExpectedMarketplaces -Actual $marketNames -Label "marketplace"
    }
    catch { Write-CheckFail "known_marketplaces.json parse failed: $_" }
}

# --- 3. Loose agents (no lock; count snapshot only) ---
$agentsDir = Join-Path $UserHome ".claude\agents"
if (Test-SourcePresent -Path $agentsDir -Label "~/.claude/agents") {
    $agentCount = @(Get-ChildItem -LiteralPath $agentsDir -Force -Filter *.md -File -ErrorAction SilentlyContinue).Count
    if ($agentCount -eq $ExpectedAgentCount) { Write-CheckOk "agents count = $ExpectedAgentCount" }
    else { Write-CheckWarn "agents count = $agentCount (baseline $ExpectedAgentCount; loose .md, no lock - update registry if intentional)" }
}

Write-Host ""
if ($script:failures -gt 0) {
    Write-Host "External ecosystem drift detected: $($script:failures) issue(s). Update the registry if intentional." -ForegroundColor Red
    exit 1
}
Write-Host "External ecosystem matches the recorded registry baseline." -ForegroundColor Green
exit 0
