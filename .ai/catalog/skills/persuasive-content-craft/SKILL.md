---
name: persuasive-content-craft
routing_category: growth
description: 説得型コピー全般の親ハブ。新規ライティング（copywriting）・既存改善（copy-editing）・広告コピー（ad-creative）の3変種を統合し、共通の説得構造（PAS / AIDA / 4U / Before-After-Bridge）と心理レバー、共有テンプレートを提供する。トリガー：「コピーを書いて／直して」「広告コピー」「LPコピー」「ヘッドライン」「CTA」など。
metadata:
  version: 1.0.0
parent: strategic-messaging
variants:
  - copywriting
  - copy-editing
  - ad-creative
absorbs_routing_for:
  - copywriting
  - copy-editing
  - ad-creative
shared_resources:
  - scripts/copy-frameworks.md
disable-model-invocation: false
---

# Persuasive Content Craft

説得型コピーの **単一エントリポイント**。strategic-messaging 基盤層から戦略・心理レバーを継承し、3つの実装 variant を束ねる。

## Variant 選定

| 入力シグナル | variant |
|---|---|
| 「コピーを書いて」「LP用」「ヘッドライン作って」「from scratch」 | [copywriting](../copywriting/SKILL.md) |
| 「このコピー直して」「edit」「review」「polish」 | [copy-editing](../copy-editing/SKILL.md) |
| 「広告コピー」「RSA」「複数バリエーション」「creative testing」 | [ad-creative](../ad-creative/SKILL.md) |

## 共通構造

すべての variant が以下のフレームを参照：
- **PAS**: Problem → Agitation → Solution
- **AIDA**: Attention → Interest → Desire → Action
- **4U**: Useful / Urgent / Unique / Ultra-specific
- **BAB**: Before → After → Bridge

詳細は [scripts/copy-frameworks.md](scripts/copy-frameworks.md) 参照。

## 報告テンプレート

```
🎯 採用：persuasive-content-craft → <variant>（信頼度 0.XX）
📌 理由：<入力検出フレーム + variant 判定根拠>
✨ 期待効果：<想定効果（CTR上昇 / CVR / engagement 改善等）>
```
