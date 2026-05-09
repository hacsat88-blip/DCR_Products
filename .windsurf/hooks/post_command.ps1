# Post-command hook: Log command execution for audit trail
$json = $Input | ConvertFrom-Json
$command = $json.tool_info.command

$logDir = Join-Path (Get-Location) ".windsurf/logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logEntry = @{
    timestamp = Get-Date -Format "o"
    action = "command"
    command = $command
    exitCode = $json.tool_info.exit_code
}

$logFile = Join-Path $logDir "commands_$(Get-Date -Format 'yyyyMMdd').jsonl"
$logEntry | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8

exit 0
