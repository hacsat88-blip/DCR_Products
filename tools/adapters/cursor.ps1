param(
    [string]$RepoRoot = ".",
    [string]$OutputRoot = "",
    [switch]$Quiet
)

$outRoot = if ([string]::IsNullOrWhiteSpace($OutputRoot)) { Join-Path $RepoRoot ".cursor" } else { $OutputRoot }
$outRulesDir = Join-Path $outRoot "rules"
$runtimeKernel = Join-Path $RepoRoot ".ai\kernel\dcr-kernel.md"
$cursorIgnorePath = if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    Join-Path $RepoRoot ".cursorignore"
}
else {
    Join-Path (Split-Path $OutputRoot -Parent) ".cursorignore"
}

function Write-CursorStatus {
    param([string]$Message, [string]$Color = "Green")
    if (-not $Quiet) { Write-Host $Message -ForegroundColor $Color }
}

function Remove-LeadingFrontmatter {
    param([string]$Content)
    if (-not $Content) { return $Content }
    if ($Content -match '(?s)^---\r?\n.*?\r?\n---\r?\n?') {
        return $Content.Substring($Matches[0].Length)
    }
    return $Content
}

function Write-Utf8NoBom {
    param([string]$Path, [string]$Content)
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Remove-ExtraCursorFiles {
    param(
        [string]$Root,
        [string[]]$KeepRelativePaths
    )

    if (-not (Test-Path $Root)) { return }

    $resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
    $keep = @{}
    foreach ($relativePath in $KeepRelativePaths) {
        $normalizedKeepPath = $relativePath.Replace('\', '/').ToLowerInvariant()
        $keep[$normalizedKeepPath] = $true
    }

    $files = Get-ChildItem -LiteralPath $resolvedRoot -Recurse -File -Force
    foreach ($file in $files) {
        $relative = $file.FullName.Substring($resolvedRoot.Length + 1).Replace('\', '/').ToLowerInvariant()
        if ($keep.ContainsKey($relative)) { continue }

        $resolvedFile = (Resolve-Path -LiteralPath $file.FullName).Path
        if (-not $resolvedFile.StartsWith($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove path outside Cursor mirror: $resolvedFile"
        }
        Remove-Item -LiteralPath $resolvedFile -Force
    }

    Get-ChildItem -LiteralPath $resolvedRoot -Recurse -Directory -Force |
        Sort-Object FullName -Descending |
        Where-Object { -not (Get-ChildItem -LiteralPath $_.FullName -Force) } |
        ForEach-Object {
            $resolvedDir = (Resolve-Path -LiteralPath $_.FullName).Path
            if (-not $resolvedDir.StartsWith($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
                throw "Refusing to remove path outside Cursor mirror: $resolvedDir"
            }
            Remove-Item -LiteralPath $resolvedDir -Force
        }
}

function New-Text {
    param([int[]]$Codepoints)
    return -join ($Codepoints | ForEach-Object { [char]$_ })
}

Write-CursorStatus -Message "[cursor] Generating .cursor mirror..." -Color "Cyan"
New-Item -ItemType Directory -Path $outRulesDir -Force | Out-Null

$readme = @"
# Cursor mirror (generated)

This `.cursor/` directory is a lightweight mirror.
Do not edit files here directly. Edit `.ai/` and regenerate.

## Source of Truth

- Shared Book: `../.ai/book/`
- Kernel: `../.ai/kernel/`
- Rules: `../.ai/catalog/rules/`
- Skills: `../.ai/catalog/skills/`
- Agents: `../.ai/catalog/agents-source/`
- Cursor environment diff: `../.ai/environments/cursor/kernel.md`

## Regenerate

Run: pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Target cursor
"@

Write-Utf8NoBom -Path (Join-Path $outRoot "README.md") -Content ($readme.TrimEnd() + "`r`n")
Write-CursorStatus -Message "  [OK] .cursor/README.md"

$mcpConfig = @"
{
  "mcpServers": {}
}
"@

Write-Utf8NoBom -Path (Join-Path $outRoot "mcp.json") -Content ($mcpConfig.TrimEnd() + "`r`n")
Write-CursorStatus -Message "  [OK] .cursor/mcp.json"

$cursorIgnore = @"
# Generated/runtime mirrors
.cursor/
.codex/agents/
.claude/agents/

# Deprecated rule aliases (hide from Cursor discovery)
.ai/catalog/rules/behavioral-nudge-engine.md
.ai/catalog/rules/evidence-collector.md
.ai/catalog/rules/inclusive-visuals-specialist.md
.ai/catalog/rules/instagram-curator.md
.ai/catalog/rules/reddit-community-builder.md
.ai/catalog/rules/sprint-prioritizer.md
.ai/catalog/rules/test-results-analyzer.md
.ai/catalog/rules/tiktok-strategist.md
.ai/catalog/rules/twitter-engager.md
.ai/catalog/rules/ux-architect.md

# Deprecated skill aliases
.ai/catalog/skills/continuous-learning/
.ai/catalog/skills/schema-markup/
.ai/catalog/skills/skill-router/

# Deprecated agent aliases
.ai/catalog/agents-source/ad-security-reviewer.md
.ai/catalog/agents-source/agent-organizer.md
.ai/catalog/agents-source/ai-prompt-manager-orchestrator.md
.ai/catalog/agents-source/api-designer.md
.ai/catalog/agents-source/api-documenter.md
.ai/catalog/agents-source/architecture-diagram-orchestrator.md
.ai/catalog/agents-source/browser-debugger.md
.ai/catalog/agents-source/competitive-analyst.md
.ai/catalog/agents-source/data-researcher.md
.ai/catalog/agents-source/database-optimizer.md
.ai/catalog/agents-source/deployment-engineer.md
.ai/catalog/agents-source/devops-incident-responder.md
.ai/catalog/agents-source/docs-researcher.md
.ai/catalog/agents-source/error-detective.md
.ai/catalog/agents-source/graphql-architect.md
.ai/catalog/agents-source/knowledge-synthesizer.md
.ai/catalog/agents-source/llm-architect.md
.ai/catalog/agents-source/machine-learning-engineer.md
.ai/catalog/agents-source/market-researcher.md
.ai/catalog/agents-source/microservices-architect.md
.ai/catalog/agents-source/mobile-app-developer.md
.ai/catalog/agents-source/multi-agent-coordinator.md
.ai/catalog/agents-source/nlp-engineer.md
.ai/catalog/agents-source/payment-integration.md
.ai/catalog/agents-source/performance-monitor.md
.ai/catalog/agents-source/platform-engineer.md
.ai/catalog/agents-source/reviewer.md
.ai/catalog/agents-source/risk-manager.md
.ai/catalog/agents-source/search-specialist.md
.ai/catalog/agents-source/task-distributor.md
.ai/catalog/agents-source/tooling-engineer.md
.ai/catalog/agents-source/trend-analyst.md
.ai/catalog/agents-source/ui-fixer.md
.ai/catalog/agents-source/workflow-orchestrator.md
"@

Write-Utf8NoBom -Path $cursorIgnorePath -Content ($cursorIgnore.TrimEnd() + "`r`n")
Write-CursorStatus -Message "  [OK] .cursorignore"

if (Test-Path $runtimeKernel) {
    $kernelRaw = Get-Content -Path $runtimeKernel -Raw -Encoding utf8
    $kernelBody = Remove-LeadingFrontmatter -Content $kernelRaw
    $termOsusume = New-Text @(0x304a,0x3059,0x3059,0x3081,0x3067)
    $termSuisho = New-Text @(0x63a8,0x5968,0x3067)
    $termOmakase = New-Text @(0x304a,0x307e,0x304b,0x305b)
    $termCancel = New-Text @(0x30ad,0x30e3,0x30f3,0x30bb,0x30eb)
    $termBetsuan = New-Text @(0x5225,0x6848)
    $termKaruku = New-Text @(0x8efd,0x304f)
    $tick = [char]96

    $kernelMdc = @(
        "---"
        "description: DCR kernel baseline for Cursor"
        "globs:"
        '  - "**/*"'
        "alwaysApply: true"
        "---"
        ""
        "# DCR Kernel Baseline"
        ""
        'Primary source: ../.ai/book/ and ../.ai/kernel/dcr-kernel.md'
        ""
        "## Unified Coordinator"
        ""
        "Primary coordinator: **pied-piper** agent. Route Rule/Skill/Agent selection through **unified-router**, reduce candidates to the necessary set, and report the candidate, reason, and expected effect before firing."
        ""
        "When Skill, Agent, subagent, parallel orchestration, external MCP/API, or P2/P3 operation is involved, use candidate proposal -> user approval -> execution."
        ""
        "Approval vocabulary is strict. $tick$termOsusume$tick / $tick$termSuisho$tick / ${tick}A$tick / ${tick}1$tick approve only when they bind to one immediately previous candidate. ${tick}OK$tick approves only when there is a single candidate."
        ""
        "Ambiguous terms such as $tick$termOmakase$tick require a proposal or reconfirmation, not execution. $tick$termCancel$tick rejects. $tick$termBetsuan$tick / $tick$termKaruku$tick request a refined proposal."
        ""
        "If ${tick}.ai/kernel/gate-state.json${tick} has ${tick}proposal_state.status = proposed|refined${tick}, interpret short next messages as responses to the active proposal before normal routing. Classification follows ${tick}tools/lib/gate-state.ps1${tick}."
        ""
        $kernelBody.TrimEnd()
        ""
    ) -join "`r`n"

    Write-Utf8NoBom -Path (Join-Path $outRulesDir "dcr-kernel.mdc") -Content $kernelMdc
    Write-CursorStatus -Message "  [OK] .cursor/rules/dcr-kernel.mdc"
}
else {
    Write-Warning ".ai/kernel/dcr-kernel.md not found; skipped .cursor/rules/dcr-kernel.mdc"
}

Remove-ExtraCursorFiles -Root $outRoot -KeepRelativePaths @(
    "README.md",
    "mcp.json",
    "rules\dcr-kernel.mdc"
)

Write-CursorStatus -Message ""
