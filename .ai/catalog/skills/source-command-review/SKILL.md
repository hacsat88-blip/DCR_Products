---
name: "source-command-review"
description: "Migrated source command `review`"
contract:
  preconditions:
    - "The request matches this skill's description or routing category."
  postconditions:
    - "The response names the result, reasoning, and verification or handoff path."
  invariants:
    - "Do not treat generated mirrors or runtime caches as DCR source of truth."
composable:
  input_type: task
  output_type: artifact-or-decision
  chains_with:
    - verification-before-completion
runtime_targets:
  - codex
  - claude
  - antigravity
---

# source-command-review

Use this skill when the user asks to run the migrated source command `review`.

## Command Template

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

## 出力フォーマット

- Findings（重要度順）
- Open Questions（必要時のみ）
- Merge Judgment
