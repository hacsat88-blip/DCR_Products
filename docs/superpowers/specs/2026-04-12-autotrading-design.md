# 自動売買アプリ 設計ドキュメント

**作成日**: 2026-04-12  
**ステータス**: 承認済み  
**スコープ**: 楽天証券 MarketSpeed II RSS を使った AI 自動売買システム（新規）

---

## 1. 概要

楽天証券の MarketSpeed II RSS（Excel アドイン）をデータソース兼発注インフラとして使用し、Gemini が売買タイミングを判断する完全新規の自動売買アプリ。既存の投資ダッシュボード群とは独立した別プロジェクトとして構築する。

**前提条件:**
- ユーザーは楽天証券口座を保有済み
- MarketSpeed II の利用申請（無料）が完了していること
- 動作環境: Windows + Microsoft Excel（Office 2013/2016/2019）

---

## 2. アーキテクチャ（案B: Python ブリッジ）

```
[MarketSpeed II RSS（Excel）]
  ↓ 5秒ごとに株価 POST
[Python FastAPI サーバー :8000]
  ├─ Gemini API で売買判断（live only）
  ├─ リスクガード適用
  ↓ 発注指示をレスポンスで返却
[Excel VBA]
  └─ 現在の source drop は RSS 発注スタブを記録（実発注 wiring は後続）
[Python FastAPI サーバー :8000]
  ├─ deterministic backtest runner（LLM key 不要）
  ↓ WebSocket (/ws)
[Next.js ダッシュボード :3000]
  └─ リアルタイム表示（株価・AI思考ログ・P&L）
```

**サブプロジェクト分割:**

| # | サブプロジェクト | 主な技術 | 依存関係 |
|---|----------------|---------|---------|
| SP-1 | Python ブリッジサーバー | FastAPI, Gemini API | なし（最初に構築） |
| SP-2 | Excel VBA 層 | VBA, MSXML2.ServerXMLHTTP.6.0 | SP-1 が必要 |
| SP-3 | Next.js ダッシュボード | Next.js 14, WebSocket | SP-1 が必要 |

**開発順序:** SP-1 → SP-3（並行可）→ SP-2（実機接続）

**ディレクトリ配置（リポジトリルートからの相対パス）:**
```
Product/
├── autotrader/        # SP-1: Python ブリッジサーバー
├── autotrader-ui/     # SP-3: Next.js ダッシュボード
```

Excel ワークブックはリポジトリルートの `autotrader.xlsm` として配置する（Git 管理は任意）。Git では `Product/autotrader-suite/vba/` に text source を置き、workbook へ import する。

---

## 3. SP-1: Python ブリッジサーバー

### ディレクトリ構成

```
autotrader/
├── server/
│   ├── main.py                 # FastAPI エントリポイント
│   ├── routes/
│   │   ├── price_feed.py       # POST /api/price — VBA からの株価受信
│   │   ├── ws.py               # WS /ws — Next.js へリアルタイム配信
│   │   └── settings.py         # GET/PUT /api/settings — リスク設定
│   ├── engine/
│   │   ├── gemini_trader.py    # Gemini API 呼び出し・売買判断
│   │   ├── jquants_reference.py # J-Quants reference snapshot 取得
│   │   ├── risk_guard.py       # 上限金額・損切りルール適用
│   │   └── position.py         # ポジション管理（保有株・含み損益）。更新ごとに state.json へ書き出す
│   └── models.py               # Pydantic データモデル
├── state.json                  # ポジション状態の永続化（サーバー再起動対策）
├── requirements.txt
└── .env                        # GOOGLE_API_KEY, JQUANTS_API_KEY 等
```

### API エンドポイント

| メソッド | パス | 役割 |
|---------|------|------|
| POST | `/api/price` | VBA から株価データを受信し、AI 判断を返す |
| GET | `/api/settings` | 現在のリスク設定を返す |
| PUT | `/api/settings` | リスク設定を更新する |
| WS | `/ws` | Next.js へ全状態をリアルタイム配信 |

### 株価受信 → 判断フロー

```
POST /api/price
リクエスト:
{
  "code": "1234",
  "price": 2500,
  "volume": 12000,
  "bid": 2498,
  "ask": 2500,
  "news_halt": false,
  "news_note": null,
  "ohlc": [{"o":2490,"h":2510,"l":2485,"c":2500,"v":50000}, ...],  // 直近5本
  "timestamp": "2026-04-12T10:30:00"
}

処理:
1. risk_guard: 既存ポジション・上限金額・損切りラインを確認
2. trade_setup: 直近5本から intraday の値幅・出来高倍率・参照乖離を算出
3. gemini_trader: Gemini API へ判断を依頼
4. risk_guard: AI の判断を二重チェック（薄商い、参照乖離過大、板スプレッド過大、寄り付き直後、ニュース停止、日次損失超過、引け前新規停止なら hold へ上書き）
4. position: 発注後のポジション状態を更新

レスポンス:
{
  "action": "buy" | "sell" | "hold",
  "qty": 100,
  "order_type": "成行",
  "reason": "RSI が 28 まで低下。過売り圏からの反転シグナル。",
  "reference_status": "ok" | "missing" | "stale",
  "reference_price": 251.5 | null,
  "reference_source": "jquants_light" | "jquants_free" | null,
  "reference_as_of": "2026-04-11" | null,
  "reference_age_days": 1 | null,
  "reference_gap_pct": -0.596 | null,
  "warning_code": "reference_missing" | "reference_stale" | null,
  "warning_message": "J-Quants reference missing; execution onlyで継続" | null
}
```

