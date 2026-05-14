# Session Health Check: Monitor long-running Devin sessions
$projectRoot = Get-Location
$logDir = Join-Path $projectRoot ".devin/logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Check session duration
$sessionStartFile = Join-Path $logDir "session_start.txt"
if (-not (Test-Path $sessionStartFile)) {
    Get-Date -Format "o" | Out-File -FilePath $sessionStartFile -Encoding UTF8
}

$sessionStart = Get-Content $sessionStartFile -Raw
$startTime = [DateTime]::Parse($sessionStart)
$duration = (Get-Date) - $startTime

# Warn if session has been running longer than 2 hours
if ($duration.TotalHours -gt 2) {
    Write-Host "HEALTH_CHECK: Session running for $($duration.TotalHours.ToString('0.0')) hours. Consider taking a break or reviewing progress."
}

# Check for stuck sessions (no progress for 30 minutes)
$progressFile = Get-ChildItem -LiteralPath $logDir -Filter "progress_*.jsonl" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

$lastProgress = $null
if ($progressFile) {
    $lastProgress = $progressFile.LastWriteTime
    $stuckDuration = (Get-Date) - $lastProgress

    if ($stuckDuration.TotalMinutes -gt 30) {
        Write-Host "HEALTH_CHECK: No progress for $($stuckDuration.TotalMinutes.ToString('0')) minutes. Session may be stuck."
    }
}

# Log current health status
$healthStatus = @{
    timestamp        = Get-Date -Format "o"
    sessionDuration  = $duration.TotalMinutes
    lastProgress     = if ($lastProgress) { $lastProgress.ToString("o") } else { $null }
}

$logFile = Join-Path $logDir "health_$(Get-Date -Format 'yyyyMMdd').jsonl"
$healthStatus | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8

exit 0
