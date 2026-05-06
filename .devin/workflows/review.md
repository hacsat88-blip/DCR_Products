# review

Purpose: review the working tree or a proposed change risk-first and decide whether it is safe to merge or continue.

## Steps

1. Inspect current status and diff:

```powershell
git status --short
git diff --name-status
git diff
```

2. Check source-of-truth boundaries:
   - `.ai/` for shared DCR behavior
   - `.devin/` for Devin-specific thin layer
   - generated mirrors should not be hand-edited
3. Review correctness, security, maintainability, and verification coverage.
4. Run relevant checks. For DCR/runtime/config changes:

```powershell
powershell -ExecutionPolicy Bypass -File ./validate.ps1
powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
```

## Report

- Findings by severity
- Open questions
- Verification evidence
- Merge judgment
