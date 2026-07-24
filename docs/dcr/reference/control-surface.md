# Mac Triad Control Surface

## Read Order

1. `.ai/core/`: 共通動作と安全境界
2. `.ai/routing/`: routing と gate
3. `.ai/catalog/`: rules、skills、agents source
4. `.ai/adapters/manifest.yaml`: triad の配布契約
5. `README.md`: Mac での検証と同期手順

`docs/dcr/` は補助説明と cross-session artifact の置き場です。machine-readableな正本ではありません。

## Safe Editing

- 正本を変更してから deploy する。
- 生成 mirror を直接修正しない。
- Codex / Claude Code / Cursor 以外の runtime surface を追加しない。
