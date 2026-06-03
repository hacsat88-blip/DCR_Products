---
name: model-route
routing_category: governance
description: "タスク難易度とコスト制約に応じてモデルをルーティングする。cheap-default / deep-on-demand を徹底する。"
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
  - copilot
  - cursor
  - gemini-cli
---

# Model Route

## 方針

- 既定は軽量モデル
- 高リスク判断、設計統合、複雑レビューだけ高性能モデル
- 反復で詰まったときのみ段階的に昇格

## ルーティング基準

- Low: 単純編集、定型修正、文言更新
- Medium: 複数ファイル変更、テスト修正、依存調整
- High: 設計判断、セキュリティ評価、複雑デバッグ

## 実行ルール

1. まず low-cost で試す
2. 失敗原因を明示してから昇格
3. 完了後は再び low-cost に戻す
