param(
    [string]$ToolName = $env:DEVIN_TOOL_NAME,
    [string]$Command = $env:DEVIN_COMMAND,
    [string]$FilePath = $env:DEVIN_FILE_PATH,
    [string]$PayloadPath
)

$ErrorActionPreference = "Stop"

function Get-HookPayloadText {
    if ($PayloadPath -and (Test-Path -LiteralPath $PayloadPath)) {
        return Get-Content -LiteralPath $PayloadPath -Raw -Encoding UTF8
    }
    if ([Console]::IsInputRedirected -and -not ($ToolName -or $Command -or $FilePath)) {
        return [Console]::In.ReadToEnd()
    }
    return ""
}

$payloadText = Get-HookPayloadText
$haystack = @($ToolName, $Command, $FilePath, $PayloadPath, ($args -join " "), $payloadText) -join "`n"
$normalized = $haystack.Replace([char]92, '/')
$lower = $normalized.ToLowerInvariant()
$tokens = $lower -split '[\s"''{},;]+'

$writeIntentWords = @('apply_patch', 'write', 'edit', 'create', 'delete', 'move', 'copy-item', 'set-content', 'out-file', 'new-item', 'remove-item')
$hasWriteIntent = $false
foreach ($word in $writeIntentWords) {
    if ($lower.Contains($word)) {
        $hasWriteIntent = $true
        break
    }
}
if (-not $hasWriteIntent -and ($lower.Contains('*** add file:') -or $lower.Contains('*** update file:') -or $lower.Contains('*** delete file:') -or $lower.Contains('>') -or $lower.Contains('>>'))) {
    $hasWriteIntent = $true
}

if (-not $hasWriteIntent) {
    exit 0
}

foreach ($token in $tokens) {
    $t = $token.Trim()
    if ([string]::IsNullOrWhiteSpace($t)) {
        continue
    }
    if (
        $t -eq 'agents.md' -or $t.EndsWith('/agents.md') -or
        $t -eq 'claude.md' -or $t.EndsWith('/claude.md') -or
        $t -eq 'opencode.json' -or $t.EndsWith('/opencode.json') -or
        $t -eq '.opencode/kernel.md' -or $t.EndsWith('/.opencode/kernel.md') -or
        $t -eq '.opencode/opencode.json' -or $t.EndsWith('/.opencode/opencode.json')
    ) {
        Write-Error "Blocked by Devin generated-file guard. Edit the `.ai/` source of truth or templates, then regenerate mirrors instead of editing generated output directly."
        exit 1
    }
}

$generatedDirectories = @('.windsurf/', '.cursor/', '.codex/agents/', '.claude/agents/')
foreach ($dir in $generatedDirectories) {
    foreach ($token in $tokens) {
        $t = $token.Trim()
        while ($t.StartsWith('./')) {
            $t = $t.Substring(2)
        }
        $t = $t.TrimStart('/')
        if ($t.StartsWith($dir)) {
            Write-Error "Blocked by Devin generated-file guard. Edit the `.ai/` source of truth or templates, then regenerate mirrors instead of editing generated output directly."
            exit 1
        }
    }
    if ($lower.Contains('/' + $dir)) {
        Write-Error "Blocked by Devin generated-file guard. Edit the `.ai/` source of truth or templates, then regenerate mirrors instead of editing generated output directly."
        exit 1
    }
}

exit 0
