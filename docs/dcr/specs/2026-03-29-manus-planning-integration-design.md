# Manus-Style Planning Integration for DCR — Design Document

**Date:** 2026-03-29  
**Status:** Design Review  
**Owner:** DCR Integration Task

---

## Executive Summary

Integrate Manus AI's proven 3-file persistent markdown pattern into DCR's writing-plans → subagent-driven-development → verification-before-completion workflow. This enables context persistence across long sessions, captures session history, and implements the operational pattern behind Meta's $2B Manus acquisition.

---

## Objective

Make DCR agents operate like Manus:
- Store context on disk (persistent, unlimited)
- Re-read plan before decisions (attention manipulation)
- Track all failures (error persistence)
- Log progress with checkpoints (goal tracking)
- Verify completion before stopping (completion assurance)

---

## Scope

### In Scope
- ✅ 3-file pattern (task_plan.md, findings.md, progress.md)
- ✅ Git worktree integration (using-git-worktrees)
- ✅ Phase 1 MVP (writing-plans + verification hooks)
- ✅ Phase 2 PreToolUse hooks (GitHub Copilot)
- ✅ Technology: Markdown (persistent), PowerShell/Bash (hooks)

### Out of Scope (Future)
- ❌ Phase 3 full IDE hook automation (Roadmap 3 months)
- ❌ LLM-based session summarization
- ❌ Multi-agent collaboration tracking

---

## Architecture

### 3.1 File Structure

```
~/.config/dcr/worktrees/<project>/<task-branch>/
├── task_plan.md          (Goal, Scope, Phases, Blockers)
├── findings.md           (Decisions, Research, Error Log)
└── progress.md           (Checklist, Session Timeline)
```

**Initialization:** writing-plans skill creates all 3 files  
**Lifecycle:** Persists until worktree deletion  
**Retrieval:** writing-plans → subagent-driven-development → verification-before-completion  

### 3.2 Control Configuration

**`.dcr/config.json` (new):**
```json
{
  "version": "1.0",
  "manus_pattern": {
    "enabled": true,
    "commit_session_files": true,
    "worktree_location": "~/.config/dcr/worktrees",
    "auto_update_progress": true
  },
  "hooks": {
    "pre_tool_use": "re-read task_plan.md",
    "post_tool_use": "log findings.md + update progress.md"
  }
}
```

**Dynamic switching:** Projects can set `commit_session_files: false` for local-only sessions.

### 3.3 Skill Integration Flow

```
writing-plans (ENTRY)
  ├─ Create worktree at ~/.config/dcr/worktrees/<project>/<task-name>/
  ├─ Initialize 3 files
  ├─ Set .dcr/config.json (commit_session_files based on project)
  ├─ Dispatch to subagent-driven-development
  
subagent-driven-development
  ├─ PreToolUse hook: Read task_plan.md (retain context)
  ├─ Execute implementation tasks
  ├─ PostToolUse hook: Append to findings.md (log decisions)
  ├─ Update progress.md (checkpoint checklist)
  └─ (Returns when tasks complete)
  
verification-before-completion
  ├─ Read progress.md checklist
  ├─ Verify all phases [✅]
  ├─ If incomplete: loop back to subagent-driven-development
  └─ If complete: Commit task_plan.md (if enabled) → worktree ready for merge
```

### 3.4 File Templates

**task_plan.md:**
```markdown
# [Feature Name] Implementation Plan — Manus Session

**Session context:** Git worktree at ~/.config/dcr/worktrees/<project>/<task-name>/  
**Session files:** task_plan.md, findings.md, progress.md  
**Commit strategy:** (config.json decides)

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
- Branch: feature/task-name
- Based on: docs/dcr/specs/YYYY-MM-DD-*.md
- Original request: [Link/Reference]

---
_Last session update: [timestamp]_  
_Status: IN_PROGRESS_
```

**findings.md:**
```markdown
# Findings & Decisions — Manus Session: feature/task-name

## Research & Rationale
- **Decision 1:** Why we chose [X] over [Y]. Context: [link/reference]
- **Decision 2:** Architecture trade-off analysis. Evaluated [options].

## Implementation Attempts
| Attempt | Approach | Result | Error Log | Mutation |
|---------|----------|--------|-----------|----------|
| 1 | Use library X | ❌ Failed | "Module not found" | Use vendored copy |
| 2 | Vendored copy | ✅ Success | — | — |

## Error Patterns (Never Repeat These)
- Pattern 1: [Error message] → Root cause: [Why] → Prevention: [Avoid by...]
- Pattern 2: [Error message] → Root cause: [Why] → Prevention: [Avoid by...]

---
_Auto-appended by hooks and manual log entries_  
_Last update: [timestamp]_
```

**progress.md:**
```markdown
# Progress Tracking — Manus Session: feature/task-name

## Completion Checklist
- [ ] Phase 1: [Deliverable A] — Expected: [date]
- [ ] Phase 2: [Deliverable B] — Expected: [date]
- [ ] Phase 3: [Deliverable C] — Expected: [date]
- [ ] All findings.md items logged
- [ ] No recurring errors in error log

## Session Timeline
| Timestamp | Action | Tool | Result | Notes |
|-----------|--------|------|--------|-------|
| 2026-03-29 14:00 | Start writing-plans | writing-plans skill | ✅ Created 3 files | Worktree: feature/task-x |
| 2026-03-29 14:15 | Execute subagent task 1 | subagent-driven-dev | ✅ API endpoint done | findings.md updated |
| 2026-03-29 14:30 | Re-read plan (hook) | PreToolUse hook | ✅ Context retained | No drift |

## Verification Status
- [ ] All phases in task_plan.md checklist complete
- [ ] findings.md has 3+ decisions logged
- [ ] progress.md timeline has 5+ entries
- [ ] Error log shows no repeating patterns
- [ ] Ready for merge review

---
_Auto-updated by verification hooks_  
_Last verification: [timestamp]_
```

