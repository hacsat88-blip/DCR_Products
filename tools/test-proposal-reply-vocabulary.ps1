#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for Proposal Reply Vocabulary V5.

.DESCRIPTION
  Directly exercises Resolve-ProposalReply so natural-language approval,
  refine, reject, and ambiguous replies stay deterministic across runtimes.
#>

param(
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$GateStateLib = Join-Path $RepoRoot "tools\lib\gate-state.ps1"
if (-not (Test-Path $GateStateLib)) {
    throw "gate-state.ps1 not found: $GateStateLib"
}
. $GateStateLib

function New-Text {
    param([Parameter(Mandatory)][int[]]$Codepoints)
    return (New-Utf16String -Codepoints $Codepoints)
}

function New-TestProposal {
    param(
        [ValidateSet('none','proposed','approved','rejected','refined','expired')][string]$Status = "proposed",
        [string]$RecommendedOption = "A",
        [string[]]$OptionIds = @("A","B","C")
    )
    $options = @()
    foreach ($id in $OptionIds) {
        $options += [pscustomobject]@{
            id = $id
            kind = "agent"
            name = "candidate-$id"
            reason = "test route $id"
            expected_effect = "test effect $id"
        }
    }

    return [pscustomobject]@{
        proposal_id = if ($Status -eq "none") { "" } else { "rt-v5-smoke" }
        status = $Status
        mode = "propose"
        options = $options
        recommended_option = $RecommendedOption
        selected_option = ""
        created_at = "2026-05-17T00:00:00Z"
        updated_at = "2026-05-17T00:00:00Z"
        last_user_reply_type = "none"
    }
}

function Assert-Resolution {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Reply,
        [Parameter(Mandatory)][object]$Proposal,
        [Parameter(Mandatory)][string]$ExpectedType,
        [Parameter(Mandatory)][AllowEmptyString()][string]$ExpectedSelected,
        [Parameter(Mandatory)][string]$ExpectedNextStatus
    )

    $resolved = Resolve-ProposalReply -UserReply $Reply -ProposalState $Proposal
    if ($resolved.user_reply_type -ne $ExpectedType) {
        throw "$Label user_reply_type expected '$ExpectedType' but got '$($resolved.user_reply_type)'"
    }
    if ($resolved.selected_option -ne $ExpectedSelected) {
        throw "$Label selected_option expected '$ExpectedSelected' but got '$($resolved.selected_option)'"
    }
    if ($resolved.next_status -ne $ExpectedNextStatus) {
        throw "$Label next_status expected '$ExpectedNextStatus' but got '$($resolved.next_status)'"
    }
}

$multi = New-TestProposal -Status "proposed" -RecommendedOption "A" -OptionIds @("A","B","C")
$single = New-TestProposal -Status "proposed" -RecommendedOption "A" -OptionIds @("A")
$none = New-TestProposal -Status "none" -RecommendedOption "" -OptionIds @()

