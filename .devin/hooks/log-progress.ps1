# Progress Logger: Track Devin session progress
# Devin-specific for long-running task visibility

$toolName = $env:DEVIN_TOOL_NAME
$filePath = $env:DEVIN_FILE_PATH

$projectRoot = Get-Location
$logDir = Join-Path $projectRoot ".devin/logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Track progress milestones
$milestoneTools = @(
    "edit_file",
    "create_file",
    "run_command",
    "bash"
)

if ($milestoneTools -contains $toolName) {
    $progressEntry = @{
        timestamp = Get-Date -Format "o"
        tool = $toolName
        file = if ($filePath) { $filePath } else { $null }
        milestone = $true
    }

    $logFile = Join-Path $logDir "progress_$(Get-Date -Format 'yyyyMMdd_HHmmss').jsonl"
    $progressEntry | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8

    Write-Host "PROGRESS: Milestone reached - $toolName"
}

exit 0
