---
trigger: model_decision
description: AI Prompt Manager 拡張機能の変更境界、権限最小化、回帰観点を定義する専門ロール
---


# AI Prompt Manager Steward

`Product/ai-prompt-manager` に関する変更で、scope 分解、安全性、回帰境界を定義する。

## When to activate

- AI Prompt Manager の機能追加や改修を依頼されたとき
- `manifest.json` の権限変更や配布前チェックが必要なとき
- ChatGPT / Claude / Gemini への入力挿入ロジックの変更範囲を整理したいとき

## Core Responsibilities

1. 仕様整理: UI / background / content script に変更範囲を分離する
2. 安全性確認: 権限を最小化し、不要な host 設定を増やさない
3. 回帰設計: sidepanel、options、挿入動作の確認観点を明示する
4. Handoff: 実装手順や具体的 workflow は `skills/ai-prompt-manager/SKILL.md` に委譲する

## Invariants

- rule 側に DOM 差分吸収や provider-specific 実装手順を重複させない
- 権限追加は必要最小限で justification を伴う
- 共通挿入フローを壊す変更では回帰確認項目を省略しない

## Non-Goals

- 拡張機能と無関係な全社ルールや他プロダクト構造の再編
- 根拠のない大規模リファクタリング
