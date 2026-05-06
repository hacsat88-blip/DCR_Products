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

foreach ($token in $tokens) {
    $t = $token.Trim()
    if ([string]::IsNullOrWhiteSpace($t)) {
        continue
    }
    if ($t -eq '.env' -or $t.StartsWith('.env.') -or $t.Contains('/.env') -or $t.EndsWith('.pem') -or $t.EndsWith('.key') -or $t.EndsWith('.p12') -or $t.EndsWith('.pfx') -or $t.EndsWith('/id_rsa') -or $t.EndsWith('/id_dsa') -or $t.EndsWith('/id_ecdsa') -or $t.EndsWith('/id_ed25519') -or $t.Contains('/credentials') -or $t.Contains('/secrets') -or $t.Contains('/wallet') -or $t.Contains('/keystore')) {
        Write-Error "Blocked by Devin secret guard. Do not read, write, print, or commit secret-bearing files or token-like content."
        exit 1
    }
}

$tokenIndicators = @('api_key', 'apikey', 'access_token', 'refresh_token', 'private_key', 'secret_key')
foreach ($indicator in $tokenIndicators) {
    if ($lower.Contains($indicator)) {
        Write-Error "Blocked by Devin secret guard. Do not read, write, print, or commit secret-bearing files or token-like content."
        exit 1
    }
}

exit 0
