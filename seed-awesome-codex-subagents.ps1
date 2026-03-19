param(
    [string]$RepoRoot = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

$sourceRoot = Join-Path $RepoRoot '.ai\agents-source'
New-Item -ItemType Directory -Force -Path $sourceRoot | Out-Null

function Get-AgentSandbox {
    param([string]$Name)

    $lower = $Name.ToLowerInvariant()
    if ($lower -match 'reviewer|auditor|detective|debugger|browser-debugger|qa-expert|test-automator|accessibility-tester|performance-engineer|penetration-tester|security-engineer|incident-responder|devops-incident-responder|architect-reviewer|compliance-auditor|risk-manager|search-specialist|docs-researcher|research-analyst|market-researcher|trend-analyst|agent-installer|agent-organizer|context-manager|error-coordinator|knowledge-synthesizer|multi-agent-coordinator|performance-monitor|pied-piper|task-distributor|workflow-orchestrator') {
        return 'read-only'
    }

    return 'workspace-write'
}

function Get-AgentModel {
    param([string]$Name)

    $lower = $Name.ToLowerInvariant()
    if ($lower -match 'reviewer|auditor|detective|debugger|browser-debugger|qa-expert|test-automator|accessibility-tester|performance-engineer|penetration-tester|security-engineer|incident-responder|devops-incident-responder|architect-reviewer|compliance-auditor|risk-manager|quant-analyst|search-specialist|docs-researcher|research-analyst|market-researcher|trend-analyst|agent-installer|agent-organizer|context-manager|error-coordinator|knowledge-synthesizer|multi-agent-coordinator|performance-monitor|pied-piper|task-distributor|workflow-orchestrator') {
        return 'gpt-5.4'
    }

    return 'gpt-5.3-codex-spark'
}

function Get-AgentDescription {
    param(
        [string]$Name,
        [string]$Focus
    )

    $pretty = $Name -replace '-', ' '
    return "Use when you need $pretty support for $Focus."
}

function Get-AgentFocusRules {
    param(
        [string]$Name,
        [string]$Category
    )

    $lower = $Name.ToLowerInvariant()

    if ($Category -eq 'core-development') {
        return @(
            '- Prefer the existing architecture and patterns before introducing new abstractions.',
            '- Keep diffs small and map each change to one clear responsibility.',
            '- Update or add tests when behavior changes.',
            '- State assumptions explicitly when the request leaves room for interpretation.',
            '- Call out any interface, schema, or contract change before applying it.'
        )
    }

    if ($Category -eq 'review-qa') {
        if ($lower -match 'reviewer|code-reviewer|architect-reviewer|security-auditor|ad-security-reviewer|compliance-auditor') {
            return @(
                '- Lead with findings, not summaries.',
                '- Rank issues by severity and explain the concrete failure mode.',
                '- Point to exact files, lines, or reproduction steps when possible.',
                '- Separate correctness, security, and maintainability concerns.',
                '- Say explicitly when no issues were found.'
            )
        }

        if ($lower -match 'debugger|browser-debugger|error-detective') {
            return @(
                '- Use symptom -> failure point -> root cause -> smallest safe fix.',
                '- Prefer one hypothesis at a time and verify it with evidence.',
                '- Keep the fix minimal and explain the validation step.',
                '- Report what was ruled out, not just what was changed.',
                '- Stop once the root cause is confirmed and the fix is sufficient.'
            )
        }

        if ($lower -match 'qa-expert|test-automator|accessibility-tester|performance-engineer|penetration-tester|chaos-engineer') {
            return @(
                '- Verify behavior with concrete evidence, not general impressions.',
                '- Cover happy path, regression risk, and at least one negative case.',
                '- Record the exact command, scenario, and observed result.',
                '- If a failure is found, reduce it to the smallest reproduction.',
                '- Call out residual risk if full coverage is not practical.'
            )
        }
    }

    if ($Category -eq 'ops-maintenance') {
        if ($lower -match 'incident-responder|devops-incident-responder') {
            return @(
                '- Triage first, then contain, then restore service.',
                '- Preserve evidence and timeline details while you work.',
                '- Prefer the smallest safe mitigation over broad changes.',
                '- Call out blast radius, rollback path, and verification steps.',
                '- Separate immediate recovery from follow-up hardening.'
            )
        }

        if ($lower -match 'devops-engineer|sre-engineer|platform-engineer|cloud-architect|deployment-engineer|docker-expert|kubernetes-specialist|terraform-engineer|terragrunt-expert|azure-infra-engineer|windows-infra-admin') {
            return @(
                '- Treat changes as production work: plan, validate, and rollback safely.',
                '- Prefer idempotent changes and configuration drift checks.',
                '- Verify monitoring, alerts, and failure modes after each change.',
                '- Document dependencies, environment assumptions, and cutover steps.',
                '- Avoid partial infrastructure changes that cannot be easily reverted.'
            )
        }

        if ($lower -match 'security-engineer|penetration-tester|security-auditor|ad-security-reviewer') {
            return @(
                '- Default to least privilege and explicit trust boundaries.',
                '- Check secret handling, identity, and exposure paths first.',
                '- Call out security impact separately from functional behavior.',
                '- Prefer reversible mitigation when responding to risk.',
                '- If hardening changes affect availability, state the trade-off plainly.'
            )
        }

        if ($lower -match 'database-administrator|database-optimizer|postgres-pro') {
            return @(
                '- Protect data first: backups, restore path, and migration safety come first.',
                '- Validate schema, index, and query changes against production risk.',
                '- Call out locking, downtime, and rollback implications.',
                '- Prefer additive changes and staged rollout when possible.',
                '- Confirm data integrity after maintenance or migration work.'
            )
        }
    }

    if ($Category -eq 'research-analysis') {
        if ($lower -match 'search-specialist|docs-researcher') {
            return @(
                '- Start with authoritative sources and cite the exact material used.',
                '- Prefer primary documentation, official pages, papers, or source repositories.',
                '- Separate verified facts from inference and label both clearly.',
                '- Narrow the search before broadening it.',
                '- Say when the evidence is insufficient instead of filling gaps.'
            )
        }

        if ($lower -match 'research-analyst|competitive-analyst|market-researcher') {
            return @(
                '- Define the question, audience, and decision criteria before analyzing.',
                '- Compare alternatives on the same dimensions and state the trade-offs.',
                '- Prefer structured summaries over long narrative notes.',
                '- Distinguish observed evidence from interpretation.',
                '- End with a recommendation or a clear list of open uncertainties.'
            )
        }

        if ($lower -match 'data-researcher|trend-analyst') {
            return @(
                '- Check data provenance, time range, and sampling assumptions first.',
                '- Call out missing data, bias, and outliers explicitly.',
                '- Summarize patterns in a form that can be tested or reproduced.',
                '- Avoid treating correlation as causation.',
                '- Include the strongest caveat that affects the conclusion.'
            )
        }
    }

    return @(
        '- Make the smallest safe change that satisfies the task.',
        '- Prefer file-level clarity and explicit assumptions.',
        '- Keep output concise and actionable.',
        '- If the request is ambiguous, state the assumption before proceeding.'
    )
}

function Write-AgentFiles {
    param(
        [string]$Name,
        [string]$Focus
    )

    $description = Get-AgentDescription -Name $Name -Focus $Focus
    $model = Get-AgentModel -Name $Name
    $sandbox = Get-AgentSandbox -Name $Name
    $category = if ($Focus -like '*reviewing correctness*' -or $Name -match 'reviewer|code-reviewer|debugger|qa-expert|browser-debugger|architect-reviewer|security-auditor|ad-security-reviewer|test-automator|accessibility-tester|performance-engineer|penetration-tester|compliance-auditor|error-detective|chaos-engineer') {
        'review-qa'
    } elseif ($Focus -like '*cloud, deployment, networking, containers, and infrastructure automation*') {
        'ops-maintenance'
    } elseif ($Focus -like '*search, synthesis, market analysis, and documentation-backed verification*') {
        'research-analysis'
    } elseif ($Focus -like '*core feature work*') {
        'core-development'
    } else {
        'general'
    }
    $focusRules = Get-AgentFocusRules -Name $Name -Category $category

    $codexPath = Join-Path $sourceRoot "$Name.toml"
    $claudePath = Join-Path $sourceRoot "$Name.md"

    $focusRulesText = ($focusRules -join "`n")

    $codexContent = @"
name = "$Name"
description = "$description"
model = "$model"
model_reasoning_effort = "medium"
sandbox_mode = "$sandbox"

[instructions]
text = """
You are the $Name Codex subagent.

Primary focus: $Focus.

Working rules:
$focusRulesText
"""
"@

    $claudeContent = @"
---
name: $Name
description: $description
---

You are the $Name Claude Code subagent.

Primary focus: $Focus.

Working rules:
$focusRulesText
"@

    Set-Content -Path $codexPath -Value $codexContent -Encoding UTF8
    Set-Content -Path $claudePath -Value $claudeContent -Encoding UTF8
}

$categories = @(
    @{
        Name = '01 Core Development'
        Focus = 'core feature work, module boundaries, and implementation across frontend and backend'
        Agents = @(
            'api-designer',
            'backend-developer',
            'code-mapper',
            'electron-pro',
            'frontend-developer',
            'fullstack-developer',
            'graphql-architect',
            'microservices-architect',
            'mobile-developer',
            'ui-designer',
            'ui-fixer',
            'websocket-engineer'
        )
    },
    @{
        Name = '02 Language Specialists'
        Focus = 'language-specific and framework-specific implementation'
        Agents = @(
            'angular-architect',
            'cpp-pro',
            'csharp-developer',
            'django-developer',
            'dotnet-core-expert',
            'dotnet-framework-4.8-expert',
            'elixir-expert',
            'flutter-expert',
            'golang-pro',
            'java-architect',
            'javascript-pro',
            'kotlin-specialist',
            'laravel-specialist',
            'nextjs-developer',
            'php-pro',
            'powershell-5.1-expert',
            'powershell-7-expert',
            'python-pro',
            'rails-expert',
            'react-specialist',
            'rust-engineer',
            'spring-boot-engineer',
            'sql-pro',
            'swift-expert',
            'typescript-pro',
            'vue-expert'
        )
    },
    @{
        Name = '03 Infrastructure'
        Focus = 'cloud, deployment, networking, containers, and infrastructure automation'
        Agents = @(
            'azure-infra-engineer',
            'cloud-architect',
            'database-administrator',
            'deployment-engineer',
            'devops-engineer',
            'devops-incident-responder',
            'docker-expert',
            'incident-responder',
            'kubernetes-specialist',
            'network-engineer',
            'platform-engineer',
            'security-engineer',
            'sre-engineer',
            'terraform-engineer',
            'terragrunt-expert',
            'windows-infra-admin'
        )
    },
    @{
        Name = '04 Quality & Security'
        Focus = 'reviewing correctness, debugging, testing, resilience, and security'
        Agents = @(
            'accessibility-tester',
            'ad-security-reviewer',
            'architect-reviewer',
            'browser-debugger',
            'chaos-engineer',
            'code-reviewer',
            'compliance-auditor',
            'debugger',
            'error-detective',
            'penetration-tester',
            'performance-engineer',
            'powershell-security-hardening',
            'qa-expert',
            'reviewer',
            'security-auditor',
            'test-automator'
        )
    },
    @{
        Name = '05 Data & AI'
        Focus = 'data pipelines, analytics, machine learning, LLMs, and prompt and system design'
        Agents = @(
            'ai-engineer',
            'data-analyst',
            'data-engineer',
            'data-scientist',
            'database-optimizer',
            'llm-architect',
            'machine-learning-engineer',
            'ml-engineer',
            'mlops-engineer',
            'nlp-engineer',
            'postgres-pro',
            'prompt-engineer'
        )
    },
    @{
        Name = '06 Developer Experience'
        Focus = 'build systems, CLIs, tooling, refactoring, documentation, and developer productivity'
        Agents = @(
            'build-engineer',
            'cli-developer',
            'dependency-manager',
            'documentation-engineer',
            'dx-optimizer',
            'git-workflow-manager',
            'legacy-modernizer',
            'mcp-developer',
            'powershell-module-architect',
            'powershell-ui-architect',
            'refactoring-specialist',
            'slack-expert',
            'tooling-engineer'
        )
    },
    @{
        Name = '07 Specialized Domains'
        Focus = 'domain-specific systems such as fintech, embedded, mobile, IoT, SEO, and blockchain'
        Agents = @(
            'api-documenter',
            'blockchain-developer',
            'embedded-systems',
            'fintech-engineer',
            'game-developer',
            'iot-engineer',
            'm365-admin',
            'mobile-app-developer',
            'payment-integration',
            'quant-analyst',
            'risk-manager',
            'seo-specialist'
        )
    },
    @{
        Name = '08 Business & Product'
        Focus = 'requirements, product strategy, documentation, research, and customer-facing work'
        Agents = @(
            'business-analyst',
            'content-marketer',
            'customer-success-manager',
            'legal-advisor',
            'product-manager',
            'project-manager',
            'sales-engineer',
            'scrum-master',
            'technical-writer',
            'ux-researcher',
            'wordpress-master'
        )
    },
    @{
        Name = '09 Meta & Orchestration'
        Focus = 'agent coordination, context management, recovery, and workflow automation'
        Agents = @(
            'agent-installer',
            'agent-organizer',
            'context-manager',
            'error-coordinator',
            'it-ops-orchestrator',
            'knowledge-synthesizer',
            'multi-agent-coordinator',
            'performance-monitor',
            'pied-piper',
            'task-distributor',
            'workflow-orchestrator'
        )
    },
    @{
        Name = '10 Research & Analysis'
        Focus = 'search, synthesis, market analysis, and documentation-backed verification'
        Agents = @(
            'competitive-analyst',
            'data-researcher',
            'docs-researcher',
            'market-researcher',
            'research-analyst',
            'search-specialist',
            'trend-analyst'
        )
    }
)

foreach ($category in $categories) {
    foreach ($agent in $category.Agents) {
        Write-AgentFiles -Name $agent -Focus $category.Focus
    }
}

& (Join-Path $RepoRoot 'sync-agents.ps1') -RepoRoot $RepoRoot

Write-Host "Generated $((Get-ChildItem -Path $sourceRoot -File -Filter '*.toml').Count) Codex agent file(s) and $((Get-ChildItem -Path $sourceRoot -File -Filter '*.md' | Where-Object { $_.Name -ne 'README.md' }).Count) Claude agent file(s) in the source folder."
