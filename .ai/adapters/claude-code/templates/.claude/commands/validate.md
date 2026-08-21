# /validate

目的: 構造品質とルーティング整合を機械的に検証する。

## 実行手順

1. 検証を実行する。
- `pwsh -NoProfile -ExecutionPolicy Bypass -File .\\validate.ps1`

2. 失敗時に追加確認する。
- `pwsh -NoProfile -ExecutionPolicy Bypass -File .\\deploy.ps1 -Check`

3. 結果を報告する。
- 成功/失敗
- 失敗時の主要エラー

## 出力フォーマット

- Validation Command
- Result
- Blocking Issues
