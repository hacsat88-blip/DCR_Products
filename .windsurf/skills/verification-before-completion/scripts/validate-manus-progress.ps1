# skills/verification-before-completion/scripts/validate-manus-progress.ps1
# Validate Manus progress.md checklist

param(
    [string]$ProgressFilePath
)

if (-not $ProgressFilePath) {
    $ProgressFilePath = "./progress.md"
}

if (-not (Test-Path $ProgressFilePath)) {
    Write-Host "[WARN] progress.md not found; skipping Manus validation"
    exit 0
}

# Read progress.md
$content = Get-Content $ProgressFilePath -Raw

# Extract checklist section (between "## Completion Checklist" and next "##")
$checklist_match = $content -match '## Completion Checklist\s+([\s\S]*?)(?=\n## |$)'
if (-not $checklist_match) {
    Write-Host "[WARN] No checklist found in progress.md"
    exit 0
}

$checklist_text = $matches[1]

# Parse checklist items
$items = $checklist_text -split '\n' | Where-Object { $_ -match '^\s*-\s*\[' }

$completed = 0
$total = 0
$incomplete_items = @()

foreach ($item in $items) {
    $total++
    if ($item -match '^\s*-\s*\[x\]') {
        $completed++
        Write-Host "  [OK] $($item.Trim())"
    } else {
        Write-Host "  [FAIL] $($item.Trim())"
        $incomplete_items += $item.Trim()
    }
}

Write-Host "`nProgress: $completed/$total items complete"

if ($completed -lt $total) {
    Write-Host "`n[BLOCK] Blocking completion: $($total - $completed) incomplete items"
    Write-Host "`nIncomplete items:"
    foreach ($item in $incomplete_items) {
        Write-Host "  - $item"
    }
    Write-Host "`nNext steps:"
    Write-Host "  1. Complete remaining items in task_plan.md"
    Write-Host "  2. Update progress.md checklist"
    Write-Host "  3. Run verification again"
    exit 1
} else {
    Write-Host "`n[OK] All checklist items complete. Proceeding with completion verification."
    exit 0
}
