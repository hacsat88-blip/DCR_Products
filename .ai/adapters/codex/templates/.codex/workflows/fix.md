# /fix

目的: 不具合や指摘事項を最小差分で修正し、再発防止まで確認する。

## 実行手順

1. 問題を再現する。
- 失敗コマンドまたは再現手順を明示
- 期待値と実測値を分けて記録

2. 原因を特定する。
- 変更対象ファイルを列挙
- 影響範囲を明示

3. 最小修正を適用する。
- 既存規約に従い、不要なリファクタを避ける
- 1つの原因に対して1つの修正を優先

4. 検証する。
- 問題再現手順を再実行
- `pwsh -NoProfile -ExecutionPolicy Bypass -File .\\validate.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File .\\deploy.ps1 -Check`

5. 結果を報告する。
- 何を直したか
- なぜ直ったか
- 未解決リスク
