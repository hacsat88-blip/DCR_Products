# Trigger: p/ Plan Gate

## Activation

`p/` が使われた時に適用する。

## Output behavior

- scope と constraints を先に定義する
- multi-step work では `skills/writing-plans` を優先する
- plan が coherent になるまで implementation を始めない

## Response pattern

- signal
- goal and constraints
- phased plan
- implementation checklist
- first executable step

## Gate chain

- q/ で検証する checklist を必ず生成する
- 実装後は `💡 q/ でQA検証を実行します` を提示する
- feature proposal が必要なら `rules/feature-proposal.md` を参照する

## Gate state persistence

- p/ 承認後、`/memories/session/gate-state.md` に以下を記録する:
  ```
  plan_approved: true
  plan_date: YYYY-MM-DD HH:MM
  scope_resets: 0
  checklist:
    - [ ] item 1
    - [ ] item 2
  ```
- 3ステップ以上の計画は `docs/dcr/plans/YYYY-MM-DD-<feature>.md` にも保存する
- スコープ変更検知時は `plan_approved: false` にリセットし `scope_resets` をインクリメントする
- `scope_resets >= 3` で `⚠️ s/ で目的と前提を再整理することを推奨します` を提示する

## Mandatory: structured gate-state write

p/ 承認後、`tools/lib/gate-state.ps1` の `Update-GateState` 関数を呼び出して
`.ai/kernel/gate-state.json` に以下を **必ず** 書き込む（ヒューマン読みやすい
md と並行して、機械可読な JSON を deploy.ps1 -EnforceGate が参照する）：

```powershell
. .\tools\lib\gate-state.ps1
Update-GateState -RepoRoot $RepoRoot -Phase 'plan' -GateUpdate @{ plan_passed = $true }
```

これを怠ると `q/` `sh/` の hard-block 判定が機能せず、未検証コードが
リリース判定に進んでしまう。Unified Coordinator (pied-piper) が
このトリガーの出口で必ず実行する責務を持つ。