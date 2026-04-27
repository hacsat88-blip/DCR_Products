param(
    [string]$RepoRoot = ".",
    [switch]$Quiet
)

$CatalogPaths = Join-Path (Split-Path $PSScriptRoot -Parent) "lib\catalog-paths.ps1"
. $CatalogPaths

$source = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "agents-source"
$codexDest = Join-Path $RepoRoot ".codex\agents"
$claudeDest = Join-Path $RepoRoot ".claude\agents"

function Write-AgentsStatus {
    param(
        [string]$Message,
        [string]$Color = "Green"
    )

    if (-not $Quiet) {
        Write-Host $Message -ForegroundColor $Color
    }
}

if (-not (Test-Path $source)) {
    throw "Agents source not found: $source"
}

Write-AgentsStatus -Message "[agents] Generating .codex/agents/*.toml and .claude/agents/*.md..." -Color "Cyan"

$tomlFiles = Get-ChildItem -Path $source -File -Filter '*.toml' | Sort-Object Name
$mdFiles = Get-ChildItem -Path $source -File -Filter '*.md' |
    Where-Object { $_.Name -ne 'README.md' } |
    Sort-Object Name

New-Item -ItemType Directory -Force -Path $codexDest, $claudeDest | Out-Null

foreach ($file in $tomlFiles) {
    Copy-Item -Path $file.FullName -Destination (Join-Path $codexDest $file.Name) -Force
}

foreach ($file in $mdFiles) {
    Copy-Item -Path $file.FullName -Destination (Join-Path $claudeDest $file.Name) -Force
}

Write-AgentsStatus -Message "  [OK] Codex agents : $($tomlFiles.Count) files"
Write-AgentsStatus -Message "  [OK] Claude agents : $($mdFiles.Count) files"
Write-AgentsStatus -Message ""
