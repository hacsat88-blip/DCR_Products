<#
.SYNOPSIS
  AutoTrader live-ops readiness checker

.DESCRIPTION
  少額 live 運用に入る前に、repo root workbook、backend、UI、
  MarketSpeed II RSS add-in 配置の最低条件をローカルで確認する。

.PARAMETER WorkbookPath
  確認対象 workbook path。未指定時は repo root の autotrader.xlsm。

.PARAMETER WorkbookLockPath
  確認対象 lock file path。未指定時は repo root の ~$autotrader.xlsm。

.PARAMETER BackendEnvPath
  backend env file path。未指定時は Product/autotrader-suite/backend/.env。

.PARAMETER UiEnvPath
  UI env file path。未指定時は Product/autotrader-suite/ui/.env.local。

.PARAMETER RssDirPath
  MarketSpeed II RSS add-in directory。未指定時は %LOCALAPPDATA%\MarketSpeed2\Bin\rss。

.PARAMETER JsonOnly
  Human-readable output を出さず JSON summary のみ返す。

.EXAMPLE
  .\Product\autotrader-suite\check-live-readiness.ps1
#>

param(
    [string]$WorkbookPath,
    [string]$WorkbookLockPath,
    [string]$BackendEnvPath,
    [string]$UiEnvPath,
    [string]$RssDirPath,
    [switch]$JsonOnly
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StartPath
    )

    $resolvedStart = (Resolve-Path -LiteralPath $StartPath).Path
    $current = $resolvedStart

    while ($true) {
        $hasDeploy = Test-Path -LiteralPath (Join-Path $current "deploy.ps1")
        $hasProduct = Test-Path -LiteralPath (Join-Path $current "Product")
        $hasDocs = Test-Path -LiteralPath (Join-Path $current "docs")

        if ($hasDeploy -and $hasProduct -and $hasDocs) {
            return $current
        }

        $parent = Split-Path -Path $current -Parent
        if (-not $parent -or $parent -eq $current) {
            return $null
        }

        $current = $parent
    }
}

function New-CheckResult {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [ValidateSet("ok", "warning", "blocked")]
        [string]$State,
        [Parameter(Mandatory = $true)]
        [string]$Message,
        [string]$Path
    )

    return [pscustomobject]@{
        name    = $Name
        state   = $State
        message = $Message
        path    = $Path
    }
}

function Get-OverallState {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Checks
    )

    if (@($Checks | Where-Object { $_.state -eq "blocked" }).Count -gt 0) {
        return "blocked"
    }

    if (@($Checks | Where-Object { $_.state -eq "warning" }).Count -gt 0) {
        return "warning"
    }

    return "ok"
}

function Get-EnvFileEntries {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $entries = @{}

    if (-not (Test-Path -LiteralPath $Path)) {
        return $entries
    }

    foreach ($rawLine in Get-Content -LiteralPath $Path) {
        $line = $rawLine.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) {
            continue
        }

        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -lt 1) {
            continue
        }

        $name = $line.Substring(0, $separatorIndex).Trim()
        $value = $line.Substring($separatorIndex + 1).Trim()
        if ($name -ne "") {
            $entries[$name] = $value
        }
    }

    return $entries
}

function Test-ConfiguredEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Entries,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not $Entries.ContainsKey($Name)) {
        return $false
    }

    return [string]::IsNullOrWhiteSpace([string]$Entries[$Name]) -eq $false
}

function Write-CheckLine {
    param(
        [Parameter(Mandatory = $true)]
        $Check
    )

    $prefix = "[OK]"
    $color = "Green"
    switch ($Check.state) {
        "warning" {
            $prefix = "[WARN]"
            $color = "Yellow"
        }
        "blocked" {
            $prefix = "[BLOCKED]"
            $color = "Red"
        }
    }

    $suffix = ""
    if ($Check.path) {
        $suffix = " ($($Check.path))"
    }

    Write-Host "$prefix $($Check.name): $($Check.message)$suffix" -ForegroundColor $color
}

$checks = New-Object System.Collections.Generic.List[object]
$checkedAt = Get-Date
$repoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot

