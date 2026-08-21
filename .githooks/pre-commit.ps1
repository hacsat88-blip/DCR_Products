#Requires -Version 7.0

$ErrorActionPreference = "Stop"
$changed = @(git diff --cached --name-only -- .ai tools deploy.ps1 .github/workflows/validate.yml .gitignore .cursorignore)

if ($changed.Count -eq 0) {
    exit 0
}

Write-Host "[dcr] Running deploy drift check before commit..."
pwsh -NoProfile -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
# pwsh does not adopt a native command's exit code, so propagate it
# explicitly - otherwise drift is reported but the hook still passes.
exit $LASTEXITCODE
