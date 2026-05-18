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
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [string]$GateStatePath = ""
    )
    if (-not [string]::IsNullOrWhiteSpace($GateStatePath)) {
        return $GateStatePath
    }
    return Join-Path $RepoRoot ".ai/kernel/gate-state.json"
}

function New-DefaultProposalState {
    return [pscustomobject]@{
        proposal_id = ""
        status = "none"
        mode = ""
        options = @()
        recommended_option = ""
        selected_option = ""
        created_at = ""
        updated_at = ""
        last_user_reply_type = "none"
    }
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
        proposal_state = (New-DefaultProposalState)
        updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
}

function Read-GateState {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [string]$GateStatePath = ""
    )
    $path = Get-GateStatePath -RepoRoot $RepoRoot -GateStatePath $GateStatePath
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
        [Parameter(Mandatory)][object]$State,
        [string]$GateStatePath = ""
    )
    $path = Get-GateStatePath -RepoRoot $RepoRoot -GateStatePath $GateStatePath
    $dir = Split-Path $path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $State.updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $json = $State | ConvertTo-Json -Depth 10
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $json + [Environment]::NewLine, $utf8)
}

function Get-ProposalState {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [string]$GateStatePath = ""
    )
    $state = Read-GateState -RepoRoot $RepoRoot -GateStatePath $GateStatePath
    if (-not $state.PSObject.Properties['proposal_state'] -or -not $state.proposal_state) {
        return New-DefaultProposalState
    }
    return $state.proposal_state
}

function Set-ProposalState {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][string]$ProposalId,
        [ValidateSet('none','proposed','approved','rejected','refined','expired')][string]$Status = "proposed",
        [ValidateSet('auto','propose','approve_required')][string]$Mode = "propose",
        [object[]]$Options = @(),
        [string]$RecommendedOption = "A",
        [string]$SelectedOption = "",
        [ValidateSet('none','approve','reject','refine','ambiguous')][string]$LastUserReplyType = "none",
        [string]$GateStatePath = ""
    )
    if ($Options.Count -gt 3) {
        throw "proposal_state options must contain at most 3 items."
    }
    foreach ($option in $Options) {
        if (-not $option.PSObject.Properties['id']) {
            throw "proposal_state option is missing required id."
        }
        if ($option.id -notin @('A','B','C')) {
            throw "proposal_state option id must be A, B, or C."
        }
        foreach ($required in @('kind','name','reason','expected_effect')) {
            if (-not $option.PSObject.Properties[$required]) {
                throw "proposal_state option '$($option.id)' is missing required $required."
            }
        }
    }

    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $current = Get-ProposalState -RepoRoot $RepoRoot -GateStatePath $GateStatePath
    $createdAt = $current.created_at
    if ([string]::IsNullOrWhiteSpace($createdAt) -or $current.proposal_id -ne $ProposalId) {
        $createdAt = $now
    }

    $proposal = [pscustomobject]@{
        proposal_id = $ProposalId
        status = $Status
        mode = $Mode
        options = @($Options)
        recommended_option = $RecommendedOption
        selected_option = $SelectedOption
        created_at = $createdAt
        updated_at = $now
        last_user_reply_type = $LastUserReplyType
    }

    $state = Read-GateState -RepoRoot $RepoRoot -GateStatePath $GateStatePath
    $state | Add-Member -NotePropertyName proposal_state -NotePropertyValue $proposal -Force
    Write-GateState -RepoRoot $RepoRoot -State $state -GateStatePath $GateStatePath
    return $proposal
}

function Clear-ProposalState {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [string]$GateStatePath = ""
    )
    $state = Read-GateState -RepoRoot $RepoRoot -GateStatePath $GateStatePath
    $state | Add-Member -NotePropertyName proposal_state -NotePropertyValue (New-DefaultProposalState) -Force
    Write-GateState -RepoRoot $RepoRoot -State $state -GateStatePath $GateStatePath
    return $state.proposal_state
}

function New-Utf16String {
    param([Parameter(Mandatory)][int[]]$Codepoints)
    return -join ($Codepoints | ForEach-Object { [char]$_ })
}

function Test-ReplyContainsAny {
    param(
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][string[]]$Terms
    )
    foreach ($term in $Terms) {
        if ($Text.Contains($term)) { return $true }
    }
    return $false
}

