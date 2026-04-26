#Requires -Version 5.1
<#
.SYNOPSIS
  Gate State helper — read/write/validate .ai/kernel/gate-state.json

.DESCRIPTION
  Provides functions for the Unified Coordinator (pied-piper) and deploy.ps1
  to read/update/check the p/ → q/ → sh/ gate chain state per session.

  Schema: .ai/kernel/gate-state.schema.json

.EXAMPLE
  . .\tools\lib\gate-state.ps1
  $state = Read-GateState -RepoRoot $RepoRoot
  Update-GateState -RepoRoot $RepoRoot -Phase 'qa' -GateUpdate @{ qa_passed = $true }
  if (-not (Test-GateReady -RepoRoot $RepoRoot -RequireGate 'qa_passed')) { throw "QA not passed" }
#>

$ErrorActionPreference = 'Stop'

function Get-GateStatePath {
    param([Parameter(Mandatory)][string]$RepoRoot)
    return Join-Path $RepoRoot ".ai/kernel/gate-state.json"
}

function New-DefaultGateState {
    param([string]$SessionId = "")
    if ([string]::IsNullOrWhiteSpace($SessionId)) {
        $SessionId = "session-{0}" -f (Get-Date -Format 'yyyyMMdd-HHmmss')
    }
    return [pscustomobject]@{
        session_id = $SessionId
        phase = "plan"
        gates = [pscustomobject]@{
            plan_passed = $false
            review_passed = $false
            qa_passed = $false
            ship_ready = $false
        }
        findings = [pscustomobject]@{
            critical = 0
            high = 0
            medium = 0
            low = 0
        }
        selected_assets = @()
        updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
}

function Read-GateState {
    param([Parameter(Mandatory)][string]$RepoRoot)
    $path = Get-GateStatePath -RepoRoot $RepoRoot
    if (-not (Test-Path $path)) {
        return New-DefaultGateState
    }
    try {
        $raw = [System.IO.File]::ReadAllText((Resolve-Path $path).Path)
        return ($raw | ConvertFrom-Json)
    } catch {
        Write-Warning "gate-state.json parse failed: $_. Returning default."
        return New-DefaultGateState
    }
}

function Write-GateState {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][object]$State
    )
    $path = Get-GateStatePath -RepoRoot $RepoRoot
    $dir = Split-Path $path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $State.updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $json = $State | ConvertTo-Json -Depth 10
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $json + [Environment]::NewLine, $utf8)
}

function Update-GateState {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [string]$Phase,
        [hashtable]$GateUpdate,
        [hashtable]$FindingsUpdate,
        [object]$AddSelectedAsset
    )
    $state = Read-GateState -RepoRoot $RepoRoot
    if ($Phase) { $state.phase = $Phase }
    if ($GateUpdate) {
        foreach ($k in $GateUpdate.Keys) {
            $state.gates.$k = $GateUpdate[$k]
        }
    }
    if ($FindingsUpdate) {
        foreach ($k in $FindingsUpdate.Keys) {
            $state.findings.$k = $FindingsUpdate[$k]
        }
    }
    if ($AddSelectedAsset) {
        $state.selected_assets = @($state.selected_assets) + $AddSelectedAsset
    }
    Write-GateState -RepoRoot $RepoRoot -State $state
    return $state
}

function Test-GateReady {
    <#
    .DESCRIPTION
      Returns $true if the named gate is passed AND no critical findings exist.
      Used by deploy.ps1 to hard-block ship-stage operations when QA hasn't passed.
    #>
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][ValidateSet('plan_passed','review_passed','qa_passed','ship_ready')][string]$RequireGate,
        [switch]$AllowMissing
    )
    $path = Get-GateStatePath -RepoRoot $RepoRoot
    if (-not (Test-Path $path)) {
        if ($AllowMissing) { return $true }  # bootstrap mode
        Write-Warning "gate-state.json not found: $path"
        return $false
    }
    $state = Read-GateState -RepoRoot $RepoRoot
    if (-not $state.gates.$RequireGate) {
        return $false
    }
    if ($state.findings -and $state.findings.critical -gt 0) {
        Write-Warning "Gate $RequireGate is passed but critical findings = $($state.findings.critical)"
        return $false
    }
    return $true
}

