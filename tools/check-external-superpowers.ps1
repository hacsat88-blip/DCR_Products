<#
.SYNOPSIS
  Verify that the external Superpowers checkout is unmodified.

.DESCRIPTION
  Superpowers is treated as an external upstream package, not a DCR source
  asset. This check detects local edits, missing plugin manifests, and local
  commits that drift away from the configured upstream tracking branch.

.EXAMPLE
  .\tools\check-external-superpowers.ps1
  .\tools\check-external-superpowers.ps1 -RequireInstalled
#>

param(
    [string]$Path = (Join-Path $HOME ".codex\superpowers"),
    [string]$ExpectedOrigin = "https://github.com/obra/superpowers.git",
    [switch]$RequireInstalled
)

$ErrorActionPreference = "Stop"

function Write-CheckOk {
    param([string]$Message)
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-CheckSkip {
    param([string]$Message)
    Write-Host "[SKIP] $Message" -ForegroundColor DarkGray
}

function Write-CheckFail {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

$emptyExcludesFile = if ($env:OS -eq "Windows_NT") { "NUL" } else { "/dev/null" }
$gitBaseArgs = @("-c", "core.excludesFile=$emptyExcludesFile", "-C", $Path)

if (-not (Test-Path -LiteralPath $Path)) {
    $message = "Superpowers checkout not found: $Path"
    if ($RequireInstalled) {
        Write-CheckFail $message
        exit 1
    }

    Write-CheckSkip $message
    exit 0
}

if (-not (Test-Path -LiteralPath (Join-Path $Path ".git"))) {
    Write-CheckFail "Superpowers path is not a git checkout: $Path"
    exit 1
}

$failures = @()

try {
    $origin = (& git @gitBaseArgs remote get-url origin 2>&1).Trim()
    if ($LASTEXITCODE -ne 0) { throw $origin }
}
catch {
    Write-CheckFail "Unable to read Superpowers origin: $_"
    exit 1
}

if ($origin -ne $ExpectedOrigin) {
    $failures += "origin is '$origin' (expected '$ExpectedOrigin')"
}

$status = & git @gitBaseArgs status --porcelain 2>&1
if ($LASTEXITCODE -ne 0) {
    $failures += "git status failed: $status"
}
elseif ($status) {
    $failures += "working tree has local changes: $($status -join '; ')"
}

$upstream = (& git @gitBaseArgs rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($upstream)) {
    $failures += "tracking branch is not configured"
}
else {
    $counts = (& git @gitBaseArgs rev-list --left-right --count "HEAD...@{u}" 2>&1).Trim()
    if ($LASTEXITCODE -ne 0) {
        $failures += "unable to compare with upstream '$upstream': $counts"
    }
    elseif ($counts -match '^(\d+)\s+(\d+)$') {
        $ahead = [int]$Matches[1]
        $behind = [int]$Matches[2]
        if ($ahead -ne 0 -or $behind -ne 0) {
            $failures += "HEAD differs from upstream '$upstream' (ahead $ahead, behind $behind)"
        }
    }
    else {
        $failures += "unexpected upstream comparison output: $counts"
    }
}

$requiredFiles = @(
    ".claude-plugin\plugin.json",
    ".codex-plugin\plugin.json",
    "package.json"
)

foreach ($relativePath in $requiredFiles) {
    $fullPath = Join-Path $Path $relativePath
    if (-not (Test-Path -LiteralPath $fullPath)) {
        $failures += "required file missing: $relativePath"
    }
}

if ($failures.Count -gt 0) {
    foreach ($failure in $failures) {
        Write-CheckFail "Superpowers external checkout drift: $failure"
    }
    exit 1
}

$head = (& git @gitBaseArgs log -1 --oneline 2>$null).Trim()
Write-CheckOk "Superpowers external checkout is clean and aligned ($head)"
exit 0
