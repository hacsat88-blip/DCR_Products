---
name: deployment-patterns
routing_category: devops
description: "CI/CD、ヘルスチェック、ロールバック、段階リリースの標準パターン。運用前提の安全なデプロイを定義する。"
disable-model-invocation: true
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

# Deployment Patterns

## 基本原則

- デプロイは再現可能で idempotent
- 段階リリース（canary/blue-green）を優先
- 失敗時ロールバックを事前定義

## リリース前チェック

- build/test/lint/typecheck が全通過
- 監視・アラートが有効
- DB migration の後方互換性確認
- 依存サービス障害時の挙動確認

## ロールバックチェック

- 直前 artifact が参照可能
- 切り戻し手順が 1 コマンドで実行可能
- 切り戻し後の検証手順が定義済み
