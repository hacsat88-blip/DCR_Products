# Supermemory Project Policy

## Project

- owner: satoshi-development
- scope: project-fixed

## Project Scope Map

- satoshi-dev: サトシ開発全体の横断文脈、共通判断、全体方針
- dcr-core: DCR 共通資産、root docs、運用ポリシー
- product-cyber-stock-dashboard: Product/cyber-stock-dashboard 配下の会話と判断
- product-dexter-jp: Product/dexter-jp 配下の会話と判断

上記以外の Product を追加する場合は、`product-<folder-name>` 形式で project_id を追加する。

## Default Mode

- mode: auto-by-default
- save_default: auto
- recall_default: auto
- confirm_mode: high-risk-only

## Confirm Categories

1. secrets
2. personal-data
3. production-operations
4. finance-contract-legal
5. architecture-or-ops-policy-change
6. implementation-policy-change
7. review-policy-change

## Implementation Policy (Project Common)

- policy_1: 変更は最小差分を優先し、正本を先に更新してから生成物へ反映する
- policy_2: 既存 API 互換を維持し、破壊的変更は事前合意なしで行わない
- policy_3: 実装完了主張の前に validate と関連テストで検証する

## Code Review Policy (Project Common)

- review_1: 重大度順で欠陥、回帰、セキュリティリスク、テスト不足を優先指摘する
- review_2: memory の内容は補助情報として扱い、最終判定は現行コードと実行結果で行う
- review_3: 仕様差分がある場合は関連 spec と plan の更新要否を明示する

## Prompt Messages

- save_notice: 要点をプロジェクトメモリに保存しました
- save_confirm: 保存候補があります。保存しますか？ Y/N
- recall_notice: 前回の関連セッション要点を参照しました
- recall_confirm: 関連履歴があります。今回参照しますか？ Y/N

## Priority Order

1. repo source of truth
2. explicit user instruction
3. satoshi-dev memory
4. project profile memory
5. session memory

## Operational Rules

- on_mis_save: forget を優先し、理由を guard event に記録する
- on_policy_conflict: Y/N 確認を必須にし、repo source of truth を優先する
- on_scope_collision: 自動モードを停止し、project scope の再確認を求める
