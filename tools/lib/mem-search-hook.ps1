# UserPromptSubmit hook: inject related memories into context.
# Fail-open: exits 0 silently when mem_cli.py or python3 is absent,
# so a machine without the memory DB never blocks the prompt.
#
# .EXAMPLE
#   pwsh -NoProfile -ExecutionPolicy Bypass -File tools/lib/mem-search-hook.ps1
$ErrorActionPreference = 'Stop'
try {
    . (Join-Path $PSScriptRoot 'resolve-claude-memory.ps1')
    $paths = Get-ClaudeMemoryPaths
    if (-not $paths) { exit 0 }
    $python = Get-ClaudePython
    if (-not $python) { exit 0 }
    & $python -X utf8 $paths.MemCli search-hook
    exit 0
} catch {
    exit 0
}
