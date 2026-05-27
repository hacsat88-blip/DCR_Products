---
name: parallel-wave-execution
routing_category: governance
deprecated: true
successor: governance-ops
deprecation_reason: "Folded into governance-ops Parallel Work lane for OpenAI Skills baseline slimming."
description: "複数タスクを依存関係ごとの wave に分けて、安全に並列または逐次実行したいときに使う。subagent が使える環境でも使えない環境でも、同じ dependency wave と検証順序を保つための実行設計。"
contract:
  preconditions:
    - "複数の実装/調査/検証タスクがあり、依存関係を整理できる"
  postconditions:
    - "wave ごとの実行順、所有ファイル、検証、失敗時の扱いが定義されている"
  invariants:
    - "同一ファイルへの競合書き込みを許可しない"
    - "subagent がない runtime でも逐次実行へ落とせる"
composable:
  input_type: plan
  output_type: execution-plan
  chains_with:
    - parallel-agent-patterns
    - subagent-driven-development
    - verification-before-completion
metadata:
  origin: gsd-build/get-shit-done
  upstream_url: "https://github.com/gsd-build/get-shit-done"
  upstream_paths:
    - "README.md"
    - "docs/ARCHITECTURE.md"
  upstream_license: "MIT"
  imported_at: "2026-05-11"
  adapted_from: "Wave execution model; no GSD command runtime imported."
  model_neutral: true
---

# Parallel Wave Execution

## 目的

依存関係のない作業だけを同じ wave に置き、並列化できる環境では速く、逐次しかできない環境でも安全に進める。

## Wave Model

```text
Wave 1: A, B, C  # 互いに独立
Wave 2: D        # A と B の完了が前提
Wave 3: E, F     # D 完了後に並列可能
```

## 手順

1. task を 1 行単位で列挙する
2. 各 task の input / output / owner files を書く
3. 依存関係を `requires` として明示する
4. 依存なし task を同じ wave にまとめる
5. 書き込み先が重なる task は wave を分ける
6. 各 wave の最後に検証を置く
7. subagent が使えない runtime では wave 内を上から順に実行する

## Failure Policy

| Failure | 扱い |
|---|---|
| critical path failure | 後続 wave を止め、診断へ回す |
| non-critical failure | 記録し、独立 task は継続 |
| verification failure | 修正 wave を作り、完了主張を止める |

## DCR Notes

- Codex では subagent 利用はユーザーが明示した場合だけにする
- Claude / Cursor / Windsurf / Copilot では、各 runtime の delegation 能力に合わせる
- 並列化できない環境でも plan の構造は変えない

