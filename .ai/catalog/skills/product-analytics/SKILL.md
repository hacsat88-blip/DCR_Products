---
name: product-analytics
routing_category: growth
deprecated: true
successor: growth-ops
deprecation_reason: "Folded into growth-ops Measurement and Monetization lane for OpenAI Skills baseline slimming."
description: "プロダクトアナリティクス：NSM定義・AARRR・コホート分析・A/Bテスト設計・Mixpanel/Amplitude実装"
disable-model-invocation: true
---

# Product Analytics

## 基本原則

- North Star Metric（NSM）を1つ定め、全施策をそれに結びつける
- データは意思決定のためにある（収集が目的にならない）
- A/Bテストなしの「改善」は単なる変更

## North Star Metric（NSM）定義

- 定義: ユーザーにとっての核心的な価値を最もよく表す1つの指標
- 例: Slack → 「DAUが送るメッセージ数」, Spotify → 「月間リスニング時間」
- NSMの条件: ①ユーザー価値を反映 ②先行指標 ③チーム全員が理解できる

## AARRR ファネル分析

| ステージ | 指標例 | 改善施策 |
|---------|--------|---------|
| Acquisition | CAC・チャネル別獲得数 | SEO・広告最適化 |
| Activation | 初回コアアクション完了率 | オンボーディング改善 |
| Retention | Day1/7/30 リテンション | エンゲージメント機能 |
| Revenue | ARPU・LTV | 価格最適化・アップセル |
| Referral | NPS・招待数 | リファラルプログラム |

## コホート分析

- コホート定義: 同じ期間に登録したユーザーグループ
- リテンション曲線: Day0=100% として各日の残存率を可視化
- ベンチマーク: Day30リテンション > 20% が継続的成長の目安
- セグメント比較: 流入チャネル別・プラン別・国別に分解

## A/B テスト統計設計

```
必要サンプルサイズ計算:
- 検出力 (Power): 80%（β=0.2）
- 有意水準: 5%（α=0.05）
- 最小検出効果 (MDE): 2%改善を検出したい

→ 計算ツール: Evan Miller's Sample Size Calculator
```

- テスト期間: 最低1週間（曜日効果を含む）
- p値 < 0.05 かつ実用的有意差がある場合のみ採用
- SRM（Sample Ratio Mismatch）チェックを必ず実施

## Mixpanel / Amplitude 実装パターン

```javascript
// イベントトラッキングの命名規則
// [Object] [Action] 形式
analytics.track('Button Clicked', {
  button_name: 'upgrade_cta',
  page: 'pricing',
  plan: 'free'
})

// ユーザー属性の設定
analytics.identify(userId, {
  plan: 'pro',
  signup_date: '2024-01-15',
  country: 'JP'
})
```

## 分析チェックリスト

- [ ] NSMをダッシュボードのトップに表示
- [ ] ファネル各ステージのドロップオフ率を週次確認
- [ ] コホートリテンション曲線を月次レビュー
- [ ] A/Bテスト結果の統計的有意性確認
- [ ] イベント命名規則のドキュメント整備
