param(
    [string]$Prompt = $env:DEVIN_PROMPT,
    [string]$PayloadPath
)

$ErrorActionPreference = "Stop"

function Get-HookPayloadText {
    if ($PayloadPath -and (Test-Path -LiteralPath $PayloadPath)) {
        return Get-Content -LiteralPath $PayloadPath -Raw -Encoding UTF8
    }
    if ([Console]::IsInputRedirected -and -not $Prompt) {
        return [Console]::In.ReadToEnd()
    }
    return ""
}

$payloadText = Get-HookPayloadText
$haystack = @($Prompt, $PayloadPath, ($args -join " "), $payloadText) -join "`n"

$lines = $haystack -replace "`r", ""
foreach ($line in ($lines -split "`n")) {
    if ($line -match '^\s*(p/|q/|sh/|autopilot:|ralph:|team:|deepsearch:|ultrathink:)') {
        Write-Output "DCR routing hint: control prefix detected. Apply the matching gate or execution mode before acting."
        exit 0
    }
}

if ($haystack -match '(?i)(実装|作成|追加|変更|修正|設定|config|hook|deploy|delete|削除|依存|package|security|セキュリティ)') {
    Write-Output "DCR routing hint: this may require plan-first handling. For config, dependency, destructive, deploy, or security-impacting changes, get explicit approval before editing or executing."
}

exit 0