### リスクガード仕様

```python
# risk_guard.py が適用するルール（優先順位順）
1. Python サーバー起動から 30 秒未満（ウォームアップ）→ "hold"
2. 市場時間外（09:00〜11:30, 12:30〜15:30 以外）→ "hold"
3. 引け前 `flat_before_close_minutes` 以内で保有あり → 強制 "sell"
4. 損切りライン超過 → 強制 "sell"（AI 判断より優先）
5. 日次実現損失が `max_daily_loss_yen` を超過 → 新規 "buy" を停止
6. `max_consecutive_losses` 連敗到達 or 損失後クールダウン中 → 新規 "buy" を停止
7. 直近5本の値幅が `min_five_bar_range_pct` 未満 → 新規 "buy" を停止
8. 直近バー出来高倍率が `min_last_bar_volume_ratio` 未満 → 新規 "buy" を停止
9. execution/reference 乖離が `max_reference_gap_pct` 超過 → 追いかけ "buy" を停止
10. 板スプレッドが `max_spread_bps` 超過 → 新規 "buy" を停止
11. 寄り付きから `skip_open_minutes` 分以内 → 新規 "buy" を停止
12. `news_halt = true` → 新規 "buy" を停止
13. 1発注の金額上限超過（price × qty > limit）→ qty を上限以内に縮小 or "hold"
```

### リスク設定のデフォルト値

| 設定項目 | デフォルト | 説明 |
|---------|-----------|------|
| `limit_per_order` | 100,000円 | 1回の発注上限金額 |
| `stop_loss_pct` | 3.0% | 損切りライン（平均取得単価からの下落率） |
| `max_qty_per_order` | 100株 | 1回の最大発注数量 |
| `poll_interval_sec` | 5 | VBA からの送信間隔（秒） |
| `max_daily_loss_yen` | 15,000円 | 当日実現損失がこの金額を超えたら新規建て停止 |
| `max_consecutive_losses` | 2 | 連敗回数の上限 |
| `cooldown_minutes_after_loss` | 15 | 損失クローズ後に新規建てを止める時間 |
| `min_five_bar_range_pct` | 0.8% | 直近5本の値幅がこの閾値未満なら薄商いとみなす |
| `min_last_bar_volume_ratio` | 1.2 | 直近バー出来高 / 5本平均出来高 の下限 |
| `max_reference_gap_pct` | 4.0% | execution と reference の許容乖離上限 |
| `flat_before_close_minutes` | 10 | 引け前の強制手仕舞い開始時刻 |
| `max_spread_bps` | 20.0 | 板スプレッドの許容上限 |
| `skip_open_minutes` | 5 | 寄り付き直後の新規停止時間 |

### WebSocket ペイロード（毎受信後に配信）

```json
{
  "type": "state_update",
  "ts": "2026-04-12T10:30:05",
  "price": { "code": "1234", "current": 2500, "volume": 12000, "feed_role": "execution", "feed_source": "rakuten_rss" },
  "reference_price": { "code": "1234", "current": 2515, "volume": 11800, "feed_role": "reference", "feed_source": "jquants_light" },
  "position": { "qty": 100, "avg_cost": 2480, "pnl": 2000, "pnl_pct": 0.81 },
  "last_action": { "action": "buy", "qty": 100, "reason": "RSI過売り圏からの反転", "at": "10:30:05", "feed_role": "execution", "feed_source": "rakuten_rss" },
  "risk": { "limit_per_order": 100000, "stop_loss_pct": 3.0, "max_spread_bps": 20.0, "skip_open_minutes": 5 },
  "risk_runtime": { "daily_order_count": 1, "daily_realized_pnl": -1200, "consecutive_loss_count": 1, "cooldown_remaining_sec": 180, "entry_blocked": true, "entry_block_reason": "損失後クールダウン中" }
}
```

### Backtest Runner

- `python -m server.backtest_runner bars.csv` で deterministic な検証が可能
- backtest は `RuleBasedTrader + RiskGuard` を使い、`GOOGLE_API_KEY` を必要としない
- live 判断だけが `GOOGLE_API_KEY` 必須

---

## 4. SP-2: Excel VBA 層

### ファイル構成

