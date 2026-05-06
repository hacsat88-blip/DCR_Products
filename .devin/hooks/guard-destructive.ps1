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
$collapsed = $lower -replace '\s+', ' '

function Stop-DestructiveCommand {
    param([string]$Label)
    Write-Error "Blocked by Devin destructive-command guard: $Label. Ask for explicit approval for the specific action before proceeding."
    exit 1
}

if ($lower.Contains('rm -rf') -or $lower.Contains('rm -fr')) {
    Stop-DestructiveCommand 'rm recursive/force'
}

if ($lower.Contains('remove-item') -and ($lower.Contains('-recurse') -or $lower.Contains('-force'))) {
    Stop-DestructiveCommand 'Remove-Item recursive/force'
}

if ($lower.Contains('git reset --hard')) {
    Stop-DestructiveCommand 'git reset --hard'
}

if ($lower.Contains('git clean -')) {
    Stop-DestructiveCommand 'git clean destructive flags'
}

if ($lower.Contains('git push') -and $lower.Contains('--force')) {
    Stop-DestructiveCommand 'git push --force'
}

if ($lower.Contains('drop database') -or $lower.Contains('drop schema') -or $lower.Contains('drop table') -or $lower.Contains('truncate table')) {
    Stop-DestructiveCommand 'database drop/truncate'
}

if ($collapsed.Contains('delete from') -and -not $collapsed.Contains(' where ')) {
    Stop-DestructiveCommand 'unqualified SQL delete'
}

exit 0