if (-not $repoRoot) {
    $checks.Add((New-CheckResult -Name "repo_root" -State "blocked" -Message "Failed to resolve repository root from script location; expected deploy.ps1, Product, and docs markers" -Path $PSScriptRoot)) | Out-Null

    $summary = [pscustomobject]@{
        checked_at    = $checkedAt.ToString("s")
        repo_root     = $null
        overall_state = "blocked"
        checks        = $checks
    }

    if ($JsonOnly) {
        $summary | ConvertTo-Json -Depth 6
    }
    else {
        Write-Host "AutoTrader Live Readiness Check" -ForegroundColor Cyan
        Write-Host "Checked At: $($checkedAt.ToString('yyyy-MM-dd HH:mm:ss'))"
        Write-CheckLine -Check $checks[0]
        Write-Host ""
        Write-Host "Summary: blocked" -ForegroundColor Red
        $summary | ConvertTo-Json -Depth 6
    }

    exit 1
}

$checks.Add((New-CheckResult -Name "repo_root" -State "ok" -Message "Resolved repository root" -Path $repoRoot)) | Out-Null

$resolvedWorkbookPath = if ($WorkbookPath) { $WorkbookPath } else { Join-Path $repoRoot "autotrader.xlsm" }
$resolvedLockPath = if ($WorkbookLockPath) { $WorkbookLockPath } else { Join-Path $repoRoot '~$autotrader.xlsm' }
$backendRoot = Join-Path $repoRoot "Product\autotrader-suite\backend"
$uiRoot = Join-Path $repoRoot "Product\autotrader-suite\ui"
$resolvedBackendEnvPath = if ($BackendEnvPath) { $BackendEnvPath } else { Join-Path $backendRoot ".env" }
$resolvedUiEnvPath = if ($UiEnvPath) { $UiEnvPath } else { Join-Path $uiRoot ".env.local" }
$resolvedRssDirPath = if ($RssDirPath) { $RssDirPath } else { Join-Path $env:LOCALAPPDATA "MarketSpeed2\Bin\rss" }
$backendPythonPath = Join-Path $backendRoot ".venv\Scripts\python.exe"
$uiPackageJsonPath = Join-Path $uiRoot "package.json"

if (Test-Path -LiteralPath $resolvedWorkbookPath) {
    $checks.Add((New-CheckResult -Name "workbook_exists" -State "ok" -Message "Runtime workbook found" -Path $resolvedWorkbookPath)) | Out-Null
}
else {
    $checks.Add((New-CheckResult -Name "workbook_exists" -State "blocked" -Message "Runtime workbook not found" -Path $resolvedWorkbookPath)) | Out-Null
}

if (Test-Path -LiteralPath $resolvedLockPath) {
    $checks.Add((New-CheckResult -Name "workbook_unlocked" -State "blocked" -Message "Workbook lock file exists; Excel session is still holding the workbook" -Path $resolvedLockPath)) | Out-Null
}
else {
    $checks.Add((New-CheckResult -Name "workbook_unlocked" -State "ok" -Message "No workbook lock file detected" -Path $resolvedLockPath)) | Out-Null
}

if (Test-Path -LiteralPath $backendPythonPath) {
    $checks.Add((New-CheckResult -Name "backend_venv" -State "ok" -Message "Backend virtual environment is available" -Path $backendPythonPath)) | Out-Null
}
else {
    $checks.Add((New-CheckResult -Name "backend_venv" -State "blocked" -Message "Backend virtual environment is missing" -Path $backendPythonPath)) | Out-Null
}

if (Test-Path -LiteralPath $resolvedBackendEnvPath) {
    $checks.Add((New-CheckResult -Name "backend_env" -State "ok" -Message "Backend env file is present" -Path $resolvedBackendEnvPath)) | Out-Null

    $backendEnvEntries = Get-EnvFileEntries -Path $resolvedBackendEnvPath
    if (Test-ConfiguredEnvValue -Entries $backendEnvEntries -Name "GOOGLE_API_KEY") {
        $checks.Add((New-CheckResult -Name "backend_google_api_key" -State "ok" -Message "Backend env includes GOOGLE_API_KEY" -Path $resolvedBackendEnvPath)) | Out-Null
    }
    else {
        $checks.Add((New-CheckResult -Name "backend_google_api_key" -State "blocked" -Message "Backend env is missing GOOGLE_API_KEY; AI decisions will stay degraded" -Path $resolvedBackendEnvPath)) | Out-Null
    }

    if (Test-ConfiguredEnvValue -Entries $backendEnvEntries -Name "JQUANTS_API_KEY") {
        $checks.Add((New-CheckResult -Name "backend_jquants_api_key" -State "ok" -Message "Backend env includes JQUANTS_API_KEY" -Path $resolvedBackendEnvPath)) | Out-Null
    }
    else {
        $checks.Add((New-CheckResult -Name "backend_jquants_api_key" -State "blocked" -Message "Backend env is missing JQUANTS_API_KEY; reference readiness will stay degraded" -Path $resolvedBackendEnvPath)) | Out-Null
    }
}
else {
    $checks.Add((New-CheckResult -Name "backend_env" -State "warning" -Message "Backend env file is missing; verify GOOGLE_API_KEY and JQUANTS_API_KEY before live use" -Path $resolvedBackendEnvPath)) | Out-Null
}

