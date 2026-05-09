# Memory Index: Auto-index memory files after edits
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
. (Join-Path $repoRoot "tools\lib\resolve-claude-memory.ps1")

$filePath = $env:DEVIN_FILE_PATH
if (-not $filePath) {
    exit 0
}

$mem = Get-ClaudeMemoryPaths
if (-not $mem) { exit 0 }

$fileExtension = [System.IO.Path]::GetExtension($filePath)
$memDir = $mem.MemDir
$memCli = $mem.MemCli

if ($fileExtension -eq ".md" -and $filePath.StartsWith($memDir) -and (Test-Path -LiteralPath $memCli)) {
    python -X utf8 $memCli add $filePath 2>$null
}

exit 0
