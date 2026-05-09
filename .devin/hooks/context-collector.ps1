# Context Collector: Gather project context for Devin sessions
# Runs when user submits a prompt to Devin

function Get-DevinProjectRoot {
    if ($env:DEVIN_PROJECT_ROOT -and (Test-Path -LiteralPath $env:DEVIN_PROJECT_ROOT -PathType Container)) {
        return (Resolve-Path -LiteralPath $env:DEVIN_PROJECT_ROOT).Path
    }
    $cand = $env:DEVIN_FILE_PATH
    if (-not $cand) {
        return (Get-Location).Path
    }
    $startDir = $null
    if (Test-Path -LiteralPath $cand -PathType Leaf) {
        $startDir = Split-Path -Parent (Resolve-Path -LiteralPath $cand).Path
    }
    elseif (Test-Path -LiteralPath $cand -PathType Container) {
        $startDir = (Resolve-Path -LiteralPath $cand).Path
    }
    else {
        return (Get-Location).Path
    }

    $markers = @(".git", "validate.ps1", "AGENTS.md", "deploy.ps1")
    $dir = $startDir
    for ($i = 0; $i -lt 64; $i++) {
        foreach ($m in $markers) {
            if (Test-Path -LiteralPath (Join-Path $dir $m)) {
                return $dir
            }
        }
        $parent = Split-Path -Parent $dir
        if (-not $parent -or $parent -eq $dir) {
            return $startDir
        }
        $dir = $parent
    }
    return $startDir
}

$projectRoot = Get-DevinProjectRoot

# Collect key project files
$contextFiles = @(
    "README.md",
    "AGENTS.md",
    "package.json",
    "requirements.txt",
    "go.mod",
    "Cargo.toml",
    ".ai/AGENTS.md",
    ".devin/DEVIN.md",
    ".windsurf/workflows/"
)

$context = @{
    timestamp        = Get-Date -Format "o"
    projectRoot      = $projectRoot
    prompt           = $env:DEVIN_PROMPT
    availableContext = @()
}

foreach ($file in $contextFiles) {
    $path = Join-Path $projectRoot $file
    if (Test-Path $path) {
        $context.availableContext += $file
    }
}

# Log context for session tracking
$logDir = Join-Path $projectRoot ".devin/logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logFile = Join-Path $logDir "context_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$context | ConvertTo-Json -Depth 10 | Out-File -FilePath $logFile -Encoding UTF8

exit 0