function Assert-GateReady {
    <#
    .DESCRIPTION
      Hard-block version. Throws if gate not ready (used in deploy.ps1 ship-time guards).
    #>
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][string]$RequireGate,
        [switch]$AllowMissing
    )
    if (-not (Test-GateReady -RepoRoot $RepoRoot -RequireGate $RequireGate -AllowMissing:$AllowMissing)) {
        throw "Gate '$RequireGate' is not ready. Aborting. Update via Update-GateState or run the q/ trigger first."
    }
}

# ── Router Decisions Log ──
function Get-RouterDecisionsPath {
    param([Parameter(Mandatory)][string]$RepoRoot)
    return Join-Path $RepoRoot ".ai/kernel/router-decisions.jsonl"
}

function Write-RouterDecision {
    <#
    .DESCRIPTION
      Append a single routing decision to .ai/kernel/router-decisions.jsonl
      (gitignored). One JSON object per line. Used by pied-piper / unified-router
      to log every selection for offline accuracy measurement.

    .PARAMETER Kind
      'rule' | 'skill' | 'agent'

    .PARAMETER Confidence
      0.0 - 1.0

    .PARAMETER ViaAliasFrom
      If the user requested a deprecated name and Step 0 substituted to successor,
      pass the original name here. Empty if no alias substitution happened.

    .EXAMPLE
      Write-RouterDecision -RepoRoot $RepoRoot -Input "LPのCV改善" `
        -Kind skill -Name conversion-optimization-hub -Confidence 0.92 `
        -Reason "routing_category=growth + keywords[CRO,LP] hit" `
        -ExpectedEffect "page-cro variant で構造化提案"
    #>
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][Alias('Input')][string]$UserInput,
        [Parameter(Mandatory)][ValidateSet('rule','skill','agent')][string]$Kind,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][double]$Confidence,
        [string]$Reason = "",
        [string]$ExpectedEffect = "",
        [string]$ViaAliasFrom = "",
        [switch]$ViaLocalOverride,
        [string]$Phase = ""
    )
    $path = Get-RouterDecisionsPath -RepoRoot $RepoRoot
    $dir = Split-Path $path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $entry = [pscustomobject]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        input = $UserInput
        kind = $Kind
        name = $Name
        via_alias_from = $ViaAliasFrom
        via_local_override = [bool]$ViaLocalOverride
        confidence = $Confidence
        reason = $Reason
        expected_effect = $ExpectedEffect
        phase = $Phase
    }
    $line = ($entry | ConvertTo-Json -Compress -Depth 5)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::AppendAllText($path, $line + [Environment]::NewLine, $utf8)
}

function Get-RouterDecisionStats {
    <#
    .DESCRIPTION
      Read router-decisions.jsonl and return aggregate stats:
      - total decisions
      - confidence distribution (avg, median, % >0.8)
      - alias usage count (deprecated name calls)
      - top 10 most-used assets
    #>
    param([Parameter(Mandatory)][string]$RepoRoot)
    $path = Get-RouterDecisionsPath -RepoRoot $RepoRoot
    if (-not (Test-Path $path)) {
        return [pscustomobject]@{ total = 0; message = "no decisions logged yet" }
    }
    $entries = Get-Content -Path $path -Encoding utf8 | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json }
    if (-not $entries) {
        return [pscustomobject]@{ total = 0; message = "log empty" }
    }
    $entries = @($entries)
    $total = $entries.Count
    $confidences = @($entries | ForEach-Object { $_.confidence })
    $high = @($confidences | Where-Object { $_ -gt 0.8 }).Count
    $aliasUsage = @($entries | Where-Object { $_.via_alias_from -and ([string]$_.via_alias_from).Length -gt 0 }).Count
    $localOverrides = @($entries | Where-Object { $_.via_local_override -eq $true }).Count
    $topAssets = $entries | Group-Object -Property name | Sort-Object Count -Descending | Select-Object -First 10 Name, Count
    $aliasMap = $entries | Where-Object { $_.via_alias_from } | Group-Object -Property via_alias_from | ForEach-Object {
        [pscustomobject]@{ Old = $_.Name; Count = $_.Count }
    } | Sort-Object Count -Descending
    return [pscustomobject]@{
        total = $total
        avg_confidence = [math]::Round(($confidences | Measure-Object -Average).Average, 3)
        pct_high_confidence = [math]::Round(($high / $total) * 100, 1)
        alias_usage_count = $aliasUsage
        alias_usage_pct = [math]::Round(($aliasUsage / $total) * 100, 1)
        local_override_count = $localOverrides
        local_override_pct = [math]::Round(($localOverrides / $total) * 100, 1)
        top_10_assets = $topAssets
        deprecated_calls_by_oldname = $aliasMap
    }
}