```
autotrader.xlsm
├── generated by: Product/autotrader-suite/vba/new-autotrader-workbook.ps1
├── VBA: modConfig         # URL・タイムアウト・シート定数
├── VBA: modOHLC           # 分足 OHLC バー管理
├── VBA: modHTTP           # POST /api/price と応答解析
├── VBA: modOrder          # RSS 発注スタブ
├── VBA: modTimer          # OnTime メインループ
├── Sheet: Control         # URL、稼働状態、reference warning、paper ops 表示
├── Sheet: Market          # RSS 現在値・出来高・現在日付・現在値時刻・best bid/ask
├── Sheet: OHLC_Data       # 確定バー保存
└── Sheet: Log             # action と reference advisory の履歴
```

binary workbook は environment-specific な local artifact とし、Git の正本は `Product/autotrader-suite/vba/src` の text source と `new-autotrader-workbook.ps1` に置く。

### 動作フロー

```
1. [起動] `new-autotrader-workbook.ps1` で workbook scaffold を生成してブックを開く。`Workbook_Open` は operator surface を初期化し、`Control!B12=TRUE` のときだけ timer を auto-start する。`FALSE` のときは `Alt+F8` または Control シートの START button から開始する。

2. [価格取得] RSS 関数で現在値・出来高・bid/ask を取得。OHLC は VBA 側で最大20本分を保持しつつ、API には直近5本を送る
   （起動直後は蓄積本数が少ないため、Python サーバーのウォームアップ期間中は発注しない）
  例: =RssMarket("1234.T","現在値")

  hidden Excel COM では DDE 評価が不安定なことがあるため、generator の既定値は manual smoke 用の安全 seed とし、live RSS formula は `-UseRssFormulas` を付けたときだけ入れる。

3. [Python へ POST] /api/price へ JSON 送信（MSXML2.ServerXMLHTTP.6.0 使用）

4. [レスポンス解析]
  action = "buy"  → 現在の source drop では BUY_STUB を記録（実発注は未接続）
  action = "sell" → 現在の source drop では SELL_STUB を記録（実発注は未接続）
   action = "hold" → 何もしない
  reference_status / reference_price / warning_message は表示とログにのみ使う
  request が 200 のときだけ Control シートの Last Tick At / Last Action を更新し、client error または非 200 のときは Last Error を更新する

5. [繰り返し] タイマーで 2〜4 をループ
```

### 安全装置（VBA 側）

- Python サーバーへの接続タイムアウト（15秒）→ 応答なしなら発注しない
- `action = "hold"` のときは一切発注しない
- `reference_status = "missing" | "stale"` は soft warning として表示・記録し、発注停止条件にはしない
- Excel ブックを閉じるとタイマー停止 → 自動売買も即座に停止
- 発注済み記録をシートに書き出し（ログ）

---

## 5. SP-3: Next.js ダッシュボード

### ディレクトリ構成

```
autotrader-ui/
├── app/
│   ├── page.tsx                # メインダッシュボード（1ページ構成）
│   └── api/settings/route.ts  # リスク設定の保存（Python へプロキシ）
├── components/
│   ├── PricePanel.tsx          # リアルタイム株価・簡易チャート
│   ├── AiLogPanel.tsx          # AI の思考ログ（時系列）
│   ├── PositionPanel.tsx       # 保有ポジション・含み損益
│   ├── OrderHistory.tsx        # 発注履歴テーブル
│   └── RiskSettings.tsx        # 上限金額・損切りライン設定 UI
└── hooks/
    └── useTraderSocket.ts      # WebSocket 接続・状態管理
```

### UI レイアウト（1ページ）

```
┌─────────────────────────────────────────┐
│  自動売買ダッシュボード      [停止中/稼働中]  │
├────────────┬────────────────────────────┤
│ 現在値     │ AI 思考ログ                  │
│ ポジション  │ （reason の時系列表示）        │
│ 含み損益   │                             │
├────────────┴────────────────────────────┤
│ 発注履歴                                 │
├─────────────────────────────────────────┤
│ リスク設定（上限金額 / 損切りライン）         │
└─────────────────────────────────────────┘
```

---

## 6. エラーハンドリング

| 障害シナリオ | 対処 |
|------------|------|
| Python サーバーが落ちている | VBA: タイムアウト検知 → 発注スキップ |
| Gemini API エラー | risk_guard が hold を返す（フォールバック） |
| RSS データ取得失敗 | VBA: 前回値を使わず、そのサイクルをスキップ |
| WebSocket 切断 | Next.js: 5秒後に自動再接続 |
| 市場時間外 | risk_guard が hold を強制 |
| reference snapshot missing / stale | warning を表示・記録するが execution action は維持 |

---

## 7. 技術スタック

| 層 | 技術 |
|---|------|
| AI エンジン | Python 3.11+, FastAPI, `google-genai` SDK |
| 株価・発注 | Excel VBA, MarketSpeed II RSS |
| フロントエンド | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| 通信 | REST（VBA↔Python）, WebSocket（Python↔Next.js） |

---

## 8. 非スコープ（このバージョンでは作らないもの）

- 複数銘柄の同時監視（まず1銘柄で動作確認）
- 信用取引・先物対応
- クラウドデプロイ（ローカル動作のみ）
- バックテスト機能
- 認証・ユーザー管理

