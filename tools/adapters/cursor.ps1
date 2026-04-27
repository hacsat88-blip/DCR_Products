param([string]$RepoRoot = ".")

$ToolRoot = Split-Path $PSScriptRoot -Parent
$CatalogPaths = Join-Path $ToolRoot "lib\catalog-paths.ps1"
$CursorPackage = Join-Path $ToolRoot "lib\cursor-package.ps1"
. $CatalogPaths
. $CursorPackage

$rulesDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "rules"
$skillsDir = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType "skills"
$runtimeKernel = Join-Path $RepoRoot ".ai\kernel\dcr-kernel.md"
$outDir = Join-Path $RepoRoot ".cursor\rules"

Write-Host "[cursor] Generating .cursor/rules/*.mdc..." -ForegroundColor Cyan

New-DcrCursorRulePackage `
    -RulesSource $rulesDir `
    -SkillsSource $skillsDir `
    -KernelSource $runtimeKernel `
    -OutputDir $outDir `
    -VerboseOutput

Write-Host ""
