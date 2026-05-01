---
name: japanese-ux-patterns
routing_category: ui-ux
description: "日本ユーザー向けUXパターン：縦書き・ルビ・日本語フォント・年齢確認フロー・禁則処理・文字数制限"
disable-model-invocation: true
---

# Japanese UX Patterns

## 基本原則

- 日本語は横書きがデジタルの標準だが、縦書きが必要な場面（詩・書籍・証明書）がある
- 日本のユーザーは情報密度の高いUIに慣れている（空白を恐れない）
- 文化的文脈（礼儀・敬語・集団主義）がUXに影響する

## 縦書き・ルビ（振り仮名）

```css
/* 縦書き */
.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

/* ルビ（振り仮名） */
/* HTML: <ruby>漢字<rt>かんじ</rt></ruby> */
ruby rt {
  font-size: 0.5em;
  color: #666;
}
```

## 日本語フォント選定

| フォント | 特徴 | 推奨用途 |
|---------|------|---------|
| Noto Sans JP | Google・無料・読みやすい | 汎用Webアプリ |
| BIZ UDGothic | ユニバーサルデザイン | 行政・ビジネス |
| Hiragino | macOS標準・高品質 | Mac向けデザイン |
| Yu Gothic | Windows標準 | Windows重視 |

```css
body {
  font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
  font-feature-settings: "palt";  /* プロポーショナルメトリクス */
}
```

## 禁則処理（行末・行頭ルール）

```css
/* 自動禁則処理 */
p {
  line-break: strict;        /* 厳格な禁則処理 */
  word-break: break-all;     /* 長い英数字を折り返す */
  overflow-wrap: break-word;
}
```

禁則文字（行頭に置けない）: 、。！？）」』...  
禁則文字（行末に置けない）: （「『...

## 文字数制限の考慮

- 全角1文字 = 半角2文字として換算する
- Twitter/X: 全角は1文字で140文字制限
- バリデーション: `length` ではなく文字コードポイント数で制限

```javascript
// 全角・半角を考慮した文字カウント
function countChars(str) {
  let count = 0;
  for (const char of str) {
    count += char.charCodeAt(0) > 127 ? 1 : 0.5;
  }
  return Math.ceil(count);
}
```

## 年齢確認・本人確認フロー

- 年齢確認: 生年月日入力（年・月・日を別プルダウン）
- 和暦対応: 令和/平成/昭和の表記切り替えオプション
- 本人確認: マイナンバーカード / 運転免許証 / パスポート の選択式
- UX: 入力方法を明確に示す（見本画像を提供）

## 数字・通貨・日付の表記

```javascript
// 通貨（円）フォーマット
new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(1234567)
// → "¥1,234,567"

// 日付（和暦対応）
new Intl.DateTimeFormat('ja-JP-u-ca-japanese', { era: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
// → "令和7年1月15日"
```

## チェックリスト

- [ ] フォント設定の確認（Noto Sans JP等）
- [ ] 禁則処理の CSS 設定
- [ ] 全角半角混在のバリデーション
- [ ] 日付入力の和暦オプション
- [ ] エラーメッセージの丁寧語確認
