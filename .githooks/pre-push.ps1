#Requires -Version 5.1

$ErrorActionPreference = "Stop"
$upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null

if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($upstream)) {
    $base = git merge-base HEAD $upstream
    $changed = @(git diff --name-only "$base..HEAD" -- .ai tools deploy.ps1 .github/workflows/validate.yml .gitignore .cursorignore)
}
else {
    $changed = @("run")
}

if ($changed.Count -eq 0) {
    exit 0
}

Write-Host "[dcr] Running deploy drift check before push..."
pwsh -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
