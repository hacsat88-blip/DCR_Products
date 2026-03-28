# Manus Planning Integration (Phase 1: MVP) Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 1 MVP of Manus-style 3-file persistent context pattern in DCR: writing-plans creates task_plan.md/findings.md/progress.md, verification-before-completion validates them.

**Architecture:** 
- Extend writing-plans skill to initialize 3 files in worktree location (~/.config/dcr/worktrees/<project>/<task-name>/)
- Create .dcr/config.json template for deployment
- Extend verification-before-completion to read progress.md checklist
- No hooks in Phase 1 (manual workflow verification)

**Tech Stack:** Markdown, PowerShell (deploy.ps1), Bash (hooks in Phase 2)

**Timeline Estimate:** 2-3 weeks

---

## File Structure Map

### New Files to Create
```
.dcr/
├── config.json                          (Control configuration template)
└── templates/
    ├── task_plan.md                     (Template for writing-plans)
    ├── findings.md                      (Template for session findings)
    └── progress.md                      (Template for progress checklist)

skills/writing-plans/
├── SKILL.md                             (Updated with 3-file init logic)
├── templates/
│   ├── task_plan.template.md            (From .dcr/templates/)
│   ├── findings.template.md             (From .dcr/templates/)
│   └── progress.template.md             (From .dcr/templates/)
└── scripts/
    └── init-manus-session.ps1           (Initialize 3 files in worktree)

skills/verification-before-completion/
├── SKILL.md                             (Updated with progress.md validation)
└── scripts/
    └── validate-progress.ps1            (Read and verify checklist)

docs/dcr/plans/
└── 2026-03-29-manus-integration-phase1.md  (This file)
```

### Modified Files
```
deploy.ps1                              (Add .dcr/config.json replication)
.gitignore                              (Add .dcr/ entries with comments)
```

---

## Task 1: Create .dcr/config.json Template

**Files:**
- Create: `.dcr/config.json`

- [ ] **Step 1: Create .dcr/ directory structure**

```powershell
New-Item -ItemType Directory -Path ".dcr/templates" -Force
New-Item -ItemType Directory -Path ".dcr/config" -Force
```

- [ ] **Step 2: Write .dcr/config.json**

```json
{
  "version": "1.0",
  "manus_pattern": {
    "enabled": true,
    "commit_session_files": true,
    "worktree_location": "${HOME}/.config/dcr/worktrees",
    "auto_update_progress": true,
    "metadata": {
      "created": "2026-03-29",
      "description": "Manus-style persistent planning configuration"
    }
  },
  "hooks": {
    "pre_tool_use": "re-read task_plan.md for context retention",
    "post_tool_use": "append to findings.md and update progress.md",
    "enabled_in_phase": 2
  },
  "project_overrides": {
    "comment": "Projects can set commit_session_files: false for local-only sessions"
  }
}
```

- [ ] **Step 3: Verify JSON syntax**

```powershell
# PowerShell
$config = Get-Content .dcr/config.json | ConvertFrom-Json
$config.version
# Expected: "1.0"
```

- [ ] **Step 4: Commit**

```bash
git add .dcr/config.json
git commit -m "chore: add manus pattern configuration template"
```

---

## Task 2: Create Template Files (.dcr/templates/)

**Files:**
- Create: `.dcr/templates/task_plan.md`
- Create: `.dcr/templates/findings.md`
- Create: `.dcr/templates/progress.md`

- [ ] **Step 1: Write task_plan.md template**

