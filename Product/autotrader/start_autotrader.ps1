[CmdletBinding()]
param(
    [switch]$NoBrowser,
    [switch]$NoExcel,
    [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$UiRoot = Join-Path $Root "ui"
$Workbook = Join-Path $Root "autotrader.xlsm"
$ApiUrl = "http://127.0.0.1:8000/api/status"
$UiUrl = "http://127.0.0.1:3000"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-PortInUse {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    return [bool]$connection
}

function Wait-HttpReady {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }

    return $false
}

Write-Host "============================================"
Write-Host " Autotrader full launcher"
Write-Host " API + Codex Advisor + Next.js Dashboard"
Write-Host "============================================"

if (-not $SkipChecks) {
    Write-Step "Checking required commands"
    foreach ($commandName in @("python", "npm")) {
        if (-not (Test-CommandExists $commandName)) {
            throw "Required command not found: $commandName"
        }
        Write-Host "OK: $commandName"
    }

    if (Test-CommandExists "codex") {
        Write-Host "OK: codex"
    }
    else {
        Write-Warning "codex command was not found. The API can start, but Codex Advisor calls will fail closed."
    }

    if (-not (Test-Path (Join-Path $Root "server\main.py"))) {
        throw "server\main.py was not found. Root path is wrong: $Root"
    }

    if (-not (Test-Path (Join-Path $UiRoot "package.json"))) {
        throw "ui\package.json was not found. UI path is wrong: $UiRoot"
    }

    if (-not (Test-Path (Join-Path $UiRoot "node_modules"))) {
        Write-Warning "ui\node_modules was not found. Run 'npm install' in the ui folder before starting the dashboard."
    }
}

Write-Step "Starting FastAPI on http://127.0.0.1:8000"
if (Test-PortInUse 8000) {
    Write-Host "Port 8000 is already in use. Reusing the existing API process."
}
else {
    $apiCommand = "title Autotrader API && cd /d `"$Root`" && set PYTHONIOENCODING=utf-8 && python -m uvicorn server.main:app --host 127.0.0.1 --port 8000"
    Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $apiCommand) -WorkingDirectory $Root
}

if (Wait-HttpReady -Url $ApiUrl -TimeoutSeconds 45) {
    Write-Host "API is ready: $ApiUrl" -ForegroundColor Green
}
else {
    Write-Warning "API did not respond within the timeout. Check the 'Autotrader API' window."
}

Write-Step "Starting Next.js dashboard on http://127.0.0.1:3000"
if (Test-PortInUse 3000) {
    Write-Host "Port 3000 is already in use. Reusing the existing dashboard process."
}
else {
    $uiCommand = "title Autotrader UI && cd /d `"$UiRoot`" && npm run dev -- --hostname 127.0.0.1 --port 3000"
    Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $uiCommand) -WorkingDirectory $UiRoot
}

if (Wait-HttpReady -Url $UiUrl -TimeoutSeconds 60) {
    Write-Host "Dashboard is ready: $UiUrl" -ForegroundColor Green
}
else {
    Write-Warning "Dashboard did not respond within the timeout. Check the 'Autotrader UI' window."
}

if (-not $NoBrowser) {
    Write-Step "Opening dashboard"
    Start-Process $UiUrl
}

if (-not $NoExcel) {
    if (Test-Path $Workbook) {
        Write-Step "Opening Excel workbook"
        Start-Process $Workbook
    }
    else {
        Write-Warning "Workbook was not found: $Workbook"
    }
}

Write-Host ""
Write-Host "Startup finished."
Write-Host "Stop with stop_autotrader.bat, or press Ctrl+C in each command window."
