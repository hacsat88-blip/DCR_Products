# Resource Monitor: Track Devin VM resource usage
# Devin-specific hook for long-running sessions

$toolName = $env:DEVIN_TOOL_NAME
$command = $env:DEVIN_COMMAND

# Only monitor for expensive operations
$expensiveTools = @(
    "run_command",
    "bash",
    "terminal"
)

if ($expensiveTools -contains $toolName) {
    # Log resource-intensive operations
    $logDir = Join-Path (Get-Location) ".devin/logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    $logEntry = @{
        timestamp = Get-Date -Format "o"
        tool = $toolName
        command = $command
        estimatedCost = "medium"
    }

    # Heuristic cost estimation
    if ($command -match "npm install|pip install|go mod|cargo build") {
        $logEntry.estimatedCost = "high"
        Write-Host "RESOURCE_MONITOR: High-cost operation detected ($($logEntry.estimatedCost))"
    }

    $logFile = Join-Path $logDir "resources_$(Get-Date -Format 'yyyyMMdd').jsonl"
    $logEntry | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8
}

exit 0
