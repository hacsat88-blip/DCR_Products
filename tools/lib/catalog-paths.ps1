function Get-DcrCatalogRoot {
    param(
        [string]$RepoRoot
    )

    return Join-Path $RepoRoot ".ai\catalog"
}

function Get-DcrCatalogSourcePath {
    param(
        [string]$RepoRoot,
        [ValidateSet("rules", "skills", "agents-source", "books")]
        [string]$AssetType
    )

    $catalogRoot = Get-DcrCatalogRoot -RepoRoot $RepoRoot

    switch ($AssetType) {
        "rules" { return Join-Path $catalogRoot "rules" }
        "skills" { return Join-Path $catalogRoot "skills" }
        "agents-source" { return Join-Path $catalogRoot "agents-source" }
        "books" { return Join-Path $RepoRoot ".ai\book" }
    }
}

function Get-DcrControlPlaneRoot {
    param(
        [string]$RepoRoot
    )

    return Join-Path $RepoRoot ".ai\control-plane"
}

function Get-DcrAssetsRoot {
    param(
        [string]$RepoRoot
    )

    return Join-Path $RepoRoot ".ai\assets"
}

function Get-DcrDistributionRoot {
    param(
        [string]$RepoRoot
    )

    return Join-Path $RepoRoot ".ai\distribution"
}

function Get-DcrCompatibilityRoot {
    param(
        [string]$RepoRoot
    )

    return Join-Path $RepoRoot ".ai\compatibility"
}

function Get-DcrCanonicalSourcePath {
    param(
        [string]$RepoRoot,
        [ValidateSet("rules", "skills", "agents-source", "books")]
        [string]$AssetType
    )

    return Get-DcrControlPlaneAssetPath -RepoRoot $RepoRoot -AssetType $AssetType
}

function Get-DcrLegacySourcePath {
    param(
        [string]$RepoRoot,
        [ValidateSet("rules", "skills", "agents-source", "books")]
        [string]$AssetType
    )

    switch ($AssetType) {
        "rules" { return Join-Path $RepoRoot "rules" }
        "skills" { return Join-Path $RepoRoot "skills" }
        "agents-source" { return Join-Path $RepoRoot ".ai\agents-source" }
        "books" { return Join-Path $RepoRoot ".ai\book" }
    }
}

function Resolve-DcrSourcePath {
    param(
        [string]$RepoRoot,
        [ValidateSet("rules", "skills", "agents-source", "books")]
        [string]$AssetType
    )

    $canonicalPath = Get-DcrCanonicalSourcePath -RepoRoot $RepoRoot -AssetType $AssetType
    if (Test-Path -LiteralPath $canonicalPath) {
        if (Test-DcrControlPlaneAssetReady -Path $canonicalPath -AssetType $AssetType) {
            return $canonicalPath
        }
    }

    $catalogPath = Get-DcrCatalogSourcePath -RepoRoot $RepoRoot -AssetType $AssetType
    if (Test-Path -LiteralPath $catalogPath) {
        if (Test-DcrControlPlaneAssetReady -Path $catalogPath -AssetType $AssetType) {
            return $catalogPath
        }
    }

    return Get-DcrLegacySourcePath -RepoRoot $RepoRoot -AssetType $AssetType
}

function Get-DcrCanonicalRelativePath {
    param(
        [ValidateSet("rules", "skills", "agents-source", "books")]
        [string]$AssetType
    )

    switch ($AssetType) {
        "rules" { return ".ai/assets/rules" }
        "skills" { return ".ai/assets/skills" }
        "agents-source" { return ".ai/assets/agents" }
        "books" { return ".ai/assets/books" }
    }
}

function Convert-DcrPathToRepoRelativePath {
    param(
        [string]$RepoRoot,
        [string]$Path
    )

    $resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path.TrimEnd('\')
    $resolvedPath = (Resolve-Path -LiteralPath $Path).Path
    if ($resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $resolvedPath.Substring($resolvedRoot.Length).TrimStart('\').Replace('\', '/')
    }

    return $resolvedPath.Replace('\', '/')
}

function Get-DcrResolvedSourceRelativePath {
    param(
        [string]$RepoRoot,
        [ValidateSet("rules", "skills", "agents-source", "books")]
        [string]$AssetType
    )

    $sourcePath = Resolve-DcrSourcePath -RepoRoot $RepoRoot -AssetType $AssetType
    return Convert-DcrPathToRepoRelativePath -RepoRoot $RepoRoot -Path $sourcePath
}

function Get-DcrControlPlaneAssetPath {
    param(
        [string]$RepoRoot,
        [ValidateSet("rules", "skills", "agents-source", "books")]
        [string]$AssetType
    )

    $assetsRoot = Get-DcrAssetsRoot -RepoRoot $RepoRoot

    switch ($AssetType) {
        "rules" { return Join-Path $assetsRoot "rules" }
        "skills" { return Join-Path $assetsRoot "skills" }
        "agents-source" { return Join-Path $assetsRoot "agents" }
        "books" { return Join-Path $assetsRoot "books" }
    }
}

function Test-DcrControlPlaneAssetReady {
    param(
        [string]$Path,
        [ValidateSet("rules", "skills", "agents-source", "books")]
        [string]$AssetType
    )

    switch ($AssetType) {
        "rules" {
            return @(Get-ChildItem -LiteralPath $Path -Force -File -Filter "*.md" -ErrorAction SilentlyContinue |
                Where-Object { $_.BaseName -ne "README" -and -not $_.BaseName.StartsWith("_") } |
                Select-Object -First 1).Count -gt 0
        }
        "skills" {
            return @(Get-ChildItem -LiteralPath $Path -Force -File -Recurse -Filter "SKILL.md" -ErrorAction SilentlyContinue |
                Select-Object -First 1).Count -gt 0
        }
        "agents-source" {
            return @(Get-ChildItem -LiteralPath $Path -Force -File -ErrorAction SilentlyContinue |
                Where-Object { $_.BaseName -ne "README" -and $_.Extension -in @(".md", ".toml") } |
                Select-Object -First 1).Count -gt 0
        }
        "books" {
            return Test-Path -LiteralPath (Join-Path $Path "runtime.md")
        }
    }
}

function Get-DcrControlPlaneManifestPath {
    param(
        [string]$RepoRoot,
        [string]$ManifestName
    )

    return Join-Path (Get-DcrDistributionRoot -RepoRoot $RepoRoot) "manifests\$ManifestName.json"
}

function Get-DcrControlPlaneSourceRegistryPath {
    param(
        [string]$RepoRoot
    )

    return Join-Path (Get-DcrControlPlaneRoot -RepoRoot $RepoRoot) "source-registry.json"
}
