param(
    [string]$RepoRoot = ".",
    [string]$OutputPath = "",
    [switch]$Quiet
)

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths
$DeprecatedAliases = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\deprecated-aliases.ps1"
. $DeprecatedAliases

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"
$agentsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"

function Write-CodexStatus {
    param([string]$Message, [string]$Color = "Green")
    if (-not $Quiet) { Write-Host $Message -ForegroundColor $Color }
}

function New-Text {
    param([int[]]$Codepoints)
    return -join ($Codepoints | ForEach-Object { [char]$_ })
}

Write-CodexStatus -Message "[codex] Generating AGENTS.md..." -Color "Cyan"

function Get-Targets($file) {
    $text = Get-Content $file.FullName -Raw
    if ($text -match '(?s)^---.*?^targets:\s*\n((?:.*?\n)*?)(?:^---|^$)') {
        return [regex]::Matches($Matches[1], '^\s*-\s*(.+)$', 'Multiline') | ForEach-Object { $_.Groups[1].Value }
    }
    return @()
}

$activeRules = @()
$activeSkills = @()
$activeAgents = @()
$deprecatedRules = @()
$deprecatedSkills = @()
$deprecatedAgents = @()
$deprecatedAliasRows = @(Get-DcrDeprecatedAliases -RepoRoot $RepoRoot)
$deprecatedAliasByKey = @{}
foreach ($alias in $deprecatedAliasRows) {
    $deprecatedAliasByKey["$($alias.kind):$($alias.name)"] = $alias
}

function Get-DeprecationInfo($kind, $name) {
    $key = "$kind`:$name"
    if ($deprecatedAliasByKey.ContainsKey($key)) {
        return @{ Deprecated = $true; Successor = $deprecatedAliasByKey[$key].successor; State = $deprecatedAliasByKey[$key].state }
    }
    return @{ Deprecated = $false; Successor = $null; State = $null }
}

foreach ($f in Get-ChildItem $rulesDir -Filter "*.md" | Where-Object { -not $_.BaseName.StartsWith("_") }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("claude", "codex", "cursor") }
    if ($targets -contains "codex") {
        $dep = Get-DeprecationInfo "rule" $f.BaseName
        if ($dep.Deprecated) { $deprecatedRules += [pscustomobject]@{ Name = $f.BaseName; Successor = $dep.Successor } } else { $activeRules += $f.BaseName }
    }
}

foreach ($dir in Get-ChildItem $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
    $sf = Join-Path $dir.FullName "SKILL.md"
    if (Test-Path $sf) {
        $sfItem = Get-Item $sf
        $targets = Get-Targets $sfItem
        if (-not $targets) { $targets = @("claude", "codex", "cursor") }
        if ($targets -contains "codex") {
            $dep = Get-DeprecationInfo "skill" $dir.Name
            if ($dep.Deprecated) { $deprecatedSkills += [pscustomobject]@{ Name = $dir.Name; Successor = $dep.Successor } } else { $activeSkills += $dir.Name }
        }
    }
}

foreach ($f in Get-ChildItem $agentsDir -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }) {
    $targets = Get-Targets $f
    if (-not $targets) { $targets = @("codex", "claude") }
    if ($targets -contains "codex") {
        $dep = Get-DeprecationInfo "agent" $f.BaseName
        if ($dep.Deprecated) { $deprecatedAgents += [pscustomobject]@{ Name = $f.BaseName; Successor = $dep.Successor } } else { $activeAgents += $f.BaseName }
    }
}

foreach ($alias in $deprecatedAliasRows | Where-Object { $_.state -eq "removed" }) {
    if ($alias.kind -eq "rule") { $deprecatedRules += [pscustomobject]@{ Name = $alias.name; Successor = $alias.successor } }
    if ($alias.kind -eq "skill") { $deprecatedSkills += [pscustomobject]@{ Name = $alias.name; Successor = $alias.successor } }
    if ($alias.kind -eq "agent") { $deprecatedAgents += [pscustomobject]@{ Name = $alias.name; Successor = $alias.successor } }
}

