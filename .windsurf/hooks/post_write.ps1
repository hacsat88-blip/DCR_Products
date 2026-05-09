# Post-write hook: Auto-format after code changes + auto-index memory files
$json = $Input | ConvertFrom-Json
$filePath = $json.tool_info.file_path
$fileExtension = [System.IO.Path]::GetExtension($filePath)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
. (Join-Path $repoRoot "tools\lib\resolve-claude-memory.ps1")

$mem = Get-ClaudeMemoryPaths
if ($mem) {
    $memDir = $mem.MemDir
    $memCli = $mem.MemCli
    if ($fileExtension -eq ".md" -and $filePath.StartsWith($memDir) -and (Test-Path -LiteralPath $memCli)) {
        python -X utf8 $memCli add $filePath 2>$null
    }
}

switch ($fileExtension) {
    ".js" { if (Get-Command npx -ErrorAction SilentlyContinue) { npx prettier --write $filePath 2>$null } }
    ".ts" { if (Get-Command npx -ErrorAction SilentlyContinue) { npx prettier --write $filePath 2>$null } }
    ".jsx" { if (Get-Command npx -ErrorAction SilentlyContinue) { npx prettier --write $filePath 2>$null } }
    ".tsx" { if (Get-Command npx -ErrorAction SilentlyContinue) { npx prettier --write $filePath 2>$null } }
    ".py" { if (Get-Command black -ErrorAction SilentlyContinue) { black $filePath 2>$null } }
    ".go" { if (Get-Command gofmt -ErrorAction SilentlyContinue) { gofmt -w $filePath 2>$null } }
    ".rs" { if (Get-Command rustfmt -ErrorAction SilentlyContinue) { rustfmt $filePath 2>$null } }
}

exit 0
