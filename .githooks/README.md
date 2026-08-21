# DCR Git Hooks

Repository-managed hooks for catching generated mirror drift before CI.

## Enable

```bash
pwsh -NoProfile -ExecutionPolicy Bypass -File ./tools/install-git-hooks.ps1
```

This is intentionally not configured by automation because Git config is local
developer state.

## Hooks

- `commit-msg`: validates the message against Conventional Commits via
  `tools/lib/validate-commit-msg-file.ps1`. Git-native, so it applies to
  Claude Code, Codex, Cursor, and manual `git commit` alike.
- `pre-commit`: shell wrapper that calls `pre-commit.ps1`.
- `pre-commit.ps1`: runs `deploy.ps1 -Check` when staged changes touch DCR
  source, deploy scripts, tracked mirror paths, or drift-check configuration.
- `pre-push`: shell wrapper that calls `pre-push.ps1`.
- `pre-push.ps1`: runs `deploy.ps1 -Check` when pushed commits touch the same
  surfaces.
