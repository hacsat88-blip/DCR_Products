#Requires -Version 5.1
<#
.SYNOPSIS
  Read-only replay of routing fixtures against active targets and alias tombstones.
#>

param(
    [string]$RepoRoot = (Join-Path $PSScriptRoot ".."),
    [string]$FixturePath = (Join-Path $PSScriptRoot "eval-routing-fixtures.json")
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
. (Join-Path $resolvedRoot "tools\lib\deprecated-aliases.ps1")

$fixtures = @(Get-Content -Path $FixturePath -Raw -Encoding utf8 | ConvertFrom-Json)
$aliases = @(Get-DcrDeprecatedAliases -RepoRoot $resolvedRoot)
$aliasByKey = @{}
foreach ($alias in $aliases) { $aliasByKey["$($alias.kind):$($alias.name)"] = $alias }

$passed = 0
$failed = 0
$aliasChecked = 0
$failures = @()

foreach ($fixture in $fixtures) {
    if (-not $fixture.expected_alias_from) {
        $passed++
        continue
    }

    $key = "$($fixture.kind):$($fixture.expected_alias_from)"
    $aliasChecked++
    if (-not $aliasByKey.ContainsKey($key)) {
        $failed++
        $failures += "$key missing from live frontmatter/tombstone registry"
        continue
    }

    $alias = $aliasByKey[$key]
    if ($alias.successor -ne $fixture.expected) {
        $failed++
        $failures += "$key resolves to '$($alias.successor)', expected '$($fixture.expected)'"
        continue
    }

    $passed++
}

Write-Host "== Shadow Routing Replay ==" -ForegroundColor Cyan
Write-Host "Fixtures: $($fixtures.Count)"
Write-Host "Alias fixtures checked: $aliasChecked"

if ($failed -gt 0) {
    Write-Host ""
    Write-Host "FAILURES:" -ForegroundColor Red
    foreach ($failure in $failures) { Write-Host "  - $failure" -ForegroundColor Red }
    exit 1
}

Write-Host "RESULT: passed" -ForegroundColor Green
