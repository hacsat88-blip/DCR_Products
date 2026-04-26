# Trigger: sh/ Ship Gate

## Activation

`sh/` が使われた時に適用する。

## Output behavior

- completion claim の前に verification evidence を要求する
- `skills/verification-before-completion` と `skills/finishing-a-development-branch` を優先する
- tests 確認後にのみ merge / PR option を示す

## Response pattern

- signal
- verification summary
- release readiness decision
- commit message proposal
- next release action

## Gate chain

- q/ 通過済みが前提
- q/ 未実行なら `⚠️ q/ を先に実行してからリリース判定を行います` を提示する

## Gate state enforcement

- sh/ 起動時、`/memories/session/gate-state.md` の `qa_passed: true` を確認する
- `qa_passed: true` が存在しない場合: **ブロック**。実装を進めず以下を返す:
  ```
  🔴 Stop — q/ QA Gate を通過していません。
  💡 q/ でQA検証を実行してください
  ```
- `qa_passed: true` かつ `findings_summary` 内に critical > 0: **ブロック**
- 検証証跡が揃っている場合のみリリース判定に進む

## Ship checklist

sh/ 通過時、以下を確認して報告する:
1. q/ の全チェックリスト通過
2. テスト実行結果（直近の fresh run）
3. git status がクリーン（未コミットの変更なし）
4. セキュリティ上の懸念がないこと
5. コミットメッセージが規約に従っていること

## Mandatory: structured gate-state write + hard-block check

sh/ 実行直前に `Test-GateReady` で `qa_passed = true` && `critical = 0`
を **必ず** 確認する：

```powershell
. .\tools\lib\gate-state.ps1
if (-not (Test-GateReady -RepoRoot $RepoRoot -RequireGate 'qa_passed')) {
    Write-Host "🔴 Stop — q/ QA Gate を通過していません。"
    return
}
Update-GateState -RepoRoot $RepoRoot -Phase 'ship' -GateUpdate @{ ship_ready = $true }
```

`deploy.ps1 -EnforceGate` 実行時はこのチェックが自動適用される。
ヒューマン操作で sh/ を回す場合も、Update-GateState の呼び出しを
怠らないこと（次のセッション以降のゲート連鎖が壊れる）。