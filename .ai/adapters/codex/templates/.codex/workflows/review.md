# /review

目的: 変更差分をリスク優先でレビューし、マージ判断を明確化する。

## 実行手順

1. 変更範囲を確認する。
- `git status --short`
- `git diff --name-status`

2. 必須検証を実行する。
- `pwsh -NoProfile -ExecutionPolicy Bypass -File .\\validate.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File .\\deploy.ps1 -Check`

3. レビュー結果を重要度順で出力する。
- Critical / Important / Minor の順で列挙
- 参照先ファイルと根拠を明記
- 問題がなければ「重大指摘なし」を明記

4. 最終判断を出す。
- Merge Ready / Needs Fix のどちらか
- 残リスクと次アクションを1-3行で提示
