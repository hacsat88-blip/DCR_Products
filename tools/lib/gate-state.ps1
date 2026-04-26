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
