---
name: conversion-optimization-hub
routing_category: growth
deprecated: true
successor: growth-ops
deprecation_reason: "Folded into growth-ops CRO lane for OpenAI Skills baseline slimming."
description: Conversion Rate Optimization (CRO) の親ハブ。ユーザーが「CV改善」「コンバージョン」「離脱が多い」「もっと申込を増やしたい」等を訴えた際の単一エントリポイント。文脈を判定して適切な variant スキル（page / popup / form / signup-flow / onboarding / paywall-upgrade）に分岐させる。共通の CRO 原則（価値提案・摩擦軽減・心理的ハードル・社会的証明・緊急性）を一元管理し、variant が参照する基盤層となる。
metadata:
  version: 1.0.0
variants:
  - page-cro
  - popup-cro
  - form-cro
  - signup-flow-cro
  - onboarding-cro
  - paywall-upgrade-cro
absorbs_routing_for:
  - page-cro
  - popup-cro
  - form-cro
  - signup-flow-cro
  - onboarding-cro
  - paywall-upgrade-cro
disable-model-invocation: false
---

# Conversion Optimization Hub

CRO に関するすべての依頼の **単一エントリポイント**。`skill-router` / 統一Coordinator はまずこのスキルを選定し、その内部で variant に分岐する。

## Variant 選定ロジック

ユーザー入力を以下の判定木で分類：

| 入力シグナル | 選定 variant |
|---|---|
| 「LP」「ホームページ」「料金ページ」「機能ページ」「ブログ記事」のCV改善 | [page-cro](../page-cro/SKILL.md) |
| 「ポップアップ」「モーダル」「離脱防止」「メアド取得」 | [popup-cro](../popup-cro/SKILL.md) |
| 「フォーム」「問い合わせ」「申込フォーム」（サインアップ以外） | [form-cro](../form-cro/SKILL.md) |
| 「サインアップ」「会員登録」「アカウント作成」 | [signup-flow-cro](../signup-flow-cro/SKILL.md) |
| 「オンボーディング」「初回利用」「アクティベーション」「初日リテンション」 | [onboarding-cro](../onboarding-cro/SKILL.md) |
| 「課金」「アップグレード」「ペイウォール」「フリーミアム→有料」 | [paywall-upgrade-cro](../paywall-upgrade-cro/SKILL.md) |
| 不明・複合 | ユーザーに対象を確認、または page-cro でジェネリック分析開始 |

## 共通CRO原則（全 variant が継承）

1. **Value Proposition Clarity**：3秒で伝わる価値提案
2. **Friction Reduction**：必要最小ステップ数、入力項目数の最適化
3. **Psychological Levers**：社会的証明（レビュー・利用者数）、希少性、損失回避
4. **Trust Signals**：セキュリティ表示、返金保証、企業ロゴ、メディア掲載
5. **CTA Discipline**：1ページ1主要CTA、行動動詞、対比カラー、視認できる位置
6. **Mobile-First**：モバイル比率優先、タップ領域 44px+、ファーストビュー最適化

## 報告テンプレート（呼び出し時に必ず先に出力）

```
🎯 採用：conversion-optimization-hub → <variant>（信頼度 0.XX）
📌 理由：<入力から検出した CRO ターゲット領域 + variant 判定根拠>
✨ 期待効果：<想定 lift % + 改善対象メトリクス（CVR/離脱率/AOV等）>
```

## 実行フロー

1. ユーザー入力から variant を判定（上記表）
2. variant SKILL.md の手順を実行
3. 共通CRO原則に基づくチェックリストで補強
4. 提案を「優先度高/中/低」で整理して提示

## Migration Note

旧来の個別 CRO スキル（page-cro / popup-cro / form-cro / signup-flow-cro / onboarding-cro / paywall-upgrade-cro）は **variant として維持** され、ユーザーが直接呼び出す（`/page-cro` 等）ことも可能。ただしルーティング層（router）は本ハブを優先的に提案し、variant は内部呼び出しに集約する。
