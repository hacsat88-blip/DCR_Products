#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for local markdown links in core module documents.
#>

param(
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$moduleRoot = Join-Path $RepoRoot ".ai\core\modules"
if (-not (Test-Path -LiteralPath $moduleRoot)) {
    throw "module root not found: $moduleRoot"
}

$files = @(Get-ChildItem -LiteralPath $moduleRoot -Force -File -Filter "*.md")
if ($files.Count -eq 0) {
    throw "module root has no markdown files: $moduleRoot"
}

foreach ($file in $files) {
    $baseDir = $file.DirectoryName
    $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    $matches = [regex]::Matches($text, '\[[^\]]+\]\(([^)]+)\)')

    foreach ($match in $matches) {
        $target = $match.Groups[1].Value
        if ($target -match '^[a-zA-Z][a-zA-Z0-9+.-]*:' -or $target.StartsWith("#")) {
            continue
        }

        $targetPath = ($target -split '#', 2)[0]
        if ([string]::IsNullOrWhiteSpace($targetPath)) {
            continue
        }

        $resolved = [System.IO.Path]::GetFullPath((Join-Path $baseDir $targetPath))
        if (-not (Test-Path -LiteralPath $resolved)) {
            $relativeFile = $file.FullName.Substring($RepoRoot.TrimEnd('\').Length + 1)
            throw "$relativeFile has unresolved local markdown link: $target"
        }
    }
}

Write-Host "module link contract smoke passed"
