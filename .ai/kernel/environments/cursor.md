# DCR Kernel Environment — Cursor

## Entrypoint

- `.cursor/rules/dcr-kernel.md`

## Environment-specific behavior

- `.cursor/rules/` 配下から自動ロードされる前提で構成する
- Module reference は簡潔に保ち、共通仕様は [../_base.md](../_base.md) に寄せる
- generated rule の同期との整合を優先する

## Session plan handoff

- Cursor はセッション間の計画引き継ぎに `docs/dcr/plans/` を参照する
- Cursor rules に gate state を埋め込まない（デプロイで上書きされるため）
- 計画の継続は `docs/dcr/plans/` ファイルの存在で判断する

## .mdc metadata preservation

- `deploy.ps1` が生成する `.mdc` ファイルの先頭には Cursor 固有の frontmatter が含まれる
- `rules/*.md` の YAML frontmatter から `description`, `domain` を `.mdc` の metadata にマップする
- 手動で `.mdc` を編集した場合、次回 deploy で上書きされる点に注意

## Notes

- Cursor rule は過度に肥大化させない
- runtime 安定性のため、最低限必要な inline 指示は残す