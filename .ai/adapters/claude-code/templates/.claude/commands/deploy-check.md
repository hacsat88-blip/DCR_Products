# /deploy-check

目的: DCR の整合性チェックを実行し、ドリフトを早期検知する。

## 実行手順

1. 変更範囲を確認する。
- `git status --short`

2. デプロイ整合チェックを実行する。
- `powershell -ExecutionPolicy Bypass -File .\\deploy.ps1 -Check`

3. 結果を報告する。
- pass/fail
- 失敗時は差分ファイルと想定原因

## 出力フォーマット

- Scope
- Check Result
- Follow-up