```markdown
# [FEATURE_NAME] Implementation Plan — Manus Session

**Session context:** Git worktree at ~/.config/dcr/worktrees/{PROJECT}/{TASK_NAME}/  
**Session files:** task_plan.md, findings.md, progress.md  
**Commit strategy:** Configured in .dcr/config.json

## Goal
[One sentence. Why are we building this?]

## Scope
- [ ] Phase 1: [Deliverable A]
- [ ] Phase 2: [Deliverable B]
- [ ] Phase 3: [Deliverable C]

## Success Criteria
- [ ] All phases complete with quality
- [ ] findings.md populated (decisions logged)
- [ ] progress.md all checklist items ✅
- [ ] No recurring failures (error log reviewed)

## Known Blockers / Constraints
- (Added during session)

## Related Context
- Branch: {BRANCH_NAME}
- Based on: docs/dcr/specs/YYYY-MM-DD-*.md
- Original request: [Link/Reference]

---
_Last session update: {TIMESTAMP}_  
_Status: IN_PROGRESS_
_Session Log: See progress.md_
```

- [ ] **Step 2: Write findings.md template**

```markdown
# Findings & Decisions — Manus Session: {TASK_NAME}

## Research & Rationale
- **Decision 1:** [Option chosen] vs [Alternatives]. Rationale: [Why this is better]
- **Decision 2:** [Architectural choice]. Trade-offs considered: [Options and costs]

## Implementation Attempts
| # | Approach | Result | Error/Reason | Mutation |
|---|----------|--------|-------------|----------|
| 1 | [First attempt] | ❌ Failed | [error message] | [What changed for retry] |
| 2 | [Second attempt] | ✅ Success | — | — |

## Error Patterns (Never Repeat These)
- **Pattern:** [Error message / symptom]
  - Root cause: [Why it happened]
  - Prevention: [How to avoid next time]
  - Example: [Code snippet showing gotcha]

## Key Decisions Log
- Decision timestamp: [ISO 8601]
- Context: [What triggered this decision]
- Participants: [Who decided]
- Rationale: [Why this choice]
- Impact: [What changed because of this]

---
_Auto-appended by hooks (Phase 2+)_  
_Manual entries welcome_  
_Last update: {TIMESTAMP}_
```

- [ ] **Step 3: Write progress.md template**

```markdown
# Progress Tracking — Manus Session: {TASK_NAME}

## Completion Checklist
- [ ] Phase 1: [Deliverable A] — Expected: [deadline]
- [ ] Phase 2: [Deliverable B] — Expected: [deadline]
- [ ] Phase 3: [Deliverable C] — Expected: [deadline]
- [ ] All findings.md items documented
- [ ] No repeating errors in findings.md
- [ ] Ready for merge review

## Session Timeline
| Timestamp | Action | Tool/Skill | Result | Notes |
|-----------|--------|-----------|--------|-------|
| 2026-03-29 14:00 | Initialized session | writing-plans | ✅ Created 3 files | Worktree: feature/task-name |
| | | | | |
| | | | | |

## Verification Checklist
- [ ] All phases in task_plan.md checklist complete
- [ ] findings.md has ≥3 decisions documented
- [ ] progress.md timeline has ≥5 entries
- [ ] Error patterns logged (if any occurred)
- [ ] No unresolved blockers in task_plan.md
- [ ] Code quality checks pass (if applicable)
- [ ] Tests pass (if applicable)
- [ ] Ready for completion verification

## Notes
- [Session notes, challenges, learnings]

---
_Auto-updated by verification hooks (Phase 2+)_  
_Manual entries welcome_  
_Last verification: {TIMESTAMP}_
```

- [ ] **Step 4: Commit templates**

```bash
git add .dcr/templates/
git commit -m "chore: add manus session file templates"
```

---

## Task 3: Update writing-plans Skill SKILL.md

**Files:**
- Modify: `skills/writing-plans/SKILL.md` (add new section after "Execution Handoff")
- Create: `skills/writing-plans/scripts/init-manus-session.ps1`

- [ ] **Step 1: Locate writing-plans/SKILL.md ending**

Read `skills/writing-plans/SKILL.md` lines 120-end to find insertion point.

- [ ] **Step 2: Add Manus Pattern section to SKILL.md**

After "Execution Handoff" section, add:

