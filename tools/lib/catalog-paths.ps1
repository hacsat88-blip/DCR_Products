function Get-DcrCatalogRoot {
    param(
        [string]$RepoRoot
    )

    return Join-Path $RepoRoot ".ai\catalog"
}

function Get-DcrCanonicalSourcePath {
    param(
        [string]$RepoRoot,
        [ValidateSet("rules", "skills", "agents-source")]
        [string]$AssetType
    )

    $catalogRoot = Get-DcrCatalogRoot -RepoRoot $RepoRoot

    switch ($AssetType) {
        "rules" { return Join-Path $catalogRoot "rules" }
        "skills" { return Join-Path $catalogRoot "skills" }
        "agents-source" { return Join-Path $catalogRoot "agents-source" }
    }
}

function Get-DcrLegacySourcePath {
    param(
        [string]$RepoRoot,
        [ValidateSet("rules", "skills", "agents-source")]
        [string]$AssetType
    )

    switch ($AssetType) {
        "rules" { return Join-Path $RepoRoot "rules" }
        "skills" { return Join-Path $RepoRoot "skills" }
        "agents-source" { return Join-Path $RepoRoot ".ai\agents-source" }
    }
}

function Resolve-DcrSourcePath {
    param(
        [string]$RepoRoot,
        [ValidateSet("rules", "skills", "agents-source")]
        [string]$AssetType
    )

    $canonicalPath = Get-DcrCanonicalSourcePath -RepoRoot $RepoRoot -AssetType $AssetType
    if (Test-Path $canonicalPath) {
        return $canonicalPath
    }

    return Get-DcrLegacySourcePath -RepoRoot $RepoRoot -AssetType $AssetType
}

function Get-DcrCanonicalRelativePath {
    param(
        [ValidateSet("rules", "skills", "agents-source")]
        [string]$AssetType
    )

    switch ($AssetType) {
        "rules" { return ".ai/catalog/rules" }
        "skills" { return ".ai/catalog/skills" }
        "agents-source" { return ".ai/catalog/agents-source" }
    }
}