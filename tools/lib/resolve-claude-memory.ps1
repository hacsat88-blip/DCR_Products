# Resolves the Claude Code memory dir (mem_cli.py) without hardcoded users/paths.
# macOS only. Pin an exact folder by setting env DCR_MEMORY_ROOT to the .../memory directory.

function Get-ClaudePython {
    $cmd = Get-Command python3 -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

function Get-ClaudeMemoryPaths {
    if ($env:DCR_MEMORY_ROOT) {
        $memDir = $env:DCR_MEMORY_ROOT.TrimEnd('/')
        $memCli = Join-Path $memDir "mem_cli.py"
        if (Test-Path -LiteralPath $memCli) {
            return [PSCustomObject]@{ MemDir = $memDir; MemCli = $memCli }
        }
    }
    if (-not $env:HOME) { return $null }
    $projectsRoot = Join-Path (Join-Path $env:HOME ".claude") "projects"
    if (-not (Test-Path -LiteralPath $projectsRoot)) { return $null }
    $candidates = Get-ChildItem -LiteralPath $projectsRoot -Force -Filter "mem_cli.py" -File -Recurse -Depth 6 -ErrorAction SilentlyContinue |
        Where-Object { $_.Directory.Name -eq "memory" }
    if (-not $candidates) { return $null }
    $cli = @($candidates) | Sort-Object FullName | Select-Object -First 1
    return [PSCustomObject]@{ MemDir = $cli.Directory.FullName; MemCli = $cli.FullName }
}