```markdown
## Manus Pattern Integration (Phase 1+)

If working in a Git worktree (created by `using-git-worktrees` skill), `writing-plans` automatically initializes the Manus 3-file pattern:

**Automatic Initialization:**
- `task_plan.md` — Goal, Scope, Phases, Success Criteria, Blockers
- `findings.md` — Decisions, Research, Error Patterns
- `progress.md` — Checklist, Session Timeline, Verification Status

**Location:** `~/.config/dcr/worktrees/<project>/<task-name>/`

**Control:** `.dcr/config.json` — Set `commit_session_files: true/false` per project

**Workflow:**
1. writing-plans creates worktree + initializes 3 files
2. Dispatch to subagent-driven-development (or executing-plans)
3. Agents read + update 3 files throughout session
4. verification-before-completion validates progress.md checklist
5. On completion, optionally commit task_plan.md for history

**See:** `.dcr/templates/` for file templates  
**See:** `.dcr/config.json` for configuration options
```

- [ ] **Step 3: Create init-manus-session.ps1 script**

```powershell
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

# Determine template path (relative to script or from .dcr/)
$dcr_templates = Join-Path (Get-Location) ".dcr/templates"
if (-not (Test-Path $dcr_templates)) {
    Write-Warning ".dcr/templates not found; using inline templates"
    # User should have seen error earlier, but fallback to help message
    exit 1
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
- [ ] progress.md all checklist items ✅
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
| $(Get-Date -Format 'o') | Initialized Manus session | ✅ |

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

Write-Host "✅ Manus session initialized:"
Write-Host "   - $task_plan_file"
Write-Host "   - $findings_file"
Write-Host "   - $progress_file"

exit 0
```

- [ ] **Step 4: Test the script (dry-run)**

```powershell
# Create a test worktree
mkdir -p ~/.config/dcr/worktrees/test-project/test-feature
# Run script
.\skills\writing-plans\scripts\init-manus-session.ps1 `
  -WorktreePath (~/.config/dcr/worktrees/test-project/test-feature) `
  -FeatureName "test-feature" `
  -ProjectName "test-project"
# Verify files exist
ls ~/.config/dcr/worktrees/test-project/test-feature/
# Expected: task_plan.md, findings.md, progress.md
```

- [ ] **Step 5: Commit script and SKILL.md update**

```bash
git add skills/writing-plans/SKILL.md skills/writing-plans/scripts/init-manus-session.ps1
git commit -m "feat: add manus pattern initialization to writing-plans"
```

---

## Task 4: Update verification-before-completion Skill

**Files:**
- Modify: `skills/verification-before-completion/SKILL.md`
- Create: `skills/verification-before-completion/scripts/validate-manus-progress.ps1`

- [ ] **Step 1: Locate verification-before-completion/SKILL.md**

Read existing `skills/verification-before-completion/SKILL.md` to understand current structure.

- [ ] **Step 2: Add Manus Progress Validation section**

Add new section titled "Manus Pattern Validation" that explains:
- If worktree contains progress.md, read it
- Verify all checklist items are marked `- [x]`
- Report any incomplete items
- Block completion until all items ✅

Code block:
```markdown
## Manus Pattern Validation (Phase 1+)

If a `progress.md` file exists in the current session directory, verification-before-completion MUST validate the Manus checklist before allowing completion.

**Validation Steps:**
1. Check if progress.md exists in session directory (e.g., ~/.config/dcr/worktrees/<project>/<task>/)
2. Parse "## Completion Checklist" section
3. Count completed items (marked `- [x]`)
4. If any items are incomplete (`- [ ]`): BLOCK completion, list incomplete items
5. If all items complete: ALLOW completion, proceed with git commit (if .dcr/config.json: commit_session_files=true)

