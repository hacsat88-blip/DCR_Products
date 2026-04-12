# 自動売買アプリ 設計ドキュメント

**作成日**: 2026-04-12  
**ステータス**: 承認済み  
**スコープ**: 楽天証券 MarketSpeed II RSS を使った AI 自動売買システム（新規）

---

## 1. 概要

楽天証券の MarketSpeed II RSS（Excel アドイン）をデータソース兼発注インフラとして使用し、Gemini が売買タイミングを判断する完全新規の自動売買アプリ。既存の stock_monitor_app_next とは独立した別プロジェクトとして構築する。

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
  ├─ Gemini API で売買判断
  ├─ リスクガード適用
  ↓ 発注指示をレスポンスで返却
[Excel VBA]
  └─ 現在の source drop は RSS 発注スタブを記録（実発注 wiring は後続）
[Python FastAPI サーバー :8000]
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

Excel ワークブックはリポジトリルートの `autotrader.xlsm` として配置する（Git 管理は任意）。Git では `Product/autotrader-vba/` に text source を置き、workbook へ import する。

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
  "ohlc": [{"o":2490,"h":2510,"l":2485,"c":2500,"v":50000}, ...],  // 直近5本
  "timestamp": "2026-04-12T10:30:00"
}

処理:
1. risk_guard: 既存ポジション・上限金額・損切りラインを確認
2. gemini_trader: Gemini API へ判断を依頼
3. risk_guard: AI の判断を二重チェック（上限超過なら hold へ上書き）
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
1. 損切りライン超過 → 強制 "sell"（AI 判断より優先）
2. 1発注の金額上限超過（price × qty > limit）→ qty を上限以内に縮小 or "hold"
3. 市場時間外（09:00〜11:30, 12:30〜15:30 以外）→ "hold"
4. Python サーバー起動から 30 秒未満（ウォームアップ）→ "hold"
```

### リスク設定のデフォルト値

| 設定項目 | デフォルト | 説明 |
|---------|-----------|------|
| `limit_per_order` | 100,000円 | 1回の発注上限金額 |
| `stop_loss_pct` | 3.0% | 損切りライン（平均取得単価からの下落率） |
| `max_qty_per_order` | 100株 | 1回の最大発注数量 |
| `poll_interval_sec` | 5 | VBA からの送信間隔（秒） |

### WebSocket ペイロード（毎受信後に配信）

```json
{
  "type": "state_update",
  "ts": "2026-04-12T10:30:05",
  "price": { "code": "1234", "current": 2500, "volume": 12000, "feed_role": "execution", "feed_source": "rakuten_rss" },
  "reference_price": { "code": "1234", "current": 2515, "volume": 11800, "feed_role": "reference", "feed_source": "jquants_light" },
  "position": { "qty": 100, "avg_cost": 2480, "pnl": 2000, "pnl_pct": 0.81 },
  "last_action": { "action": "buy", "qty": 100, "reason": "RSI過売り圏からの反転", "at": "10:30:05", "feed_role": "execution", "feed_source": "rakuten_rss" },
  "risk": { "limit_per_order": 100000, "stop_loss_pct": 3.0 }
}
```

---

## 4. SP-2: Excel VBA 層

### ファイル構成

```
autotrader.xlsm
├── VBA: modConfig         # URL・タイムアウト・シート定数
├── VBA: modOHLC           # 分足 OHLC バー管理
├── VBA: modHTTP           # POST /api/price と応答解析
├── VBA: modOrder          # RSS 発注スタブ
├── VBA: modTimer          # OnTime メインループ
├── Sheet: Control         # URL、稼働状態、reference warning 表示
├── Sheet: Market          # RSS 現在値・出来高・日付・時刻
├── Sheet: OHLC_Data       # 確定バー保存
└── Sheet: Log             # action と reference advisory の履歴
```

### 動作フロー

```
1. [起動] Workbook_Open でブックを開く → Control シートから START を押してタイマー開始（5秒間隔）

2. [価格取得] RSS 関数で現在値・出来高を取得。OHLC は VBA 側で最大20本分を保持しつつ、API には直近5本を送る
   （起動直後は蓄積本数が少ないため、Python サーバーのウォームアップ期間中は発注しない）
  例: =RSS|'1234.T'!'現在値'

3. [Python へ POST] /api/price へ JSON 送信（MSXML2.ServerXMLHTTP.6.0 使用）

4. [レスポンス解析]
  action = "buy"  → 現在の source drop では BUY_STUB を記録（実発注は未接続）
  action = "sell" → 現在の source drop では SELL_STUB を記録（実発注は未接続）
   action = "hold" → 何もしない
  reference_status / reference_price / warning_message は表示とログにのみ使う

5. [繰り返し] タイマーで 2〜4 をループ
```

### 安全装置（VBA 側）

- Python サーバーへの接続タイムアウト（3秒）→ 応答なしなら発注しない
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
