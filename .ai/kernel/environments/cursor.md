# DCR Kernel Environment — Cursor

## Entrypoint

- `.cursor/rules/dcr-kernel.md`

## Environment-specific behavior

- `.cursor/rules/` 配下から自動ロードされる前提で構成する
- Module reference は簡潔に保ち、共通仕様は [../_base.md](../_base.md) に寄せる
- generated rule の同期との整合を優先する

## Notes

- Cursor rule は過度に肥大化させない
- runtime 安定性のため、最低限必要な inline 指示は残す