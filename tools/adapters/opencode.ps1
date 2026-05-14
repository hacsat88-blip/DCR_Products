param(
    [string]$RepoRoot = ".",
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"

function Write-OpenCodeStatus {
    param(
        [string]$Message,
        [string]$Color = "Green"
    )

    if (-not $Quiet) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Copy-OpenCodeFile {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Label
    )

    if (-not (Test-Path $Source)) {
        throw "OpenCode source not found: $Source"
    }

    $destinationDir = Split-Path $Destination -Parent
    if ($destinationDir) {
        New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    }

    Copy-Item -Path $Source -Destination $Destination -Force
    Write-OpenCodeStatus -Message "  [OK] $Label"
}

$sourceRoot = Join-Path $RepoRoot ".ai\environments\opencode"
$destRoot = Join-Path $RepoRoot ".opencode"
$sourceKernel = Join-Path $sourceRoot "kernel.md"
$destKernel = Join-Path $destRoot "kernel.md"
$sourceConfig = Join-Path $sourceRoot "opencode.json"
$rootConfig = Join-Path $RepoRoot "opencode.json"
$compatConfig = Join-Path $destRoot "opencode.json"

Write-OpenCodeStatus -Message "[opencode] Generating OpenCode runtime config..." -Color "Cyan"

New-Item -ItemType Directory -Force -Path $destRoot | Out-Null
Copy-OpenCodeFile -Source $sourceKernel -Destination $destKernel -Label ".opencode/kernel.md"
Copy-OpenCodeFile -Source $sourceConfig -Destination $rootConfig -Label "opencode.json"
Copy-OpenCodeFile -Source $sourceConfig -Destination $compatConfig -Label ".opencode/opencode.json compatibility mirror"

Write-OpenCodeStatus -Message "  [KEEP] .opencode/agents/ and .opencode/skills/ are OpenCode-local overlays"
Write-OpenCodeStatus -Message ""
