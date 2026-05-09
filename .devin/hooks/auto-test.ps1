# Auto-test: Run tests after code changes (Devin-specific)
$filePath = $env:DEVIN_FILE_PATH
$toolName = $env:DEVIN_TOOL_NAME

# Only run tests after file edits
if ($toolName -ne "edit_file" -and $toolName -ne "create_file") {
    exit 0
}

if (-not $filePath) {
    exit 0
}

$projectRoot = Get-Location

# Detect project type and run appropriate tests
$testCommands = @()

if (Test-Path (Join-Path $projectRoot "package.json")) {
    # Node.js project
    $testCommands += @("npm test", "yarn test", "pnpm test")
}

if (Test-Path (Join-Path $projectRoot "requirements.txt") -or Test-Path (Join-Path $projectRoot "pyproject.toml")) {
    # Python project
    $testCommands += @("pytest", "python -m pytest", "python -m unittest")
}

if (Test-Path (Join-Path $projectRoot "go.mod")) {
    # Go project
    $testCommands += @("go test ./...", "go test")
}

if (Test-Path (Join-Path $projectRoot "Cargo.toml")) {
    # Rust project
    $testCommands += @("cargo test")
}

# Run first available test command
foreach ($cmd in $testCommands) {
    $cmdParts = $cmd -split " "
    $exe = $cmdParts[0]
    
    if (Get-Command $exe -ErrorAction SilentlyContinue) {
        Write-Host "AUTO_TEST: Running $cmd"
        cmd /c $cmd 2>&1 | Out-Null
        $exitCode = $LASTEXITCODE
        
        # Log test results
        $logDir = Join-Path $projectRoot ".devin/logs"
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        
        $testResult = @{
            timestamp = Get-Date -Format "o"
            command   = $cmd
            exitCode  = $exitCode
            file      = $filePath
        }
        
        $logFile = Join-Path $logDir "tests_$(Get-Date -Format 'yyyyMMdd').jsonl"
        $testResult | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8
        
        if ($exitCode -eq 0) {
            Write-Host "AUTO_TEST: Tests passed"
        }
        else {
            Write-Host "AUTO_TEST: Tests failed (exit code: $exitCode)"
        }
        
        break
    }
}

exit 0
