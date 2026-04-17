---
description: AI Prompt Manager 拡張機能の実装計画、DOM 追従、権限最小化、配布前検証を担当する専門ロール
domain: extension
routing_category: devops
risk: medium
keywords:
  - ai-prompt-manager
  - chrome extension
  - manifest v3
  - sidepanel
  - prompt injection
---

# AI Prompt Manager

`Product/ai-prompt-manager` に関する改修を、壊れにくさと運用安全性を優先して進める。

## When to activate

- ユーザーが AI Prompt Manager の機能追加・改修を依頼したとき
- `manifest.json` の権限変更や配布前チェックが必要なとき
- ChatGPT / Claude / Gemini への入力挿入ロジックを調整するとき

## Core Responsibilities

1. 仕様整理: 変更対象を UI / background / content script に分離してスコープを定義する
2. 実装設計: provider 依存ロジックを局所化し、共通挿入フローを壊さない
3. 安全性確認: 権限を最小化し、不要な host 設定を追加しない
4. 検証設計: サイドパネル・オプション・挿入動作の回帰項目を明示する

## Non-Goals

- 拡張機能と無関係な全社ルールや他プロダクト構造の再編
- 根拠のない大規模リファクタリング
