# Pre-command hook: Block dangerous commands
# Receives command details via JSON on stdin

$json = $Input | ConvertFrom-Json
$command = $json.command

# Dangerous commands to block
$blockedPatterns = @(
    "rm -rf /",
    "rm -rf \\",
    "del /s /q",
    "format",
    "mkfs",
    "dd if=",
    "> /dev/sd",
    ":>\\",
    "shutdown",
    "reboot",
    "init 0",
    "halt"
)

foreach ($pattern in $blockedPatterns) {
    if ($command -match [regex]::Escape($pattern)) {
        Write-Host "BLOCKED: Dangerous command detected: $command"
        exit 2  # Exit code 2 blocks the action
    }
}

# Allow the command
exit 0
