#Requires -Version 5.1

function Get-DcrAliasFrontmatterMap {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $raw = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $Path).Path)
    if ($raw -notmatch '(?ms)^---\r?\n(.*?)\r?\n---') {
        return $null
    }

    $map = @{}
    foreach ($line in ($Matches[1] -split "\r?\n")) {
        if ($line -match '^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$') {
            $key = $Matches[1]
            $value = $Matches[2].Trim().Trim([char]34, [char]39)
            $map[$key] = $value
        }
    }

    return $map
}

function New-DcrDeprecatedAliasRow {
    param(
        [ValidateSet("rule", "skill", "agent")]
        [string]$Kind,
        [string]$Name,
        [string]$Successor,
        [ValidateSet("live", "removed")]
        [string]$State,
        [string]$SourcePath,
        [string]$Reason,
        [string]$Source,
        [string]$RemovedAt = "",
        [string]$RemovalPolicy = "",
        [string]$RemovedBy = ""
    )

    [pscustomobject]@{
        kind = $Kind
        name = $Name
        successor = $Successor
        state = $State
        source_path = $SourcePath
        reason = $Reason
        source = $Source
        removed_at = $RemovedAt
        removal_policy = $RemovalPolicy
        removed_by = $RemovedBy
    }
}

function Add-DcrDeprecatedAliasRow {
    param(
        [hashtable]$RowsByKey,
        [psobject]$Row
    )

    $key = "$($Row.kind):$($Row.name)"
    if (-not $RowsByKey.ContainsKey($key) -or $Row.state -eq "live") {
        $RowsByKey[$key] = $Row
    }
}

function Get-DcrDeprecatedAliases {
    param(
        [string]$RepoRoot = ".",
        [ValidateSet("all", "rule", "skill", "agent")]
        [string]$Kind = "all"
    )

    $resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
    $catalogPaths = Join-Path $PSScriptRoot "catalog-paths.ps1"
    if (-not (Get-Command Resolve-DcrSourcePath -ErrorAction SilentlyContinue)) {
        . $catalogPaths
    }

    $rowsByKey = @{}
    $catalogRoot = Join-Path $resolvedRoot ".ai\catalog"
    $registryPath = Join-Path $catalogRoot "_deprecated-aliases.json"

    if (Test-Path -LiteralPath $registryPath) {
        $registry = Get-Content -Path $registryPath -Raw -Encoding utf8 | ConvertFrom-Json
        $registryAliases = @()
        if ($registry -is [array]) {
            $registryAliases = @($registry)
        }
        elseif ($registry.aliases) {
            $registryAliases = @($registry.aliases)
        }

        foreach ($alias in $registryAliases) {
            if (-not $alias.kind -or -not $alias.name -or -not $alias.successor -or -not $alias.state -or -not $alias.source_path -or -not $alias.reason) {
                throw "Invalid deprecated alias registry entry. Required: kind, name, successor, state, source_path, reason."
            }
            if ($Kind -ne "all" -and $alias.kind -ne $Kind) {
                continue
            }

            Add-DcrDeprecatedAliasRow -RowsByKey $rowsByKey -Row (New-DcrDeprecatedAliasRow `
                -Kind $alias.kind `
                -Name $alias.name `
                -Successor $alias.successor `
                -State $alias.state `
                -SourcePath $alias.source_path `
                -Reason $alias.reason `
                -Source "registry" `
                -RemovedAt $alias.removed_at `
                -RemovalPolicy $alias.removal_policy `
                -RemovedBy $alias.removed_by)
        }
    }

    $rulesDir = Resolve-DcrSourcePath -RepoRoot $resolvedRoot -AssetType "rules"
    $skillsDir = Resolve-DcrSourcePath -RepoRoot $resolvedRoot -AssetType "skills"
    $agentsDir = Resolve-DcrSourcePath -RepoRoot $resolvedRoot -AssetType "agents-source"

    if ($Kind -in @("all", "rule")) {
        foreach ($file in Get-ChildItem -Path $rulesDir -Filter "*.md" -File | Where-Object { -not $_.BaseName.StartsWith("_") }) {
            $fm = Get-DcrAliasFrontmatterMap -Path $file.FullName
            if ($fm -and $fm["deprecated"] -eq "true") {
                Add-DcrDeprecatedAliasRow -RowsByKey $rowsByKey -Row (New-DcrDeprecatedAliasRow `
                    -Kind "rule" `
                    -Name $file.BaseName `
                    -Successor $fm["successor"] `
                    -State "live" `
                    -SourcePath ".ai/catalog/rules/$($file.Name)" `
                    -Reason $fm["deprecation_reason"] `
                    -Source "frontmatter")
            }
        }
    }

    if ($Kind -in @("all", "skill")) {
        foreach ($dir in Get-ChildItem -Path $skillsDir -Directory | Where-Object { -not $_.Name.StartsWith("_") }) {
            $skillFile = Join-Path $dir.FullName "SKILL.md"
            if (-not (Test-Path -LiteralPath $skillFile)) {
                continue
            }
            $fm = Get-DcrAliasFrontmatterMap -Path $skillFile
            if ($fm -and $fm["deprecated"] -eq "true") {
                Add-DcrDeprecatedAliasRow -RowsByKey $rowsByKey -Row (New-DcrDeprecatedAliasRow `
                    -Kind "skill" `
                    -Name $dir.Name `
                    -Successor $fm["successor"] `
                    -State "live" `
                    -SourcePath ".ai/catalog/skills/$($dir.Name)/SKILL.md" `
                    -Reason $fm["deprecation_reason"] `
                    -Source "frontmatter")
            }
        }
    }

    if ($Kind -in @("all", "agent")) {
        foreach ($file in Get-ChildItem -Path $agentsDir -Filter "*.md" -File | Where-Object { -not $_.BaseName.StartsWith("_") -and $_.BaseName -ne "README" }) {
            $fm = Get-DcrAliasFrontmatterMap -Path $file.FullName
            if ($fm -and $fm["deprecated"] -eq "true") {
                Add-DcrDeprecatedAliasRow -RowsByKey $rowsByKey -Row (New-DcrDeprecatedAliasRow `
                    -Kind "agent" `
                    -Name $file.BaseName `
                    -Successor $fm["successor"] `
                    -State "live" `
                    -SourcePath ".ai/catalog/agents-source/$($file.Name)" `
                    -Reason $fm["deprecation_reason"] `
                    -Source "frontmatter")
            }
        }
    }

    return @($rowsByKey.Values | Sort-Object kind, name)
}