function Resolve-ProposalReply {
    param(
        [Parameter(Mandatory)][string]$UserReply,
        [object]$ProposalState
    )
    if (-not $ProposalState) {
        $ProposalState = New-DefaultProposalState
    }
    $reply = $UserReply.Trim()
    $active = $ProposalState.status -in @('proposed','refined')
    $options = @($ProposalState.options)
    $recommended = [string]$ProposalState.recommended_option
    $selected = ""
    $replyType = "ambiguous"
    $nextStatus = if ($active) { [string]$ProposalState.status } else { "none" }
    $reason = "reply did not match a deterministic proposal action"

    $rejectTerms = @(
        (New-Utf16String @(0x3084,0x3081,0x3066)),
        (New-Utf16String @(0x5374,0x4e0b)),
        (New-Utf16String @(0x9055,0x3046)),
        (New-Utf16String @(0x4e0d,0x8981)),
        (New-Utf16String @(0x30ad,0x30e3,0x30f3,0x30bb,0x30eb)),
        (New-Utf16String @(0x4e2d,0x6b62))
    )
    $refineTerms = @(
        (New-Utf16String @(0x5225,0x6848)),
        (New-Utf16String @(0x5225,0x306e,0x6848)),
        (New-Utf16String @(0x8efd,0x3081,0x306b)),
        (New-Utf16String @(0x8efd,0x304f)),
        (New-Utf16String @(0x8a73,0x3057,0x304f)),
        (New-Utf16String @(0x3082,0x3046,0x5c11,0x3057)),
        (New-Utf16String @(0x7d5e,0x3063,0x3066))
    )
    $ambiguousTerms = @(
        (New-Utf16String @(0x4efb,0x305b,0x308b)),
        (New-Utf16String @(0x304a,0x307e,0x304b,0x305b)),
        (New-Utf16String @(0x3088,0x3055,0x305d,0x3046)),
        (New-Utf16String @(0x3088,0x3055,0x3052)),
        (New-Utf16String @(0x305f,0x3076,0x3093)),
        (New-Utf16String @(0x591a,0x5206))
    )
    $recommendedTerms = @(
        (New-Utf16String @(0x304a,0x3059,0x3059,0x3081)),
        (New-Utf16String @(0x63a8,0x5968))
    )
    $genericApprovalTerms = @(
        (New-Utf16String @(0x305d,0x308c,0x3067)),
        (New-Utf16String @(0x9032,0x3081,0x3066)),
        (New-Utf16String @(0x627f,0x8a8d))
    )

    if (Test-ReplyContainsAny -Text $reply -Terms $rejectTerms) {
        $replyType = "reject"
        $nextStatus = "rejected"
        $reason = "matched reject vocabulary"
    }
    elseif (Test-ReplyContainsAny -Text $reply -Terms $refineTerms) {
        $replyType = "refine"
        $nextStatus = "refined"
        $reason = "matched refine vocabulary"
    }
    elseif (Test-ReplyContainsAny -Text $reply -Terms $ambiguousTerms) {
        $replyType = "ambiguous"
        $reason = "matched ambiguous vocabulary"
    }
    else {
        $optionMatch = [regex]::Match($reply, '^\s*([AaBbCc123])')
        if ($optionMatch.Success) {
            $raw = $optionMatch.Groups[1].Value.ToUpperInvariant()
            switch ($raw) {
                '1' { $selected = 'A' }
                '2' { $selected = 'B' }
                '3' { $selected = 'C' }
                default { $selected = $raw }
            }
            if ($active -and @($options | Where-Object { $_.id -eq $selected }).Count -gt 0) {
                $replyType = "approve"
                $nextStatus = "approved"
                $reason = "matched explicit option selection"
            }
            else {
                $replyType = "ambiguous"
                $selected = ""
                $reason = "option selection had no active matching proposal"
            }
        }
        elseif (Test-ReplyContainsAny -Text $reply -Terms $recommendedTerms) {
            if ($active -and -not [string]::IsNullOrWhiteSpace($recommended) -and @($options | Where-Object { $_.id -eq $recommended }).Count -gt 0) {
                $replyType = "approve"
                $nextStatus = "approved"
                $selected = $recommended
                $reason = "matched recommended-option approval"
            }
            else {
                $replyType = "ambiguous"
                $reason = "recommended approval had no active proposal"
            }
        }
        elseif ((Test-ReplyContainsAny -Text $reply -Terms $genericApprovalTerms) -or $reply -match '^ok$|^OK$') {
            if ($active -and $options.Count -eq 1) {
                $replyType = "approve"
                $nextStatus = "approved"
                $selected = [string]$options[0].id
                $reason = "matched generic approval with a single active option"
            }
            else {
                $replyType = "ambiguous"
                $reason = "generic approval was not tied to one active option"
            }
        }
    }

    return [pscustomobject]@{
        user_reply_type = $replyType
        selected_option = $selected
        previous_status = if ($ProposalState.status) { [string]$ProposalState.status } else { "none" }
        next_status = $nextStatus
        has_active_proposal = [bool]$active
        requires_confirmation = [bool]($replyType -eq "ambiguous")
        reason = $reason
    }
}