$cases = @(
    @{ label = "recommended approval"; reply = (New-Text @(0x304a,0x3059,0x3059,0x3081,0x3067,0x9032,0x3081,0x3066)); proposal = $multi; type = "approve"; selected = "A"; next = "approved" },
    @{ label = "recommended synonym"; reply = (New-Text @(0x63a8,0x5968,0x3067)); proposal = $multi; type = "approve"; selected = "A"; next = "approved" },
    @{ label = "explicit A"; reply = ("A" + (New-Text @(0x3067))); proposal = $multi; type = "approve"; selected = "A"; next = "approved" },
    @{ label = "explicit 1"; reply = ("1" + (New-Text @(0x3067))); proposal = $multi; type = "approve"; selected = "A"; next = "approved" },
    @{ label = "explicit B"; reply = ("B" + (New-Text @(0x3067))); proposal = $multi; type = "approve"; selected = "B"; next = "approved" },
    @{ label = "explicit 2"; reply = ("2" + (New-Text @(0x3067))); proposal = $multi; type = "approve"; selected = "B"; next = "approved" },

    @{ label = "generic sorede multi"; reply = (New-Text @(0x305d,0x308c,0x3067)); proposal = $multi; type = "ambiguous"; selected = ""; next = "proposed" },
    @{ label = "generic proceed multi"; reply = (New-Text @(0x9032,0x3081,0x3066)); proposal = $multi; type = "ambiguous"; selected = ""; next = "proposed" },
    @{ label = "generic approve multi"; reply = (New-Text @(0x627f,0x8a8d)); proposal = $multi; type = "ambiguous"; selected = ""; next = "proposed" },
    @{ label = "generic ok multi"; reply = "OK"; proposal = $multi; type = "ambiguous"; selected = ""; next = "proposed" },

    @{ label = "generic sorede single"; reply = (New-Text @(0x305d,0x308c,0x3067)); proposal = $single; type = "approve"; selected = "A"; next = "approved" },
    @{ label = "generic proceed single"; reply = (New-Text @(0x9032,0x3081,0x3066)); proposal = $single; type = "approve"; selected = "A"; next = "approved" },
    @{ label = "generic approve single"; reply = (New-Text @(0x627f,0x8a8d)); proposal = $single; type = "approve"; selected = "A"; next = "approved" },
    @{ label = "generic ok single"; reply = "OK"; proposal = $single; type = "approve"; selected = "A"; next = "approved" },

    @{ label = "refine other option"; reply = (New-Text @(0x5225,0x306e,0x6848)); proposal = $multi; type = "refine"; selected = ""; next = "refined" },
    @{ label = "refine lighter"; reply = (New-Text @(0x8efd,0x304f)); proposal = $multi; type = "refine"; selected = ""; next = "refined" },
    @{ label = "refine detailed"; reply = (New-Text @(0x8a73,0x3057,0x304f)); proposal = $multi; type = "refine"; selected = ""; next = "refined" },

    @{ label = "ambiguous leave it"; reply = (New-Text @(0x4efb,0x305b,0x308b)); proposal = $multi; type = "ambiguous"; selected = ""; next = "proposed" },
    @{ label = "ambiguous omakase"; reply = (New-Text @(0x304a,0x307e,0x304b,0x305b)); proposal = $multi; type = "ambiguous"; selected = ""; next = "proposed" },
    @{ label = "ambiguous looks good"; reply = (New-Text @(0x3088,0x3055,0x305d,0x3046)); proposal = $multi; type = "ambiguous"; selected = ""; next = "proposed" },
    @{ label = "ambiguous maybe"; reply = (New-Text @(0x591a,0x5206)); proposal = $multi; type = "ambiguous"; selected = ""; next = "proposed" },

    @{ label = "reject cancel"; reply = (New-Text @(0x30ad,0x30e3,0x30f3,0x30bb,0x30eb)); proposal = $multi; type = "reject"; selected = ""; next = "rejected" },
    @{ label = "reject stop"; reply = (New-Text @(0x4e2d,0x6b62)); proposal = $multi; type = "reject"; selected = ""; next = "rejected" },
    @{ label = "reject unnecessary"; reply = (New-Text @(0x4e0d,0x8981)); proposal = $multi; type = "reject"; selected = ""; next = "rejected" },

    @{ label = "no proposal explicit"; reply = ("A" + (New-Text @(0x3067))); proposal = $none; type = "ambiguous"; selected = ""; next = "none" },
    @{ label = "no proposal generic"; reply = (New-Text @(0x305d,0x308c,0x3067)); proposal = $none; type = "ambiguous"; selected = ""; next = "none" },
    @{ label = "no proposal recommended"; reply = (New-Text @(0x304a,0x3059,0x3059,0x3081,0x3067)); proposal = $none; type = "ambiguous"; selected = ""; next = "none" }
)

foreach ($case in $cases) {
    Assert-Resolution -Label $case.label -Reply $case.reply -Proposal $case.proposal -ExpectedType $case.type -ExpectedSelected $case.selected -ExpectedNextStatus $case.next
}

Write-Host "proposal reply vocabulary V5 smoke passed"
