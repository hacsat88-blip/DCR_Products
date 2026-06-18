#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for V7.1 shadow routing trial logging.

.DESCRIPTION
  Records a shadow routing trial into a temporary repo root and verifies that
  router-decisions-report.ps1 treats it as non-synthetic real usage.
#>

param(
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$ShadowScript = Join-Path $RepoRoot "tools\shadow-routing-trial.ps1"
$ReportScript = Join-Path $RepoRoot "tools\router-decisions-report.ps1"
if (-not (Test-Path $ShadowScript)) { throw "shadow-routing-trial.ps1 not found: $ShadowScript" }
if (-not (Test-Path $ReportScript)) { throw "router-decisions-report.ps1 not found: $ReportScript" }

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("shadow-routing-test-" + [System.Guid]::NewGuid().ToString("N"))
$TempTools = Join-Path $TempRoot "tools"
$TempLib = Join-Path $TempTools "lib"
New-Item -ItemType Directory -Path $TempLib -Force | Out-Null
Copy-Item -Path (Join-Path $RepoRoot "tools\lib\gate-state.ps1") -Destination (Join-Path $TempLib "gate-state.ps1") -Force

$OutputJson = Join-Path $TempRoot "shadow-report.json"

function Assert-Equal {
    param(
        [Parameter(Mandatory)]$Actual,
        [Parameter(Mandatory)]$Expected,
        [Parameter(Mandatory)][string]$Message
    )
    if ($Actual -ne $Expected) {
        throw "$Message. Expected '$Expected', got '$Actual'."
    }
}

try {
    $recordOutput = & powershell.exe -NoProfile -File $ShadowScript `
        -RepoRoot $TempRoot `
        -InputText "サトシ開発目線で軽く見て" `
        -Kind agent `
        -Name pied-piper `
        -Confidence 0.82 `
        -Status approved `
        -UserReplyType approve `
        -UserJudgement just_right `
        -ActualAsset "agent:pied-piper" `
        -OptionsCount 1 `
        -Reason "real shadow routing sample" `
        -ExpectedEffect "record user judgement" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "shadow-routing-trial.ps1 exited with $LASTEXITCODE. Output: $recordOutput"
    }

    $LogPath = Join-Path $TempRoot ".ai\routing\state\router-decisions.jsonl"
    if (-not (Test-Path $LogPath)) {
        throw "router decision log was not written: $LogPath"
    }
    $entry = Get-Content -Path $LogPath -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Equal -Actual $entry.shadow_trial -Expected $true -Message "shadow_trial flag mismatch"
    Assert-Equal -Actual $entry.user_judgement -Expected "just_right" -Message "user judgement mismatch"
    Assert-Equal -Actual $entry.actual_asset -Expected "agent:pied-piper" -Message "actual asset mismatch"

    $reportOutput = & powershell.exe -NoProfile -File $ReportScript -LogPath $LogPath -TopN 5 -MinRealDecisions 1 -OutputJson $OutputJson 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "router-decisions-report.ps1 exited with $LASTEXITCODE. Output: $reportOutput"
    }
    $report = Get-Content -Path $OutputJson -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Equal -Actual $report.shadow_trial_count -Expected 1 -Message "shadow trial count mismatch"
    Assert-Equal -Actual $report.reduction_analyzed_count -Expected 1 -Message "reduction analyzed count mismatch"
    $judgements = @($report.shadow_user_judgement_counts | ForEach-Object { $_.name })
    if ("just_right" -notin $judgements) {
        throw "shadow judgement count missing just_right"
    }

    Write-Host "shadow routing trial V7.1 smoke passed"
}
finally {
    if (Test-Path $TempRoot) {
        Remove-Item -Path $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
