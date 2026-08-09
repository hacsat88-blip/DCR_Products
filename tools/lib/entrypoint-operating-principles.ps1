#Requires -Version 5.1

function Get-DcrEntrypointOperatingPrinciples {
    param(
        [Parameter(Mandatory)][string]$RepoRoot
    )

    $canonicalPath = Join-Path $RepoRoot ".ai\core\operating-principles.md"
    if (-not (Test-Path -LiteralPath $canonicalPath -PathType Leaf)) {
        throw "Shared operating principles not found: $canonicalPath"
    }

    $canonicalContent = (Get-Content -LiteralPath $canonicalPath -Raw -Encoding UTF8).Trim()
    if (-not $canonicalContent.StartsWith("# Shared Operating Principles")) {
        throw "Shared operating principles must start with '# Shared Operating Principles': $canonicalPath"
    }

    # Demote the canonical H1 when embedding it beneath an entrypoint H1.
    return "#$canonicalContent"
}
