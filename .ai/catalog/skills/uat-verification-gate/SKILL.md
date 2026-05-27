---
name: uat-verification-gate
routing_category: devops
deprecated: true
successor: dcr-pipeline
deprecation_reason: "Folded into dcr-pipeline q/ UAT Gate for OpenAI Skills baseline slimming."
description: "実装がユーザー体験、画面、CLI操作、業務フローに影響するとき、完了前に人間が確認できる受け入れ検証を設計する。テスト通過だけでは不十分で、UAT、証跡、再実行手順、残リスクを残す必要がある場面で使う。"
contract:
  preconditions:
    - "変更がユーザー操作、UI、CLI、または業務フローに影響する"
  postconditions:
    - "UAT手順、期待結果、証跡、失敗時のfix planが残っている"
  invariants:
    - "自動テストだけでユーザー受け入れを代替しない"
    - "検証できない項目は未検証として残す"
composable:
  input_type: artifact
  output_type: verification-report
  chains_with:
    - verification-before-completion
    - code-review
    - systematic-debugging
metadata:
  origin: gsd-build/get-shit-done
  upstream_url: "https://github.com/gsd-build/get-shit-done"
  upstream_paths:
    - "README.md"
    - "docs/ARCHITECTURE.md"
    - "docs/USER-GUIDE.md"
  upstream_license: "MIT"
  imported_at: "2026-05-11"
  adapted_from: "verify-work and UAT gate pattern; mapped to DCR verification flow."
  model_neutral: true
---

# UAT Verification Gate

## 目的

「テストは通る」と「ユーザーが受け入れられる」は別物として扱う。
UI、CLI、業務フロー、生成物の品質は、人間が追える手順と証跡で検証する。

## UAT Template

```markdown
UAT VERIFICATION
- Scenario:
- Preconditions:
- Steps:
- Expected:
- Actual:
- Evidence:
- Gaps:
- Fix plan:
```

## 手順

1. ユーザーが実際に行う scenario を書く
2. 前提データ、画面、コマンド、権限を明示する
3. 操作手順を 5-10 step 以内にする
4. expected / actual を分ける
5. screenshot、command output、file diff などの証跡を残す
6. 失敗時は原因推測ではなく fix plan に落とす

## 完了条件

- 自動検証が通っている
- UAT scenario が最低 1 つ確認されている
- 未確認項目が明示されている
- ユーザー判断が必要な項目を勝手に完了扱いしていない

