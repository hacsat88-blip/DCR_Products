# Task Estimator: Estimate task complexity for Devin
# Analyzes prompt to provide complexity hints

$prompt = $env:DEVIN_PROMPT
if (-not $prompt) {
    exit 0
}

# Complexity indicators
$complexityIndicators = @{
    "high" = @(
        "deploy", "production", "migration", "architecture",
        "refactor.*entire", "rewrite", "performance.*optimization",
        "security.*audit", "compliance", "multi.*service"
    )
    "medium" = @(
        "feature", "implement", "integrate", "api",
        "database", "authentication", "testing"
    )
    "low" = @(
        "fix.*bug", "update.*config", "change.*style",
        "rename", "documentation", "simple"
    )
}

$estimatedComplexity = "medium"

foreach ($level in @("high", "medium", "low")) {
    foreach ($pattern in $complexityIndicators[$level]) {
        if ($prompt -match $pattern) {
            $estimatedComplexity = $level
            break
        }
    }
    if ($estimatedComplexity -ne "medium") { break }
}

# Log estimation
Write-Host "TASK_ESTIMATE: $estimatedComplexity complexity detected"

# For high complexity tasks, suggest breaking down
if ($estimatedComplexity -eq "high") {
    Write-Host "TASK_HINT: Consider breaking this into smaller subtasks for better Devin performance"
}

exit 0
