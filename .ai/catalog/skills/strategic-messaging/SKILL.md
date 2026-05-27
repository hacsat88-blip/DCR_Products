---
name: strategic-messaging
routing_category: growth
deprecated: true
successor: growth-ops
deprecation_reason: "Folded into growth-ops Messaging lane for OpenAI Skills baseline slimming."
description: コンテンツ戦略・トピッククラスタ設計と、行動心理学・認知バイアス・購買心理を統合した「メッセージ設計の基盤層」。コピーライティング・メールシーケンス・広告コピー・LPコピー・ソーシャル投稿のすべてが参照する上位スキル。「何を伝えるか／どう伝えるか／なぜ刺さるか」の3層を統一して扱う。トリガー：「メッセージ戦略」「ポジショニング」「コア訴求」「なぜ買うのか」「説得の構造」「コンテンツ戦略の土台」など。
metadata:
  version: 1.0.0
absorbs:
  - content-strategy
  - marketing-psychology
referenced_by:
  - copywriting
  - copy-editing
  - ad-creative
  - email-sequence
  - cold-email
  - social-content
disable-model-invocation: false
---

# Strategic Messaging（コンテンツ基盤層）

コンテンツ戦略と行動心理学の **統合的な基盤** を提供する。個別のコピー作成スキル（copywriting / email-sequence / ad-creative / social-content / cold-email / copy-editing）は本スキルが定義するメッセージ骨格を **必ず参照** する。

## 3層モデル

### Layer 1: 戦略（What）
- ターゲットセグメント定義（JTBD / ペルソナ / 課題シーン）
- ポジショニングと差別化軸
- トピッククラスタ（pillar / cluster / supporting content）
- コンテンツ目的別マッピング（認知 / 検討 / 決定 / 継続）
- 詳細手順は旧 [content-strategy](../content-strategy/SKILL.md) を参照

### Layer 2: 心理（Why）
- 購買意思決定の認知バイアス（社会的証明・希少性・損失回避・アンカリング・互恵性）
- メンタルモデル（Jobs-to-be-Done / Progress-Making / Anxiety→Motivation）
- 価格心理学（reference price / tier framing / decoy effect）
- 詳細手順は旧 [marketing-psychology](../marketing-psychology/SKILL.md) を参照

### Layer 3: 表現（How）
- メッセージ階層（メインクレーム / サポートクレーム / 証拠）
- トーン＆ボイス（ブランド一貫性、TPO別変調）
- 構造（PAS / AIDA / 4U / Before-After-Bridge）
- 各実装スキルへのハンドオフ：copywriting / ad-creative / email-sequence / social-content / cold-email

## 利用フロー

```
ユーザー入力（例: "新機能のメッセージを作りたい"）
      ↓
[Strategic Messaging]
  1. Layer 1で戦略確定（誰に・何を・なぜ今）
  2. Layer 2で心理レバー選定（どのバイアスを活かすか）
  3. Layer 3でメッセージ骨格を生成
      ↓
実装スキルにハンドオフ
  - LP用コピー → copywriting
  - メール → email-sequence / cold-email
  - 広告 → ad-creative
  - SNS → social-content
  - 既存改善 → copy-editing
```

## 報告テンプレート

```
🎯 採用：strategic-messaging（信頼度 0.XX）→ ハンドオフ先：<実装スキル>
📌 理由：メッセージ骨格を先に確定する必要があるため、心理レバー＋戦略層を統合
✨ 期待効果：一貫したコア訴求 + 心理学的説得力 + 実装スキル群への統一インプット
```

## Migration Note

旧 `content-strategy` と `marketing-psychology` は variant として参照可能のまま維持（直接呼び出し可）。ただしルーティング層は本スキルを優先し、両者の知見を統合的に利用する経路を推奨する。
