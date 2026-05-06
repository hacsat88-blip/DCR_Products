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

$watched = @('/.ai/', '/.devin/', '/templates/', '/tools/adapters/', '/deploy.ps1', '/validate.ps1')
foreach ($item in $watched) {
    if ($lower.Contains($item) -or $lower.StartsWith($item.TrimStart('/'))) {
        Write-Output "Verification reminder: runtime/config files may have changed. Before claiming completion, run ``powershell -ExecutionPolicy Bypass -File ./validate.ps1`` and ``powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -Check``, or report why they were not run."
        exit 0
    }
}

exit 0