**User Error Prevention:**
- Incomplete items show red ❌ with item name
- Completed items show green ✅
- Clear next steps: "Complete [item X] in task_plan.md"
```

- [ ] **Step 3: Create validate-manus-progress.ps1**

```powershell
# skills/verification-before-completion/scripts/validate-manus-progress.ps1
# Validate Manus progress.md checklist

param(
    [string]$ProgressFilePath
)

if (-not $ProgressFilePath) {
    $ProgressFilePath = "./progress.md"
}

if (-not (Test-Path $ProgressFilePath)) {
    Write-Host "⚠️  progress.md not found; skipping Manus validation"
    return $true
}

# Read progress.md
$content = Get-Content $ProgressFilePath -Raw

# Extract checklist section (between "## Completion Checklist" and next "##")
$checklist_match = $content -match '## Completion Checklist\s+([\s\S]*?)(?=\n## |$)'
if (-not $checklist_match) {
    Write-Host "⚠️  No checklist found in progress.md"
    return $true
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
        Write-Host "  ✅ $($item.Trim())"
    } else {
        Write-Host "  ❌ $($item.Trim())"
        $incomplete_items += $item.Trim()
    }
}

Write-Host "`nProgress: $completed/$total items complete"

if ($completed -lt $total) {
    Write-Host "`n🚫 Blocking completion: $($total - $completed) incomplete items"
    Write-Host "`nIncomplete items:"
    foreach ($item in $incomplete_items) {
        Write-Host "  - $item"
    }
    Write-Host "`nNext steps:"
    Write-Host "  1. Complete remaining items in task_plan.md"
    Write-Host "  2. Update progress.md checklist"
    Write-Host "  3. Run verification again"
    return $false
} else {
    Write-Host "`n✅ All checklist items complete! Proceeding with completion verification."
    return $true
}
```

- [ ] **Step 4: Test validation script**

```powershell
# Create test progress.md
$test_progress = @"
# Progress Tracking

## Completion Checklist
- [x] Phase 1
- [x] Phase 2
- [ ] Phase 3
"@

$test_progress | Out-File -Path "/tmp/test-progress.md"

# Run validation (should fail, blocking incomplete Phase 3)
.\skills\verification-before-completion\scripts\validate-manus-progress.ps1 `
  -ProgressFilePath "/tmp/test-progress.md"
# Expected: Returns $false, lists incomplete items
```

- [ ] **Step 5: Commit**

```bash
git add skills/verification-before-completion/SKILL.md \
        skills/verification-before-completion/scripts/validate-manus-progress.ps1
git commit -m "feat: add manus progress validation to verification-before-completion"
```

---

## Task 5: Update deploy.ps1 to Handle .dcr/config.json

**Files:**
- Modify: `deploy.ps1` (add .dcr/config.json replication)

- [ ] **Step 1: Locate deploy.ps1 replication logic**

Read `deploy.ps1` to find where files are copied to editor directories.

- [ ] **Step 2: Add .dcr/config.json copy logic**

Add after main rules/skills replication loop:

```powershell
# Replicate .dcr/config.json to user and project directories
$dcr_config_source = Join-Path $SourceDirectory ".dcr/config.json"
if (Test-Path $dcr_config_source) {
    # User-level .dcr/ config
    $user_dcr_dir = Join-Path $env:USERPROFILE ".dcr"
    if (-not (Test-Path $user_dcr_dir)) {
        New-Item -ItemType Directory -Path $user_dcr_dir -Force | Out-Null
    }
    Copy-Item $dcr_config_source -Destination "$user_dcr_dir/config.json" -Force
    Write-Host "[OK] .dcr/config.json replicated to user: $user_dcr_dir"
    
    # Project-level .dcr/ config
    $project_dcr_dir = Join-Path $SourceDirectory ".dcr"
    if (-not (Test-Path $project_dcr_dir)) {
        New-Item -ItemType Directory -Path $project_dcr_dir -Force | Out-Null
    }
    Copy-Item $dcr_config_source -Destination "$project_dcr_dir/config.json" -Force
    Write-Host "[OK] .dcr/config.json replicated to project: $project_dcr_dir"
}
```

