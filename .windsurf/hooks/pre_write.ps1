# Pre-write hook: Protect critical files from modification
$json = $Input | ConvertFrom-Json
$filePath = $json.tool_info.file_path

# Critical files that should not be modified by Cascade
$protectedFiles = @(
    ".git/config",
    ".gitignore",
    "package-lock.json",
    "yarn.lock",
    "Cargo.lock",
    "go.sum",
    ".env",
    ".env.local"
)

foreach ($protected in $protectedFiles) {
    if ($filePath -match [regex]::Escape($protected)) {
        Write-Host "BLOCKED: Attempted to modify protected file: $filePath"
        exit 2  # Block the action
    }
}

exit 0
