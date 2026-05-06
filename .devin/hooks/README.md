# Devin Hook Scripts

These scripts are defensive examples for Devin hook wiring.

## Input Contract

Each script accepts hook payload text from stdin when available. It also accepts these provisional environment variables when the hook runtime exposes them. Confirm the current Devin hook schema before enabling:

- `DEVIN_TOOL_NAME`
- `DEVIN_COMMAND`
- `DEVIN_FILE_PATH`
- `DEVIN_PROMPT`

## Scripts

- `guard-secrets.ps1`: blocks likely secret-bearing paths.
- `guard-destructive.ps1`: blocks destructive shell commands unless the user has explicitly approved a specific action outside the hook.
- `guard-generated-files.ps1`: blocks direct edits to generated mirrors.
- `remind-verification.ps1`: reminds the agent to run DCR validation after runtime/config edits.
- `prompt-routing-hint.ps1`: nudges DCR prefixes and plan-first behavior for ambiguous work.

## Enabling

Use `.devin/hooks.example.json` as a template only. Confirm the current Devin hook schema before copying it into an active config file. If your runtime uses different payload fields, update both `hooks.example.json` and the scripts together.
