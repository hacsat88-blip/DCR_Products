# Supermemory Project Policy Template

## Project

- project_id: {project_id}
- owner: {owner}
- scope: project-fixed

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

- policy_1: {implementation_policy_1}
- policy_2: {implementation_policy_2}
- policy_3: {implementation_policy_3}

## Code Review Policy (Project Common)

- review_1: {review_policy_1}
- review_2: {review_policy_2}
- review_3: {review_policy_3}

## Prompt Messages

- save_notice: 要点をプロジェクトメモリに保存しました
- save_confirm: 保存候補があります。保存しますか？ Y/N
- recall_notice: 前回の関連セッション要点を参照しました
- recall_confirm: 関連履歴があります。今回参照しますか？ Y/N

## Priority Order

1. repo source of truth
2. explicit user instruction
3. project profile memory
4. session memory

## Operational Rules

- on_mis_save: forget immediately and log reason
- on_policy_conflict: require Y/N and prefer repo source of truth
- on_scope_collision: stop auto mode and request project scope confirmation
