# Post-response hook: Log Cascade responses for quality tracking
$json = $Input | ConvertFrom-Json
$response = $json.tool_info.response

$logDir = Join-Path (Get-Location) ".windsurf/logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logEntry = @{
    timestamp = Get-Date -Format "o"
    model = $json.model_name
    responseLength = if ($response) { $response.Length } else { 0 }
    trajectoryId = $json.trajectory_id
}

$logFile = Join-Path $logDir "responses_$(Get-Date -Format 'yyyyMMdd').jsonl"
$logEntry | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8

exit 0
