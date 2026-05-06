# fix

Purpose: reproduce a bug, identify the root cause, apply the smallest safe fix, and verify the result.

## Steps

1. Capture the symptom, expected behavior, and actual behavior.
2. Reproduce with the narrowest command or manual path available.
3. Identify the failing boundary and affected files.
4. Apply a minimal fix without unrelated refactoring.
5. Re-run the reproduction path.
6. For DCR/runtime/config changes, run:

```powershell
powershell -ExecutionPolicy Bypass -File ./validate.ps1
powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
```

## Report

- Reproduction
- Root cause
- Minimal fix
- Verification evidence
- Residual risk
