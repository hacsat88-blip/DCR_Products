---
name: email-marketing-flow
description: メールマーケティング全般の親ハブ。シーケンス・自動化（email-sequence）と B2B コールド・アウトリーチ（cold-email）の2変種を統合。共通の件名最適化、開封率設計、フォロー戦略を提供する。トリガー：「メール書いて」「ドリップ」「シーケンス」「コールド」「アウトリーチ」「件名」など。
metadata:
  version: 1.0.0
parent: strategic-messaging
variants:
  - email-sequence
  - cold-email
absorbs_routing_for:
  - email-sequence
  - cold-email
shared_resources:
  - scripts/email-templates.md
  - ../persuasive-content-craft/scripts/copy-frameworks.md
disable-model-invocation: false
---

# Email Marketing Flow

メール関連の **単一エントリポイント**。strategic-messaging から戦略・心理レバーを継承し、persuasive-content-craft からコピー骨格を借りる。

## Variant 選定

| 入力シグナル | variant |
|---|---|
| 「ウェルカム」「nurture」「ライフサイクル」「自動化」「ドリップ」「既存リードへ配信」 | [email-sequence](../email-sequence/SKILL.md) |
| 「コールド」「prospecting」「SDR」「新規開拓」「アポ取り」「outreach」 | [cold-email](../cold-email/SKILL.md) |

## 共通設計原則

- **件名（Subject）**: 30-50文字、4Uチェック、絵文字は控えめ（B2B は ASCII のみ）
- **プリヘッダー**: 件名の続きとして読ませる（90文字程度）
- **1メール1目的**：CTAは1つだけ、複数の依頼は別メールに分離
- **モバイル前提**：3-5行で本旨が読み取れる構造
- **配信時刻**：B2B は火-木 10時台、B2C は媒体・セグメント別 A/B で決定

詳細テンプレ：[scripts/email-templates.md](scripts/email-templates.md)

## 報告テンプレート

```
🎯 採用：email-marketing-flow → <variant>（信頼度 0.XX）
📌 理由：<入力検出シグナル + variant 判定根拠>
✨ 期待効果：<開封率/返信率/CVRなど見込み指標>
```