function Update-ProposalStateFromReply {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][string]$UserReply,
        [string]$GateStatePath = ""
    )
    $state = Read-GateState -RepoRoot $RepoRoot -GateStatePath $GateStatePath
    $proposal = if ($state.PSObject.Properties['proposal_state']) { $state.proposal_state } else { New-DefaultProposalState }
    $resolved = Resolve-ProposalReply -UserReply $UserReply -ProposalState $proposal

    $nextProposal = [pscustomobject]@{
        proposal_id = [string]$proposal.proposal_id
        status = [string]$resolved.next_status
        mode = [string]$proposal.mode
        options = @($proposal.options)
        recommended_option = [string]$proposal.recommended_option
        selected_option = [string]$resolved.selected_option
        created_at = [string]$proposal.created_at
        updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        last_user_reply_type = [string]$resolved.user_reply_type
    }
    if ([string]::IsNullOrWhiteSpace($nextProposal.proposal_id)) {
        $nextProposal.status = "none"
    }

    $state | Add-Member -NotePropertyName proposal_state -NotePropertyValue $nextProposal -Force
    Write-GateState -RepoRoot $RepoRoot -State $state -GateStatePath $GateStatePath
    return [pscustomobject]@{
        resolution = $resolved
        proposal_state = $nextProposal
    }
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
        [Parameter(Mandatory)][ValidateSet('plan_passed','review_passed','qa_passed','ship_ready')][string]$RequireGate,
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

    .PARAMETER Status
      Lifecycle state for the decision: proposed, approved, rejected, or executed.

    .PARAMETER UserReplyType
      User reply classification for proposal follow-up: none, approve, reject, refine, or ambiguous.

    .PARAMETER PreviousStatus
      Proposal-state status before processing the reply.

    .PARAMETER NextStatus
      Proposal-state status after processing the reply.

    .PARAMETER ShadowTrial
      Marks this entry as an observation-first routing trial.

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
        [switch]$ApprovalRequired,
        [ValidateSet('proposed','approved','rejected','executed')][string]$Status = "executed",
        [ValidateSet('low','medium','high')][string]$Risk = "low",
        [ValidateSet('small','medium','large')][string]$Scale = "small",
        [ValidateSet('low','medium','high')][string]$Ambiguity = "low",
        [string]$ProposalId = "",
        [ValidateRange(0, 3)][int]$OptionsCount = 0,
        [ValidateSet('none','approve','reject','refine','ambiguous')][string]$UserReplyType = "none",
        [string]$SelectedOption = "",
        [ValidateSet('none','proposed','approved','rejected','refined','expired')][string]$PreviousStatus = "none",
        [ValidateSet('none','proposed','approved','rejected','refined','expired')][string]$NextStatus = "none",
        [switch]$SelectedByUser,
        [switch]$ShadowTrial,
        [ValidateSet('','just_right','too_many','off_target','lighter','too_heavy','unclear')][string]$UserJudgement = "",
        [string]$ActualAsset = "",
        [string]$UserNote = "",
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
        approval_required = [bool]$ApprovalRequired
        status = $Status
        risk = $Risk
        scale = $Scale
        ambiguity = $Ambiguity
        proposal_id = $ProposalId
        options_count = $OptionsCount
        user_reply_type = $UserReplyType
        selected_option = $SelectedOption
        previous_status = $PreviousStatus
        next_status = $NextStatus
        selected_by_user = [bool]$SelectedByUser
        shadow_trial = [bool]$ShadowTrial
        user_judgement = $UserJudgement
        actual_asset = $ActualAsset
        user_note = $UserNote
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
      - approval-required count and status distribution
      - top 10 most-used assets
      - shadow trial judgement counts
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
    $approvalRequired = @($entries | Where-Object { $_.approval_required -eq $true }).Count
    $pendingApproval = @($entries | Where-Object { $_.approval_required -eq $true -and $_.status -eq 'proposed' }).Count
    $shadowTrials = @($entries | Where-Object { $_.shadow_trial -eq $true })
    $topAssets = $entries | Group-Object -Property name | Sort-Object Count -Descending | Select-Object -First 10 Name, Count
    $statusCounts = $entries | Group-Object -Property status | Sort-Object Count -Descending | Select-Object Name, Count
    $replyTypeCounts = $entries | Where-Object { $_.user_reply_type } | Group-Object -Property user_reply_type | Sort-Object Count -Descending | Select-Object Name, Count
    $transitionCounts = $entries | Where-Object { $_.previous_status -or $_.next_status } | ForEach-Object {
        $prev = if ($_.previous_status) { $_.previous_status } else { "none" }
        $next = if ($_.next_status) { $_.next_status } else { "none" }
        "$prev->$next"
    } | Group-Object | Sort-Object Count -Descending | Select-Object Name, Count
    $rejectedAssets = $entries | Where-Object { $_.status -eq 'rejected' } | Group-Object -Property name | Sort-Object Count -Descending | Select-Object -First 10 Name, Count
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
        approval_required_count = $approvalRequired
        approval_required_pct = [math]::Round(($approvalRequired / $total) * 100, 1)
        pending_approval_count = $pendingApproval
        shadow_trial_count = $shadowTrials.Count
        shadow_user_judgement_counts = @($shadowTrials | Where-Object { $_.user_judgement } | Group-Object -Property user_judgement | Sort-Object Count -Descending | Select-Object Name, Count)
        status_counts = $statusCounts
        user_reply_type_counts = $replyTypeCounts
        proposal_transition_counts = $transitionCounts
        top_10_assets = $topAssets
        rejected_assets = $rejectedAssets
        deprecated_calls_by_oldname = $aliasMap
    }
}
