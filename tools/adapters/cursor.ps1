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

Run: pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Target cursor
"@

Write-Utf8NoBom -Path (Join-Path $outRoot "README.md") -Content ($readme.TrimEnd() + "`r`n")
Write-Host "  [OK] .cursor/README.md" -ForegroundColor Green

$mcpConfig = @"
{
  "mcpServers": {}
}
"@

Write-Utf8NoBom -Path (Join-Path $outRoot "mcp.json") -Content ($mcpConfig.TrimEnd() + "`r`n")
Write-Host "  [OK] .cursor/mcp.json" -ForegroundColor Green

$cursorIgnore = @"
# Generated/runtime mirrors
.cursor/
.codex/agents/
.claude/agents/
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
