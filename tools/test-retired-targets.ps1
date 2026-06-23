#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test for retired AI runtime targets.

.DESCRIPTION
  Verifies that retired distribution targets do not come back as paths,
  manifests, adapters, deploy targets, registries, or generated entrypoints.
  Historical audit notes are allowed by policy.
#>

param(
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$policyPath = Join-Path $RepoRoot ".ai\control-plane\retired-targets.policy.json"
if (-not (Test-Path -LiteralPath $policyPath)) {
    throw "retired targets policy not found: $policyPath"
}

$policy = Get-Content -LiteralPath $policyPath -Raw -Encoding UTF8 | ConvertFrom-Json
$failures = @()

function ConvertTo-DcrRelativePath {
    param([Parameter(Mandatory)][string]$Path)

    $full = [System.IO.Path]::GetFullPath($Path)
    return $full.Substring($RepoRoot.TrimEnd('\', '/').Length + 1).Replace('\', '/')
}

function Resolve-RepoPath {
    param([Parameter(Mandatory)][string]$RelativePath)

    return [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $RelativePath))
}

function Test-IsUnderRepo {
    param([Parameter(Mandatory)][string]$Path)

    $full = [System.IO.Path]::GetFullPath($Path)
    return $full.StartsWith($RepoRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-IsAllowedHistoryPath {
    param([Parameter(Mandatory)][string]$RelativePath)

    foreach ($allowedRoot in @($policy.allowedHistoryRoots)) {
        $normalized = ($allowedRoot -replace '\\', '/').TrimEnd('/')
        if ($RelativePath -eq $normalized -or $RelativePath.StartsWith($normalized + "/", [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    return $false
}

function Test-IsTextCandidate {
    param([Parameter(Mandatory)][System.IO.FileInfo]$File)

    $name = $File.Name.ToLowerInvariant()
    $extension = $File.Extension.ToLowerInvariant()
    if ($name -in @(".gitignore", ".cursorignore")) {
        return $true
    }

    return $extension -in @(
        ".md", ".mdc", ".json", ".ps1", ".psm1", ".psd1", ".yml", ".yaml",
        ".toml", ".txt", ".csv", ".example"
    )
}

foreach ($target in @($policy.retiredTargets)) {
    foreach ($relativePath in @($target.forbiddenPaths + $target.forbiddenFiles)) {
        $resolved = Resolve-RepoPath -RelativePath $relativePath
        if (-not (Test-IsUnderRepo -Path $resolved)) {
            $failures += "policy path escapes repo: $relativePath"
            continue
        }

        if (Test-Path -LiteralPath $resolved) {
            $failures += "retired target '$($target.id)' path exists: $relativePath"
        }
    }
}

$policyRelativePath = ConvertTo-DcrRelativePath -Path $policyPath
$textFiles = Get-ChildItem -LiteralPath $RepoRoot -Recurse -Force -File |
    Where-Object {
        $_.FullName -notmatch '\\\.git\\' -and
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.Length -lt 5MB -and
        (Test-IsTextCandidate -File $_)
    } |
    Sort-Object FullName

foreach ($file in $textFiles) {
    $relative = ConvertTo-DcrRelativePath -Path $file.FullName
    if ($relative -eq $policyRelativePath) {
        continue
    }
    if (Test-IsAllowedHistoryPath -RelativePath $relative) {
        continue
    }

    $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    foreach ($target in @($policy.retiredTargets)) {
        foreach ($needle in @($target.forbiddenText)) {
            if ($text.IndexOf($needle, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                $failures += "retired target '$($target.id)' text '$needle' found in $relative"
            }
        }
    }
}

if ($failures.Count -gt 0) {
    throw "retired target check failed: $($failures -join '; ')"
}

Write-Host "retired target smoke passed"
