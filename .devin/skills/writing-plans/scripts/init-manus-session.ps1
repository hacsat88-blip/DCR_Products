# skills/writing-plans/scripts/init-manus-session.ps1
# Initialize Manus 3-file pattern in a worktree

param(
    [string]$WorktreePath,
    [string]$FeatureName,
    [string]$ProjectName
)

# Validate inputs
if (-not $WorktreePath -or -not $FeatureName -or -not $ProjectName) {
    Write-Error "Usage: init-manus-session.ps1 -WorktreePath <path> -FeatureName <name> -ProjectName <name>"
    exit 1
}

# Verify worktree exists
if (-not (Test-Path $WorktreePath)) {
    Write-Error "Worktree path does not exist: $WorktreePath"
    exit 1
}

# Determine template path (relative to script or from .dcr/).
# The inline templates below remain the functional fallback.
$dcr_templates = Join-Path (Get-Location) ".dcr/templates"
if (-not (Test-Path $dcr_templates)) {
    Write-Warning ".dcr/templates not found; continuing with inline templates"
}

# Replace placeholders in templates
$task_plan_content = @"
# $FeatureName Implementation Plan — Manus Session

**Session context:** Git worktree at $WorktreePath
**Session files:** task_plan.md, findings.md, progress.md
**Commit strategy:** See .dcr/config.json

## Goal
[Edit: One sentence describing what this builds]

## Scope
- [ ] Phase 1: [Edit: Deliverable A]
- [ ] Phase 2: [Edit: Deliverable B]
- [ ] Phase 3: [Edit: Deliverable C]

## Success Criteria
- [ ] All phases complete with quality
- [ ] findings.md populated (decisions logged)
- [ ] progress.md all checklist items [OK]
- [ ] No recurring failures

## Known Blockers / Constraints
- (Added during session)

## Related Context
- Project: $ProjectName
- Branch: $FeatureName
- Created: $(Get-Date -Format 'o')

---
_Status: IN_PROGRESS_
_Session Log: See progress.md_
"@

$findings_content = @"
# Findings & Decisions — Session: $FeatureName

## Research & Rationale
- (Add decisions as you work)

## Implementation Attempts
| # | Approach | Result | Notes |
|----|----------|--------|-------|
| | | | |

## Error Patterns
- (Log errors to avoid repetition)

---
_Created: $(Get-Date -Format 'o')_
"@

$progress_content = @"
# Progress Tracking — Session: $FeatureName

## Completion Checklist
- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] findings.md documented
- [ ] No repeating errors
- [ ] Ready for merge

## Session Timeline
| Timestamp | Action | Result |
|-----------|--------|--------|
| $(Get-Date -Format 'o') | Initialized Manus session | [OK] |

## Verification Checklist
- [ ] All phases complete
- [ ] ≥3 decisions documented
- [ ] ≥5 timeline entries
- [ ] Tests pass (if applicable)

---
_Created: $(Get-Date -Format 'o')_
"@

# Write files to worktree
$task_plan_file = Join-Path $WorktreePath "task_plan.md"
$findings_file = Join-Path $WorktreePath "findings.md"
$progress_file = Join-Path $WorktreePath "progress.md"

$task_plan_content | Out-File -Path $task_plan_file -Encoding UTF8 -Force
$findings_content | Out-File -Path $findings_file -Encoding UTF8 -Force
$progress_content | Out-File -Path $progress_file -Encoding UTF8 -Force

Write-Host "[OK] Manus session initialized:"
Write-Host "   - $task_plan_file"
Write-Host "   - $findings_file"
Write-Host "   - $progress_file"

exit 0
