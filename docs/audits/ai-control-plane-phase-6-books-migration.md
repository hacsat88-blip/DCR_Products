# AI Control Plane Phase 6: Books Migration

Date: 2026-06-21

## Summary

Moved the shared book primary source from `.ai/book` to `.ai/assets/books`.
The legacy `.ai/book` directory is now a compatibility marker only.

## Changes

- Added `books` support to `tools/lib/catalog-paths.ps1`.
- Updated `tools/validate-shared-book.ps1` and `tools/update-ai-control-plane-registries.ps1` to resolve the shared book source instead of hard-coding `.ai/book`.
- Moved the six shared book chapters to `.ai/assets/books`.
- Left `.ai/book/README.md` as a compatibility marker.
- Updated environment kernel links to `../../assets/books/*.md`.
- Updated target registry, distribution manifests, navigation map, and source layout metadata.

## Current State

- Current primary: `.ai/assets/books`
- Legacy path: `.ai/book`
- Legacy active chapters: 0
- Shared book chapters: 6

## Validation

Run after migration:

```powershell
.\tools\validate-shared-book.ps1
.\tools\update-ai-control-plane-registries.ps1 -Check
.\deploy.ps1
.\deploy.ps1 -Check
.\validate.ps1
```
