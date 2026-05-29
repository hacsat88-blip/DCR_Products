---
name: j-quants
routing_category: growth
description: J-Quants 関連タスクのルーティング用エントリ。CLI 実行・データ取得・プラン制約確認は `jquants-cli-usage` を利用する。
metadata:
  origin: DCR local
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
  - windsurf
  - opencode
  - gemini-cli
---

# J-Quants Skill Router

J-Quants 関連の依頼を受けたときに、配下の詳細スキルへ委譲するためのルートスキル。

## 役割

- J-Quants CLI の具体的なコマンド設計・実行は `skills/j-quants/jquants-cli-usage/SKILL.md` を使用する
- プラン別 API 可否、取得可能期間、更新時刻の確認が必要な場合は同スキルの references を参照する
- このファイル自体はルーティング専用であり、詳細仕様の正本は `jquants-cli-usage` 側に置く
