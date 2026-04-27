# Email Templates 共通骨格

`email-sequence` と `cold-email` 両方が参照する共通テンプレート。

## 件名パターン（subject lines）

### 質問型
- "{name}さん、{specific_pain}について困っていませんか？"
- "{competitor} を使ってみてどうですか？"

### 数字型
- "{N}つの{benefit}を{timeframe}で達成する方法"
- "{N}%の{audience}が見落としている{topic}"

### 個人化型
- "{company_name}の{recent_event}を見て"
- "{linkedin_post_topic}の話、続きをお聞きしたく"

### 直接価値型
- "{benefit}のための{deliverable}を作りました"
- "30分で{outcome}できる方法"

## 本文テンプレ（body）

### コールドメール（cold-email variant）

```
件名：[個人化フック + 価値]

{name}さん、

{個人化トリガー（最近のニュース、LinkedIn 投稿、共通点など）}

{相手にとっての具体的な価値1行}。{社名}が
{類似企業1-2社}と同様に {benefit} を達成された事例があります。

15分でブリーフィングできれば、{specific_outcome} の道筋を共有します。
今週木曜か金曜の午後はいかがでしょうか？

{name}
{role}, {company}
```

### シーケンス（email-sequence variant：welcome）

```
件名：ようこそ、{product}

{name}さん、{product} へのサインアップありがとうございます！

最初の {time-to-value} を達成いただくため、3ステップだけご案内します：

1. {step1 with link}
2. {step2 with link}
3. {step3 with link}

困った点があれば返信ください。返信は{founder_name}が直接読んでいます。

{founder_name}
{product}
```

### 再エンゲージメント（re-engagement）

```
件名：{name}さん、{product} はまだお役に立てそうですか？

{時間経過 + 過去アクション参照}。

{product} 側で {recent_improvement} が改善されたので、
お試しいただけたらと思いお声がけしました。

このまま不要であれば[配信停止リンク]で停止できます。
1分でも興味を持ってもらえたら[CTA]してください。

{name}
```

## フォローアップ間隔（cold outreach）

| 回 | 間隔 | 内容 |
|---|---|---|
| 1 | 0日 | 初回（個人化 + 価値提案） |
| 2 | +3日 | 視点を変えた angle（質問型に） |
| 3 | +5日 | 短い「Bumpメール」（"ご検討状況いかがですか？"） |
| 4 | +7日 | 別ベネフィット軸の再アプローチ |
| 5 | +14日 | break-up メール（"今後の連絡は不要であればお知らせください"） |

## メトリクス目標（B2B 標準）

| 指標 | コールド | シーケンス（既存リード） |
|---|---|---|
| 開封率 | 30-50% | 25-40% |
| 返信率 | 5-15% | N/A |
| CTR | 2-5% | 3-8% |
| 配信解除率 | <0.3% | <0.5% |
| ミーティング設定率（cold） | 1-3% | N/A |

## チェックリスト

1. 件名が30-50文字以内か
2. 本文が3-5段落（モバイル1スクロール）に収まっているか
3. CTAが1つだけか
4. 個人化要素が「会社・役職・最近のアクション」のいずれかを含むか
5. シグネチャが信頼性を伝えるか（役職・会社・LinkedIn）
6. CAN-SPAM / GDPR 準拠（unsubscribe + 物理住所）か
7. プレーンテキスト版もあるか（HTML メールの場合）
