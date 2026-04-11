# 自動売買アプリ 設計ドキュメント

**作成日**: 2026-04-12  
**ステータス**: 承認済み  
**スコープ**: 楽天証券 MarketSpeed II RSS を使った AI 自動売買システム（新規）

---

## 1. 概要

楽天証券の MarketSpeed II RSS（Excel アドイン）をデータソース兼発注インフラとして使用し、Claude API が売買タイミングを判断する完全新規の自動売買アプリ。既存の stock_monitor_app_next とは独立した別プロジェクトとして構築する。

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
  ├─ Claude API で売買判断
  ├─ リスクガード適用
  ↓ 発注指示をレスポンスで返却
[Excel VBA]
  └─ RSS 発注関数で実際に発注
[Python FastAPI サーバー :8000]
  ↓ WebSocket (/ws)
[Next.js ダッシュボード :3000]
  └─ リアルタイム表示（株価・AI思考ログ・P&L）
```

**サブプロジェクト分割:**

| # | サブプロジェクト | 主な技術 | 依存関係 |
|---|----------------|---------|---------|
| SP-1 | Python ブリッジサーバー | FastAPI, Claude API | なし（最初に構築） |
| SP-2 | Excel VBA 層 | VBA, MSXML2.XMLHTTP | SP-1 が必要 |
| SP-3 | Next.js ダッシュボード | Next.js 14, WebSocket | SP-1 が必要 |

**開発順序:** SP-1 → SP-3（並行可）→ SP-2（実機接続）

**ディレクトリ配置（リポジトリルートからの相対パス）:**
```
Product/
├── autotrader/        # SP-1: Python ブリッジサーバー
├── autotrader-ui/     # SP-3: Next.js ダッシュボード
└── autotrader.xlsm    # SP-2: Excel VBA（Gitでの管理は任意）
```

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
│   │   ├── ai_trader.py        # Claude API 呼び出し・売買判断
│   │   ├── risk_guard.py       # 上限金額・損切りルール適用
│   │   └── position.py         # ポジション管理（保有株・含み損益）。更新ごとに state.json へ書き出す
│   └── models.py               # Pydantic データモデル
├── state.json                  # ポジション状態の永続化（サーバー再起動対策）
├── requirements.txt
└── .env                        # ANTHROPIC_API_KEY 等
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
  "ohlc": [{"o":2490,"h":2510,"l":2485,"c":2500}, ...],  // 直近20本
  "timestamp": "2026-04-12T10:30:00"
}

処理:
1. risk_guard: 既存ポジション・上限金額・損切りラインを確認
2. ai_trader: Claude API へ判断を依頼（下記プロンプト参照）
3. risk_guard: AI の判断を二重チェック（上限超過なら hold へ上書き）
4. position: 発注後のポジション状態を更新

レスポンス:
{
  "action": "buy" | "sell" | "hold",
  "qty": 100,
  "order_type": "成行",
  "reason": "RSI が 28 まで低下。過売り圏からの反転シグナル。"
}
```

### Claude API プロンプト設計

**システムプロンプト:**
```
あなたは日本株の短期トレーダーです。
与えられた株価データと現在のポジション情報をもとに、
次の売買アクションを JSON で回答してください。

ルール:
- action は "buy" / "sell" / "hold" のいずれか
- 確信が持てない場合は必ず "hold"
- 1回の発注数量は settings.max_qty_per_order 以下
- ポジションが settings.stop_loss_pct を超えて下落したら "sell"

回答形式: {"action": "...", "qty": N, "reason": "日本語で50字以内"}
```

**ユーザープロンプト（毎回生成）:**
```
銘柄: {code}
現在値: {price}円
直近20本の OHLCV: {ohlc}
現在のポジション: {qty}株 / 平均取得単価 {avg_cost}円 / 含み損益 {pnl}円
リスク設定: 1発注上限 {limit}円 / 損切りライン {stop_loss_pct}%
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
  "price": { "code": "1234", "current": 2500, "volume": 12000 },
  "position": { "qty": 100, "avg_cost": 2480, "pnl": 2000, "pnl_pct": 0.81 },
  "last_action": { "action": "buy", "qty": 100, "reason": "RSI過売り圏からの反転", "at": "10:30:05" },
  "risk": { "limit_per_order": 100000, "stop_loss_pct": 3.0 }
}
```

---

## 4. SP-2: Excel VBA 層

### ファイル構成

```
autotrader.xlsm
├── Module1_PriceFeed      # タイマー駆動の株価取得ループ
├── Module2_HttpClient     # Python サーバーへの HTTP 通信
├── Module3_OrderExec      # RSS 発注関数の呼び出し
├── Module4_Settings       # 監視銘柄・設定シートの読み書き
└── Sheet: Config          # 監視銘柄コード・Python サーバー URL 等
```

### 動作フロー

```
1. [起動] Workbook_Open → タイマー開始（5秒間隔）

2. [価格取得] RSS 関数で現在値・出来高を取得。OHLC は VBA 側でメモリ上に最大20本分を蓄積する
   （起動直後は蓄積本数が少ないため、Python サーバーのウォームアップ期間中は発注しない）
   例: =RssMarket("1234", "現在値")

3. [Python へ POST] /api/price へ JSON 送信（MSXML2.XMLHTTP 使用）

4. [レスポンス解析]
   action = "buy"  → RSS 現物買い発注
   action = "sell" → RSS 現物売り発注
   action = "hold" → 何もしない

5. [繰り返し] タイマーで 2〜4 をループ
```

### 安全装置（VBA 側）

- Python サーバーへの接続タイムアウト（3秒）→ 応答なしなら発注しない
- `action = "hold"` のときは一切発注しない
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
| Claude API エラー | risk_guard が hold を返す（フォールバック） |
| RSS データ取得失敗 | VBA: 前回値を使わず、そのサイクルをスキップ |
| WebSocket 切断 | Next.js: 5秒後に自動再接続 |
| 市場時間外 | risk_guard が hold を強制 |

---

## 7. 技術スタック

| 層 | 技術 |
|---|------|
| AI エンジン | Python 3.11+, FastAPI, `anthropic` SDK |
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
