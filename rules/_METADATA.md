# Rules Metadata Policy

## Purpose

`rules/*.md` remains the source of truth for specialist roles.
This file defines future metadata fields so routing and editor adapters
can improve without changing every consumer independently.

## Current policy

- Metadata is optional today
- Existing rule files remain valid without any metadata block
- Auto-routing must keep working from filename, title, and task context alone
- `deploy.ps1` skips `_*.md` files and generates Cursor `.mdc` files with safe defaults

## Reserved fields

Use these field names when metadata is introduced:

- `domain`: main specialty, such as `frontend`, `security`, `seo`
- `risk`: default risk level, such as `low`, `medium`, `high`
- `artifacts`: primary targets, such as `tsx`, `api`, `docs`, `ads`
- `keywords`: short trigger terms used for routing
- `pair_with`: optional companion roles that are safe to combine
- `avoid_with`: roles that should not be auto-combined

## Rules for future adoption

- Add metadata only when it improves routing or adapter generation
- Keep values short, explicit, and editor-agnostic
- Do not require metadata for every file before using the repository
- Prefer one main `domain` over multiple overlapping domains
- Keep automatic role selection capped at two roles even after metadata exists
- Store non-role documentation in `_*.md` files so deploy adapters can ignore it

## Example

```yaml
domain: frontend
risk: medium
artifacts:
  - tsx
  - css
keywords:
  - react
  - nextjs
  - ui
pair_with:
  - ux-architect
avoid_with:
  - legal-compliance-checker
```
