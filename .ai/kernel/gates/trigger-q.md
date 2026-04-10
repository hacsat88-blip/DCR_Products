# Trigger: q/ QA Gate

## Activation

`q/` が使われた時に適用する。

## Output behavior

- assumption より reproducible validation を優先する
- UI や browser behavior がある場合は `skills/webapp-testing` を優先する
- findings は severity と evidence 付きで報告する

## Response pattern

- signal
- verification scope
- findings
- feature checklist table
- minimal safe fix
- re-verification step

## Gate chain

- p/ checklist があれば 1 項目ずつ検証する
- 🔴 があれば fix 後に q/ を再実行する
- 全通過時は `💡 sh/ でリリース判定に進めます` を提示する

## Gate state persistence

- q/ 実行時、`/memories/session/gate-state.md` の `plan_approved: true` を確認する
- `plan_approved` が存在しない場合: `⚠️ p/ で計画を先に策定してください` を提示（ブロックではなく警告）
- q/ 全通過（🔴 = 0）時、同ファイルに以下を追記する:
  ```
  qa_passed: true
  qa_date: YYYY-MM-DD HH:MM
  findings_summary: "N items checked, 0 critical, M warnings"
  ```
- 🔴 が残存する場合は `qa_passed: false` のまま

## Evidence format

検証証跡は以下のいずれかを含むこと:
- テスト実行結果（コマンド + 出力）
- lint/build 結果
- 目視確認の場合はスクリーンショットまたは具体的な確認手順と結果