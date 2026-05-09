# Pre-prompt hook: Memory search + policy check
$json = $Input | ConvertFrom-Json

$prompt = if ($json.tool_info.prompt) { $json.tool_info.prompt }
          elseif ($json.prompt) { $json.prompt }
          else { "" }

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
. (Join-Path $repoRoot "tools\lib\resolve-claude-memory.ps1")

$mem = Get-ClaudeMemoryPaths
$memCli = if ($mem) { $mem.MemCli } else { $null }

if ($prompt -and $memCli -and (Test-Path -LiteralPath $memCli)) {
    python -X utf8 $memCli search $prompt --top 3
}

$violations = @(
    "password",
    "api.?key",
    "secret",
    "token",
    "credential"
)

foreach ($violation in $violations) {
    if ($prompt -match $violation) {
        Write-Host "WARNING: Prompt may contain sensitive information: $violation"
    }
}

exit 0
