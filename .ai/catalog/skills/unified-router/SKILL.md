---
name: unified-router
description: Unified routing dispatcher for DCR. Classifies intent/domain/risk/phase, selects the best rule/skill/agent (router decision tree Step 0-6), and reports via 3-line template. Replaces skill-router; actual execution handled by pied-piper agent.
routing_category: meta
keywords:
  - routing
  - router
  - dispatcher
  - skill-selection
  - auto-select
  - orchestration
targets:
  - vscode
  - cursor
  - claude
  - codex
---

# unified-router

> **このスキルは参照エントリーポイントです。**
> 実際のルーティング実行は **[pied-piper](./../agents-source/pied-piper.md)** agent が担います。
> ロジック定義は **[.ai/module/unified-router.md](../../../module/unified-router.md)** を参照してください。

## 役割

`unified-router` は旧 `skill-router` を置き換えるルーティング基盤の統合窓口です。

- **入力分類**: intent / domain / risk / phase の4軸でタスクを分類
- **アセット選定**: 決定木（Step 0–6）で Rule / Skill / Agent を最大2件選定
- **信頼度判定**: confidence > 0.8 → 自動実行、< 0.8 → 候補提示

## 決定木（概要）

| ステップ | 基準 | 優先度 |
|---|---|---|
| Step 0 | deprecated alias 解決（successor へ無音置換） | 最高 |
| Step 1 | ユーザー明示指定（`/name`, `use X`） | 高 |
| Step 2 | `routing_category` 完全一致 | ↑ |
| Step 3 | `keywords` 重み付き一致数 | ↓ |
| Step 4 | `domain` 一致 | ↓ |
| Step 5 | `risk` 整合性 | ↓ |
| Step 6 | `phase` 整合性 | 低 |

## 実行フロー

```
ユーザー入力
  → pied-piper (Unified Coordinator)
      → unified-router モジュール（決定木適用）
          → 採用アセット選定
          → 3行報告（🎯 / 📌 / ✨）
          → 実行
          → Write-RouterDecision でテレメトリ記録
```

## 詳細

- 決定木・ローカルオーバーライド優先順位: [unified-router.md](../../../module/unified-router.md)
- 統一Coordinator 実装: [pied-piper.md](./../agents-source/pied-piper.md)
- ゲート連鎖: [trigger-p/q/sh](../../../kernel/gates/)
