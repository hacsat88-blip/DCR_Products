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
  - cursor
---

# Deployment Patterns

## 基本原則

- デプロイは再現可能で idempotent
- 段階リリース（canary/blue-green）を優先
- 失敗時ロールバックを事前定義
- CI は push / PR ごとに品質を検証し、CD は CI 通過後だけ反映へ進む別工程として扱う
- LLM アプリでは、生成コードの型ずれ・テスト欠落・ローカル依存を前提に、早い段階から最低 CI を置く

## CI と CD の区別

### CI（継続的インテグレーション）

コード変更ごとに、まっさらな実行環境で自動チェックを走らせる。
最低線は次の順に repo-native なコマンドで確認する。

- lint / format: 未使用 import、タイポ、整形差分、危険な単純ミスを検出する
- typecheck: 宣言した型と実装のずれを実行前に検出する
- test: 単体・統合テストでロジックの正しさを確認する
- smoke / server response: 必要に応じてサーバーを起動し、最低限のレスポンスを確認する

Python では `ruff`、`mypy`、`pytest` が代表例だが、固定ツールとして押し付けない。
実際には対象 repo の既存 package script、Makefile、PowerShell script、CI workflow を優先する。

### CD（継続的デプロイ / デリバリー）

CI が全通過した変更だけを staging / production / preview などへ反映する工程。
DCR では CD や production 反映を P3 操作として扱い、ユーザー承認なしに外部公開・本番反映を実行しない。

## LLM アプリ向け段階ゲート

- prototype / local demo: CI が未整備なら助言として記録し、最低 CI の追加余地を plan に含める
- portfolio / PR / shared preview: lint / format、typecheck、test の CI 証拠を強く推奨し、不足は q/ のリスクとして扱う
- production / CD / external release: CI が失敗または未確認のまま sh/ を通過させない。例外は小さな試作のみ明示記録する

## リリース前チェック

- build/test/lint/typecheck が全通過
- CI workflow または同等のローカル再現コマンドが確認済み
- 必要な smoke / health check が成功
- 監視・アラートが有効
- DB migration の後方互換性確認
- 依存サービス障害時の挙動確認

## ロールバックチェック

- 直前 artifact が参照可能
- 切り戻し手順が 1 コマンドで実行可能
- 切り戻し後の検証手順が定義済み
