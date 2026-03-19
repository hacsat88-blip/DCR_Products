param(
    [string]$RepoRoot = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

$sourceRoot = Join-Path $RepoRoot '.ai\agents-source'
$codexDest = Join-Path $RepoRoot '.codex\agents'
$claudeDest = Join-Path $RepoRoot '.claude\agents'

if (-not (Test-Path $sourceRoot)) {
    throw "Source folder not found: $sourceRoot"
}

New-Item -ItemType Directory -Force -Path $codexDest, $claudeDest | Out-Null

$tomlFiles = Get-ChildItem -Path $sourceRoot -File -Filter '*.toml'
$mdFiles = Get-ChildItem -Path $sourceRoot -File -Filter '*.md' | Where-Object { $_.Name -ne 'README.md' }

foreach ($file in $tomlFiles) {
    Copy-Item -Path $file.FullName -Destination (Join-Path $codexDest $file.Name) -Force
}

foreach ($file in $mdFiles) {
    Copy-Item -Path $file.FullName -Destination (Join-Path $claudeDest $file.Name) -Force
}

Write-Host "Synced $($tomlFiles.Count) Codex agent file(s) and $($mdFiles.Count) Claude agent file(s)."
