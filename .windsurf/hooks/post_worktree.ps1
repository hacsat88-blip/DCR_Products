# Post-worktree hook: Log worktree creation for concurrent Cascade sessions
$json = $Input | ConvertFrom-Json
$worktreePath = $json.tool_info.worktree_path

$logDir = Join-Path (Get-Location) ".windsurf/logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logEntry = @{
    timestamp = Get-Date -Format "o"
    action = "worktree_created"
    worktree = $worktreePath
}

$logFile = Join-Path $logDir "worktrees_$(Get-Date -Format 'yyyyMMdd').jsonl"
$logEntry | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8

Write-Host "WORKTREE: Created worktree at $worktreePath for concurrent session isolation"

exit 0
