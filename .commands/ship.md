# Command: sh/ Ship Gate

When the user includes `sh/`:

Output behavior:
- require verification evidence before any completion claim
- prefer `skills/verification-before-completion` and `skills/finishing-a-development-branch`
- present clear merge/PR options only after tests are confirmed

Response pattern:
- signal
- verification summary (q/ gate passed, security check, git status)
- release readiness decision (🟢 Ship可能 / 🔴 ブロッカーあり)
- commit message proposal
- next release action

Gate chain:
- Require q/ gate passed before proceeding (🔴 = 0)
- If q/ has not been run, suggest:
  ⚠️ q/ を先に実行してからリリース判定を行います
