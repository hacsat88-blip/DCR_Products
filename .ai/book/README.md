# DCR Shared Book

This directory is the shared source of truth for model-independent thinking and execution behavior.

All AI environments should read this book first. Environment files may describe capabilities, entrypoints, storage, tone, and UI limits, but must not redefine the shared thinking contract.

## Chapters

- [runtime.md](runtime.md): shared behavior, response contract, freshness, triggers, execution modes
- [routing.md](routing.md): Rule / Skill / Agent selection and alias handling
- [gates.md](gates.md): trigger and gate chain behavior
- [permissions.md](permissions.md): P1 / P2 / P3 permissions and safety boundaries
- [tool-contract.md](tool-contract.md): abstract tool operations and fallbacks across environments

## Compatibility Layer

The legacy runtime files under `.ai/kernel/` remain available for adapters and tools that already load them.

- `.ai/kernel/_base.md` mirrors the runtime chapter for common execution behavior.
- `.ai/kernel/dcr-kernel.md` is the inline runtime distributed to Cursor/Windsurf-style rule loaders.
- `.ai/module/unified-router.md` remains the detailed router implementation referenced by [routing.md](routing.md).

