# 東証プライム短期売買アプリ — 設計仕様

**Date**: 2026-05-12  
**Status**: Approved — proceeding to implementation  
**Approach**: SP-1延長 + TechnicalFilter + RiskGuard強化（A+C型）

---

## 1. アーキテクチャ

```
Excel (MarketSpeed II RSS)
  ├─ 5秒ごとに価格・気配値を取得
  ├─ VBA: 発注 + パスワード自動入力 (SP-2)
  └─ POST /api/price → FastAPI

Python FastAPI @ port 8000 (SP-1 既存ベース)
  ├─ CapitalRouter   — 残高→ティア判定
  ├─ TechnicalFilter — エントリー前条件フィルタ
  ├─ AITrader        — Claude claude-sonnet-4-6 で買い/売り/待機を判断
  ├─ RiskGuard       — 1日損失上限・損切り・時間切れ
  ├─ PositionManager — state.json 永続化
  └─ WebSocket /ws → Next.js @ port 3000 (SP-3)
```

---

## 2. CapitalRouter

| 投資余力 | ティア | 対象株 | 最大1注文 |
|---------|------|------|---------|
| ～50万円 | SMALL | 時価総額300億以下・割安株（PER≤15目安） | 10万円 |
| 50〜100万円 | MID | 時価総額1000億以下の中型株 | 20万円 |
| 100万円〜 | LARGE | 出来高上位の東証プライム大型株 | 30万円 |

---

## 3. TechnicalFilter（AI呼び出し前ゲート）

以下を**全て**満たす場合のみAIに判断依頼。それ以外は即「待機」。

| 条件 | SMALL/MID | LARGE |
|------|-----------|-------|
| 出来高 vs 5日平均 | ≥ 1.5倍 | ≥ 1.3倍 |
| RSI (14) | 35〜55 | 40〜60 |
| 前日比 | -3%〜+5% | -2%〜+4% |
| 取引時間帯 | 9:15〜11:20 / 12:30〜14:50 | 同左 |

---

## 4. RiskGuard ルール（負けない仕様の核心）

```python
RISK_RULES = {
    "max_daily_loss":      -3_000,  # 1日-3000円で全ポジ強制決済・取引停止
    "daily_profit_target":  5_000,  # +5000円達成で本日取引終了
    "max_loss_per_trade":  -2_000,  # 1トレード-2000円で即損切り
    "min_rr_ratio":          1.5,   # リワード/リスク比 1.5以上のトレードのみ
    "max_positions":            2,  # 同時保有2銘柄まで
    "max_hold_minutes":        60,  # 60分超保有で時間切れ成行売り
    "no_new_entry_after":  "14:50", # 14:50以降は新規エントリー禁止
}
```

---

## 5. AITrader プロンプト

```
あなたは東証プライムの短期デイトレーダーです。
「負けない」を最優先とし、不確実な場面は必ず「待機」を選んでください。

- 買い: テクニカルフィルター通過 + 5分足上昇トレンド + 出来高増加
- 売り: 目標利益到達 or 損切りライン到達 or 天井圏シグナル
- 待機: 上記以外

必ずJSON形式で回答:
{"action": "buy"|"sell"|"hold", "reason": "<30字以内>", "confidence": 0.0-1.0}
confidenceが0.7未満の場合は必ずholdにしてください。
```

---

## 6. VBA パスワード自動入力

- パスワードは `VeryHidden` シート「Secure」のB1に XOR難読化して保存
- 発注時に復号 → `AppActivate` + `SendKeys` でウィンドウに自動入力
- `.xlsm` ファイルはVBAプロジェクトをパスワード保護

代替案: 楽天証券の「取引暗証番号省略設定」を有効化（最もシンプル）

---

## 7. Next.js ダッシュボード（SP-3）

- 残高・ティア・本日P/L のヘッダー
- ポジション一覧（銘柄・取得価格・含み損益）
- AI判断ログ（WebSocketリアルタイム）
- リスクメーター（本日損失 vs 上限の進捗バー）
- 緊急停止ボタン

---

## 8. 実装スプリント計画

| SP | 内容 | 優先度 |
|----|------|------|
| SP-1 | Python FastAPI ブリッジサーバー | 完了済み（別リポジトリ） |
| SP-2a | CapitalRouter + TechnicalFilter + RiskGuard強化 | 最優先 |
| SP-2b | Excel VBA 発注モジュール + パスワード自動入力 | 最優先 |
| SP-3 | Next.js ダッシュボード | 第2フェーズ |

---

## 9. 追加提案

1. **毎朝ウォッチリスト自動生成** — 前日出来高上位30銘柄を9:00に自動取得
2. **シミュレーションモード** — 最初の2週間は発注を止めてAI判断精度を確認
3. **日次レポート** — Google スプレッドシートに勝率・平均利益・最大DDを蓄積
4. **取引暗証番号省略設定** — 楽天証券の設定でパスワード入力を省略（最優先で確認）