- [ ] **Step 3: Test deploy.ps1 replication**

```powershell
.\deploy.ps1 -DryRun
# Expected: Shows .dcr/config.json replication path
```

- [ ] **Step 4: Commit deploy.ps1 update**

```bash
git add deploy.ps1
git commit -m "chore: deploy.ps1 add .dcr/config.json replication"
```

---

## Task 6: Update .gitignore

**Files:**
- Modify: `.gitignore` (add .dcr/ entries)

- [ ] **Step 1: Read current .gitignore**

Check what's already ignored.

- [ ] **Step 2: Add .dcr/ entries with comments**

```bash
# Add to .gitignore:

# DCR — Manus Planning Sessions (Phase 1+)
# Session files stored in worktrees, controlled by .dcr/config.json
# Set `commit_session_files: true` to persist session history in git
.dcr/cache/
.dcr/.session-lock
.dcr/worktrees/  # ← Worktree session files (locally managed)

# Dot-folder caches (non-project-tracked)
.dcr-build/
```

- [ ] **Step 3: Commit .gitignore**

```bash
git add .gitignore
git commit -m "chore: gitignore add .dcr/ session directories"
```

---

## Task 7: Manual End-to-End Test

**Files:**
- None (test phase)

- [ ] **Step 1: Create test worktree manually**

```bash
mkdir -p ~/.config/dcr/worktrees/DCR_Products/test-manus-phase1
cd ~/.config/dcr/worktrees/DCR_Products/test-manus-phase1
```

- [ ] **Step 2: Initialize Manus session files**

```powershell
# Run from repo root
.\skills\writing-plans\scripts\init-manus-session.ps1 `
  -WorktreePath "~/.config/dcr/worktrees/DCR_Products/test-manus-phase1" `
  -FeatureName "test-manus-phase1" `
  -ProjectName "DCR_Products"
```

- [ ] **Step 3: Verify files created**

```bash
ls ~/.config/dcr/worktrees/DCR_Products/test-manus-phase1/
# Expected: task_plan.md, findings.md, progress.md
```

- [ ] **Step 4: Edit progress.md checklist items to [x]**

```bash
# Manually mark items complete in the test file
cd ~/.config/dcr/worktrees/DCR_Products/test-manus-phase1
# Edit progress.md: change all `- [ ]` to `- [x]`
```

- [ ] **Step 5: Run validation script**

```powershell
.\skills\verification-before-completion\scripts\validate-manus-progress.ps1 `
  -ProgressFilePath "~/.config/dcr/worktrees/DCR_Products/test-manus-phase1/progress.md"
# Expected: Returns $true (all items complete)
```

- [ ] **Step 6: Create incomplete-checklist test**

```bash
# Create a second test progress.md with incomplete items
cat > ~/test-incomplete-progress.md << 'EOF'
# Progress Tracking

## Completion Checklist
- [x] Phase 1
- [ ] Phase 2
- [ ] Phase 3
EOF

# Run validation
.\skills\verification-before-completion\scripts\validate-manus-progress.ps1 `
  -ProgressFilePath "~/test-incomplete-progress.md"
# Expected: Returns $false, blocks completion
```

- [ ] **Step 7: Cleanup test files**

```bash
rm -rf ~/.config/dcr/worktrees/DCR_Products/test-manus-phase1
rm ~/test-incomplete-progress.md
```

- [ ] **Step 8: Create summary test report**

Document results in a comment block:

```
# Test Results — Phase 1 MVP

✅ .dcr/config.json created and valid JSON
✅ Template files (.dcr/templates/) created
✅ writing-plans SKILL.md updated with Manus section
✅ init-manus-session.ps1 script runs successfully
✅ verification-before-completion SKILL.md updated
✅ validate-manus-progress.ps1 validation works (complete case)
✅ validate-manus-progress.ps1 validation works (incomplete case)
✅ deploy.ps1 replicates .dcr/config.json
✅ .gitignore .dcr/ entries added

