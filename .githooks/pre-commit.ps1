#Requires -Version 5.1

$ErrorActionPreference = "Stop"
$changed = @(git diff --cached --name-only -- .ai tools deploy.ps1 .github/workflows/validate.yml .gitignore .cursorignore)

if ($changed.Count -eq 0) {
    exit 0
}

Write-Host "[dcr] Running deploy drift check before commit..."
pwsh -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
