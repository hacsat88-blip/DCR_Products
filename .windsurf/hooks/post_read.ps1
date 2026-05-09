# Post-read hook: Log file access patterns for Windsurf
$json = $Input | ConvertFrom-Json
$filePath = $json.tool_info.file_path

$logDir = Join-Path (Get-Location) ".windsurf/logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logEntry = @{
    timestamp = Get-Date -Format "o"
    action = "read"
    file = $filePath
}

$logFile = Join-Path $logDir "access_$(Get-Date -Format 'yyyyMMdd').jsonl"
$logEntry | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8

exit 0
