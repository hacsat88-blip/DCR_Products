param([string]$RepoRoot = ".")

$outRoot = Join-Path $RepoRoot ".cursor"
$outRulesDir = Join-Path $outRoot "rules"
$runtimeKernel = Join-Path $RepoRoot ".ai\kernel\dcr-kernel.md"
$cursorIgnorePath = Join-Path $RepoRoot ".cursorignore"

Write-Host "[cursor] Generating .cursor mirror..." -ForegroundColor Cyan

function Remove-LeadingFrontmatter {
    param([string]$Content)

    if (-not $Content) {
        return $Content
    }

    if ($Content -match '(?s)^---\r?\n.*?\r?\n---\r?\n?') {
        return $Content.Substring($Matches[0].Length)
    }

    return $Content
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

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

Run: `powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Target cursor`
"@

Write-Utf8NoBom -Path (Join-Path $outRoot "README.md") -Content ($readme.TrimEnd() + "`r`n")
Write-Host "  [OK] .cursor/README.md" -ForegroundColor Green

$mcpConfig = @"
{
  "mcpServers": {
    "opencode-bridge": {
      "command": "python",
      "args": [
        "`${workspaceFolder}/tools/mcp-servers/opencode-bridge/server.py"
      ]
    }
  }
}
"@

Write-Utf8NoBom -Path (Join-Path $outRoot "mcp.json") -Content ($mcpConfig.TrimEnd() + "`r`n")
Write-Host "  [OK] .cursor/mcp.json" -ForegroundColor Green

$cursorIgnore = @"
# Generated/runtime mirrors
.cursor/
.windsurf/
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
Write-Host "  [OK] .cursorignore" -ForegroundColor Green

if (Test-Path $runtimeKernel) {
    $kernelRaw = Get-Content -Path $runtimeKernel -Raw -Encoding utf8
    $kernelBody = Remove-LeadingFrontmatter -Content $kernelRaw

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
        $kernelBody.TrimEnd()
        ""
    ) -join "`r`n"

    Write-Utf8NoBom -Path (Join-Path $outRulesDir "dcr-kernel.mdc") -Content $kernelMdc
    Write-Host "  [OK] .cursor/rules/dcr-kernel.mdc" -ForegroundColor Green
}
else {
    Write-Warning ".ai/kernel/dcr-kernel.md not found; skipped .cursor/rules/dcr-kernel.mdc"
}

Write-Host ""