Phase 1 MVP: COMPLETE ✅
```

---

## Task 8: Final Commit and PR Preparation

**Files:**
- None (finalizing)

- [ ] **Step 1: Verify all commits are present**

```bash
git log --oneline | head -10
# Expected to see commits from Task 1-7
```

- [ ] **Step 2: Create feature branch**

```bash
git checkout -b feat/manus-planning-integration-phase1
git push -u origin feat/manus-planning-integration-phase1
```

- [ ] **Step 3: Write comprehensive PR description**

Title: `feat: manus-style 3-file planning integration (Phase 1 MVP)`

Body:
```
## Overview
Implements Phase 1 MVP of Manus-style persistent planning pattern in DCR.

## Changes
- ✅ .dcr/config.json: Control configuration for session file handling
- ✅ .dcr/templates/: task_plan.md, findings.md, progress.md templates
- ✅ writing-plans: Extended to initialize 3-file pattern in worktrees
- ✅ verification-before-completion: Added progress.md checklist validation
- ✅ deploy.ps1: Replicates .dcr/config.json to target environments
- ✅ .gitignore: Protected session directories

## Testing
- All scripts tested end-to-end
- validate-manus-progress.ps1 tested on complete and incomplete checklists
- deploy.ps1 -DryRun confirmed

## Phase 1 Scope (Complete)
- ✅ Core 3-file pattern works
- ✅ writing-plans creates files
- ✅ verification-before-completion validates
- ❌ Hooks (Phase 2+)

## Next Steps
- Phase 2: PreToolUse/PostToolUse hooks for auto-logging
- Phase 3: Full IDE hook coverage (Cursor, Codex, Claude Code)

## Related
- Design: docs/dcr/specs/2026-03-29-manus-planning-integration-design.md
- Reference: https://github.com/OthmanAdi/planning-with-files
```

- [ ] **Step 4: Commit final summary**

```bash
git add -A
git commit -m "docs: manus planning integration phase 1 complete"
git push
```

---

## Blockers & Risks

| Blocker | Severity | Mitigation |
|---------|----------|-----------|
| PowerShell cross-platform compatibility | Medium | Use `.ps1` only for Windows; Bash equivalents in Phase 2+ |
| Worktree path environment variable ($HOME) | Low | Script resolves at runtime, confirmed in init-manus-session.ps1 |
| .dcr/config.json not replicated | Low | deploy.ps1 handles; tested with -DryRun |

---

## Success Metrics (Phase 1)

✅ All 8 tasks complete with passing tests  
✅ 3 files initializable and readable  
✅ Validation script works (complete and incomplete cases)  
✅ PR created and ready for review  

---

## Appendix: File Paths Summary

```
Repository root changes:
  ├─ .dcr/                                          (NEW)
  │   ├─ config.json                               (NEW)
  │   └─ templates/                                (NEW)
  │       ├─ task_plan.md                          (NEW)
  │       ├─ findings.md                           (NEW)
  │       └─ progress.md                           (NEW)
  ├─ skills/writing-plans/
  │   ├─ SKILL.md                                  (MODIFIED)
  │   └─ scripts/
  │       └─ init-manus-session.ps1               (NEW)
  ├─ skills/verification-before-completion/
  │   ├─ SKILL.md                                  (MODIFIED)
  │   └─ scripts/
  │       └─ validate-manus-progress.ps1          (NEW)
  ├─ deploy.ps1                                    (MODIFIED)
  ├─ .gitignore                                    (MODIFIED)
  └─ docs/dcr/plans/                               (NEW PLAN — this file)
```

---

**Plan Status:** 🟢 Ready for Execution  
**Next Command:** Use subagent-driven-development to execute tasks 1-8