if ((Test-Path -LiteralPath $uiRoot) -and (Test-Path -LiteralPath $uiPackageJsonPath)) {
    $checks.Add((New-CheckResult -Name "ui_workspace" -State "ok" -Message "UI workspace is present" -Path $uiRoot)) | Out-Null
}
else {
    $checks.Add((New-CheckResult -Name "ui_workspace" -State "blocked" -Message "UI workspace or package.json is missing" -Path $uiRoot)) | Out-Null
}

if (Test-Path -LiteralPath $resolvedUiEnvPath) {
    $checks.Add((New-CheckResult -Name "ui_env" -State "ok" -Message "UI env file is present" -Path $resolvedUiEnvPath)) | Out-Null

    $uiEnvEntries = Get-EnvFileEntries -Path $resolvedUiEnvPath
    if (Test-ConfiguredEnvValue -Entries $uiEnvEntries -Name "NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL") {
        $checks.Add((New-CheckResult -Name "ui_server_base_url" -State "ok" -Message "UI env includes NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL" -Path $resolvedUiEnvPath)) | Out-Null
    }
    else {
        $checks.Add((New-CheckResult -Name "ui_server_base_url" -State "warning" -Message "UI env is missing NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL; browser proxy and WS routing may fail" -Path $resolvedUiEnvPath)) | Out-Null
    }
}
else {
    $checks.Add((New-CheckResult -Name "ui_env" -State "warning" -Message "UI env file is missing; verify NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL before live use" -Path $resolvedUiEnvPath)) | Out-Null
}

$xll64Path = Join-Path $resolvedRssDirPath "MarketSpeed2_RSS_64bit.xll"
$xll32Path = Join-Path $resolvedRssDirPath "MarketSpeed2_RSS_32bit.xll"
$xlamPath = Join-Path $resolvedRssDirPath "MarketSpeed2_RSS_VBA.xlam"

if (-not (Test-Path -LiteralPath $resolvedRssDirPath)) {
    $checks.Add((New-CheckResult -Name "rss_addins" -State "blocked" -Message "MarketSpeed II RSS directory is missing" -Path $resolvedRssDirPath)) | Out-Null
}
else {
    $foundFiles = @()
    foreach ($candidate in @($xll64Path, $xll32Path, $xlamPath)) {
        if (Test-Path -LiteralPath $candidate) {
            $foundFiles += (Split-Path -Path $candidate -Leaf)
        }
    }

    if ($foundFiles.Count -gt 0) {
        $checks.Add((New-CheckResult -Name "rss_addins" -State "ok" -Message ("MarketSpeed II RSS assets found: " + ($foundFiles -join ", ")) -Path $resolvedRssDirPath)) | Out-Null
    }
    else {
        $checks.Add((New-CheckResult -Name "rss_addins" -State "blocked" -Message "RSS directory exists, but expected XLL/XLAM assets were not found" -Path $resolvedRssDirPath)) | Out-Null
    }
}

$overallState = Get-OverallState -Checks $checks.ToArray()
$summary = [pscustomobject]@{
    checked_at    = $checkedAt.ToString("s")
    repo_root     = $repoRoot
    overall_state = $overallState
    checks        = $checks
}

if ($JsonOnly) {
    $summary | ConvertTo-Json -Depth 6
}
else {
    Write-Host "AutoTrader Live Readiness Check" -ForegroundColor Cyan
    Write-Host "Checked At: $($checkedAt.ToString('yyyy-MM-dd HH:mm:ss'))"
    Write-Host "Repo Root: $repoRoot"
    Write-Host ""

    foreach ($check in $checks) {
        Write-CheckLine -Check $check
    }

    Write-Host ""
    switch ($overallState) {
        "ok" {
            Write-Host "Summary: ok" -ForegroundColor Green
        }
        "warning" {
            Write-Host "Summary: warning" -ForegroundColor Yellow
        }
        default {
            Write-Host "Summary: blocked" -ForegroundColor Red
        }
    }

    $summary | ConvertTo-Json -Depth 6
}

if ($overallState -eq "blocked") {
    exit 1
}

exit 0