---

## Implementation Phases

### Phase 1: MVP (2-3 weeks)
**Goal:** Core 3-file pattern works, Phase 1 of workflow complete.

**Tasks:**
1. Create `.dcr/config.json` template
2. Modify writing-plans skill:
   - Create worktree at ~/.config/dcr/worktrees/<project>/<task-name>/
   - Generate 3 files from templates
   - Initialize config
3. Modify verification-before-completion skill:
   - Read progress.md checklist
   - Validate completion
4. Test with manual session (no hooks yet)

**Deliverables:**
- ✅ `.dcr/config.json` (committed to repo)
- ✅ writing-plans v2 (generates 3-file pattern)
- ✅ verification-before-completion v2 (checklist validation)
- ✅ Phase 1 documentation

**Success Metric:** One manual end-to-end task completes with all 3 files populated + verified.

---

### Phase 2: Hook Integration (1 month after Phase 1)
**Goal:** PreToolUse/PostToolUse hooks automate findings.md + progress.md updates.

**Tasks:**
1. Create GitHub Copilot hooks:
   - `.github/hooks/planning-with-files/pre-tool-use.ps1` — Re-read task_plan.md
   - `.github/hooks/planning-with-files/post-tool-use.ps1` — Append findings + update progress
2. Test hook lifecycle in VS Code environment
3. Update deploy.ps1 to copy hooks to target environments
4. Document hook behavior for users

**Deliverables:**
- ✅ GitHub Copilot hooks (bash + PowerShell)
- ✅ Hook test suite
- ✅ deploy.ps1 hook integration
- ✅ Phase 2 documentation

**Success Metric:** Task execution auto-logs to findings.md + progress.md without manual intervention.

---

### Phase 3: Full IDE Coverage (3 months after Phase 1)
**Goal:** Hook parity across Cursor, Codex, Claude Code.

**Tasks:**
1. Create Cursor hooks (`.cursor/hooks/planning-with-files/*`)
2. Create Codex hooks (`.codex/hooks/planning-with-files/*`)
3. Create Claude Code hooks (`.claude/hooks/planning-with-files/*`) — if applicable
4. Cross-environment testing
5. Edge case handling (concurrent sessions, hook failures, etc.)

**Deliverables:**
- ✅ Multi-environment hook set
- ✅ Comprehensive test suite
- ✅ Rollback procedures
- ✅ Phase 3 documentation

**Success Metric:** All IDEs maintain synchronized findings.md + progress.md during parallel task execution.

---

## Success Criteria

### Design Validation
- ✅ User approval of this design document
- ✅ No conflicting patterns identified in existing skills
- ✅ Worktree location (~/.config/dcr/worktrees/) aligns with using-git-worktrees strategy

### Implementation Validation (Phase 1)
- ✅ writing-plans creates 3 files in expected location
- ✅ verification-before-completion reads + validates progress.md
- ✅ All 3 files persist across session boundary
- ✅ deploy.ps1 includes .dcr/config.json in replication

### Outcome Metrics
- 📊 **Retention:** Session plans persist across 50+ tool executions (no context drift)
- 📊 **Findability:** findings.md accessible in git history after worktree deletion
- 📊 **UX:** Users report improved context understanding vs. vanilla writing-plans

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Hooks fail silently, findings.md not updated | Medium | Medium | Add verbose logging, fallback to manual logging |
| File path conflicts across projects | Medium | Low | Unique project ID in path |
| .gitignore excludes session files unintentionally | High | Medium | config.json explicitly controls; document in MIGRATION.md |
| Hook performance impact (large findings.md) | Low | Low | Archive old findings.md yearly |

---

## Open Questions Resolved

✅ **Scope:** A + B ハイブリッド型（計画フェーズ + マルチフェーズ追跡）  
✅ **Storage:** C - Git worktree + ブランチ連動  
✅ **Commits:** C - ハイブリッド（.dcr/config.json で動的制御）  
✅ **Rollout:** Phase 1 → 2 → 3 段階実装  

---

## Next Steps

1. ✅ **Spec approval** — User reviews this document
2. **Writing-plans implementation** — Create implementation plan with writing-plans skill
3. **Modify existing skills** — Update writing-plans + verification-before-completion
4. **Phase 1 test** — Manual end-to-end session
5. **Phase 2 planning** — Hook development roadmap

---

## References

- **Manus Architecture:** https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
- **planning-with-files GitHub:** https://github.com/OthmanAdi/planning-with-files
- **DCR unified-integration:** `.ai/module/unified-integration.md`
- **existing writing-plans:** `skills/writing-plans/SKILL.md`
- **existing using-git-worktrees:** `skills/using-git-worktrees/SKILL.md`

---

**Document Status:** 🟢 Ready for User Review
