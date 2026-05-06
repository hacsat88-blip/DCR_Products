# verify

Purpose: gather concrete evidence before claiming work is complete.

## Steps

1. Inspect the current working tree:

```powershell
git status --short
git diff --name-status
```

2. Run narrow checks specific to the touched files.
3. For DCR/runtime/config changes, run:

```powershell
powershell -ExecutionPolicy Bypass -File ./validate.ps1
powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -Check
```

4. If checks fail, classify each failure as related, unrelated pre-existing, or unknown.
5. Do not claim success unless the relevant checks passed or the remaining risk is explicitly stated.

## Report

- Commands run
- Pass/fail result
- Relevant output excerpt
- Unverified areas
- Residual risk
