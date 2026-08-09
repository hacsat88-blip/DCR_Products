param(
    [string]$RepoRoot = ".",
    [string]$OutputRoot = "",
    [switch]$Quiet
)

$outRoot = if ([string]::IsNullOrWhiteSpace($OutputRoot)) { Join-Path $RepoRoot ".cursor" } else { $OutputRoot }
$outRulesDir = Join-Path $outRoot "rules"
$runtimeKernel = Join-Path $RepoRoot ".ai\core\kernel.md"
$EntrypointOperatingPrinciples = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\entrypoint-operating-principles.ps1"
. $EntrypointOperatingPrinciples
$sharedOperatingPrinciples = Get-DcrEntrypointOperatingPrinciples -RepoRoot $RepoRoot
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

Write-CursorStatus -Message "[cursor] Generating .cursor mirror..." -Color "Cyan"

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

- Core: `../.ai/core/`
- Routing: `../.ai/routing/`
- Rules: `../.ai/catalog/rules/`
- Skills: `../.ai/catalog/skills/`
- Agents: `../.ai/catalog/agents-source/`
- Cursor environment diff: `../.ai/adapters/cursor/kernel.md`

## Regenerate

Run: pwsh -ExecutionPolicy Bypass -File ./deploy.ps1 -Target cursor
"@

Write-Utf8NoBom -Path (Join-Path $outRoot "README.md") -Content ($readme.TrimEnd() + "`n")
Write-CursorStatus -Message "  [OK] .cursor/README.md"

$cursorIgnore = @"
# Runtime-only state
.ai/routing/state/
"@

Write-Utf8NoBom -Path $cursorIgnorePath -Content ($cursorIgnore.TrimEnd() + "`n")
Write-CursorStatus -Message "  [OK] .cursorignore"

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
        'Primary source: ../.ai/core/ and ../.ai/core/kernel.md'
        ""
        $sharedOperatingPrinciples
        ""
        $kernelBody.TrimEnd()
        ""
    ) -join "`n"

    Write-Utf8NoBom -Path (Join-Path $outRulesDir "dcr-kernel.mdc") -Content $kernelMdc
    Write-CursorStatus -Message "  [OK] .cursor/rules/dcr-kernel.mdc"
}
else {
    Write-Warning ".ai/core/kernel.md not found; skipped .cursor/rules/dcr-kernel.mdc"
}

Write-CursorStatus -Message ""
