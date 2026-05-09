# Pre-read hook: Restrict access to sensitive files
# Receives file details via JSON on stdin

$json = $Input | ConvertFrom-Json
$filePath = $json.tool_info.file_path

# Sensitive file patterns to restrict
$sensitivePatterns = @(
    "\.env$",
    "\.env\.",
    "\.pem$",
    "\.key$",
    "\.crt$",
    "secrets",
    "credentials",
    "password",
    "token",
    "api_key",
    "private",
    "\.aws/credentials",
    "\.ssh/id_",
    "\\.git/config"
)

foreach ($pattern in $sensitivePatterns) {
    if ($filePath -match $pattern) {
        Write-Host "BLOCKED: Attempted to read sensitive file: $filePath"
        exit 2  # Exit code 2 blocks the action
    }
}

# Allow reading the file
exit 0