$activeRuleCount = $activeRules.Count
$activeSkillCount = $activeSkills.Count
$activeAgentCount = $activeAgents.Count
$deprecatedRuleCount = $deprecatedRules.Count
$deprecatedSkillCount = $deprecatedSkills.Count
$deprecatedAgentCount = $deprecatedAgents.Count
$MarkdownTick = [char]96
$TermOsusume = New-Text @(0x304a,0x3059,0x3059,0x3081,0x3067)
$TermSuisho = New-Text @(0x63a8,0x5968,0x3067)
$TermOmakase = New-Text @(0x304a,0x307e,0x304b,0x305b)
$TermCancel = New-Text @(0x30ad,0x30e3,0x30f3,0x30bb,0x30eb)
$TermBetsuan = New-Text @(0x5225,0x6848)
$TermKaruku = New-Text @(0x8efd,0x304f)

$content = @"
<!-- AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
Generated from: .ai/book + .ai/kernel + .ai/catalog/rules/ + .ai/catalog/skills/ + .ai/catalog/agents-source/
To regenerate: Run pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# Codex Entrypoint

Unified entry point for the Codex environment.

## Scope Summary

- Active rules: $activeRuleCount
- Active skills: $activeSkillCount
- Active agents: $activeAgentCount
- Deprecated aliases (rules/skills/agents): $deprecatedRuleCount / $deprecatedSkillCount / $deprecatedAgentCount

## Source of Truth

- Rules: [.ai/catalog/rules/](.ai/catalog/rules/)
- Skills: [.ai/catalog/skills/](.ai/catalog/skills/)
- Agents: [.ai/catalog/agents-source/](.ai/catalog/agents-source/)
- Shared Book: [.ai/book/](.ai/book/)
- Kernel: [.ai/kernel/](.ai/kernel/)
- Environment diff (Codex): [.ai/environments/codex/kernel.md](.ai/environments/codex/kernel.md)

---

## Unified Coordinator

Primary coordinator: **pied-piper** agent. Route Rule/Skill/Agent selection through **unified-router**, reduce candidates to the necessary set, and report the candidate, reason, and expected effect before firing.

When Skill, Agent, subagent, parallel orchestration, external MCP/API, or P2/P3 operation is involved, use candidate proposal -> user approval -> execution. P1 read-only low-risk exploration may proceed after a short notice.

Approval vocabulary is strict. ${MarkdownTick}$TermOsusume${MarkdownTick} / ${MarkdownTick}$TermSuisho${MarkdownTick} / ${MarkdownTick}A${MarkdownTick} / ${MarkdownTick}1${MarkdownTick} approve only when they bind to one immediately previous candidate. ${MarkdownTick}OK${MarkdownTick} approves only when there is a single candidate.

Ambiguous terms such as ${MarkdownTick}$TermOmakase${MarkdownTick} require a proposal or reconfirmation, not execution. ${MarkdownTick}$TermCancel${MarkdownTick} rejects. ${MarkdownTick}$TermBetsuan${MarkdownTick} / ${MarkdownTick}$TermKaruku${MarkdownTick} request a refined proposal.

If ${MarkdownTick}.ai/kernel/gate-state.json${MarkdownTick} has ${MarkdownTick}proposal_state.status = proposed|refined${MarkdownTick}, interpret short next messages as responses to the active proposal before normal routing. Classification follows ${MarkdownTick}tools/lib/gate-state.ps1${MarkdownTick}.

## Completion Review Proposal

For implementation, generated output, configuration, MCP/API, or source-of-truth changes, propose ${MarkdownTick}a/${MarkdownTick} Review Gate + ${MarkdownTick}code-reviewer${MarkdownTick} before final completion unless the work is trivial docs/typo, read-only investigation, or the user explicitly says no review.

## Runtime Memory Preflight

For questions that depend on previous DCR decisions, recall runtime memory before acting. Memory is only supporting context; current repo artifacts, ${MarkdownTick}.ai/catalog${MarkdownTick}, ${MarkdownTick}.ai/book${MarkdownTick}, and git state remain authoritative.

Details:
- [.ai/module/unified-coordinator.md](.ai/module/unified-coordinator.md)
- [.ai/module/unified-router.md](.ai/module/unified-router.md)
- [.ai/module/unified-integration.md](.ai/module/unified-integration.md)

---

## Response Language

Answer in Japanese unless the user explicitly asks for another language.
"@

$utf8 = New-Object System.Text.UTF8Encoding $false
$destination = if ([string]::IsNullOrWhiteSpace($OutputPath)) { "$RepoRoot/AGENTS.md" } else { $OutputPath }
[System.IO.File]::WriteAllText($destination, ($content.TrimEnd() + [Environment]::NewLine), $utf8)

Write-CodexStatus -Message "  [OK] AGENTS.md"
Write-CodexStatus -Message ""
