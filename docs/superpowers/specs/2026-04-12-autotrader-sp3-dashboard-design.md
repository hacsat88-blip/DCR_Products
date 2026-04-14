# AutoTrader SP-3: Next.js Dashboard Design

**作成日**: 2026-04-12
**ステータス**: design-approved
**対象**: Product/autotrader-suite/ui

## 1. Goal

SP-1 の FastAPI サーバーが配信する監視情報を、ローカル Windows 環境で即読できる 1 ページの監視ダッシュボードとして可視化する。主目的は運用中の状況把握であり、設定変更は補助導線に留める。

## 2. Scope

この版で作るもの:

- WebSocket `/ws` の `state_update` を購読して価格、ポジション、最新判断、接続状態をリアルタイム表示する
- `GET /api/settings` と `PUT /api/settings` を使った最小編集の設定 UI を提供する
- 接続断、stale 状態、設定更新失敗を UI で明示する
- 受信した `last_action` を軽量な履歴として画面内に保持する

この版で作らないもの:

- 複数銘柄同時監視
- 発注操作 UI
- 高度なチャートやテクニカル分析描画
- 履歴の永続保存
- 認証、ユーザー管理、クラウド配備

## 3. Operating Assumptions

- 利用者は同一マシン上で SP-1 と SP-3 を動かす
- ダッシュボードは監視中心で使い、設定変更は必要時のみ行う
- 設定の真実のソースは SP-1 側の `RiskSettings` であり、UI はこれを反映するだけとする

## 4. Architecture

SP-3 は `Product/autotrader-suite/ui` に独立した Next.js 14 アプリとして作る。データ取得は初期表示時の REST と、継続更新用の WebSocket に分離する。

- 初期化: `GET /api/settings` で現在の設定を取得する
- 主系更新: `ws://127.0.0.1:8000/ws` を購読し、`state_update` を ViewModel に正規化する
- 設定反映: `PUT /api/settings` は成功応答を受けた後にのみ UI を更新する
- 障害表示: WebSocket 切断時は stale 表示を出し、5 秒ごとに再接続する

## 5. Page Layout

1 ページ構成を採用する。監視中の視線移動を減らすため、即時判断に必要な情報を上段に集める。

### Header

- アプリ名
- 接続状態: connected / reconnecting / stale / waiting-first-tick
- 稼働状態表示: 直近更新時刻から算出

### Top Grid

- PricePanel: 現在値、出来高、feed role/source、直近更新時刻、直近ティック由来の簡易 sparkline
- PositionPanel: 保有数量、平均取得単価、含み損益、損益率
- LatestActionCard: backend が最後に配信した最新イベント、数量、reason、feed role/source

### Middle Section

- AiLogPanel: `buy` / `sell` / `hold` を含む判断イベントの軽量ログ
- OrderHistory: 実発注に相当する `buy` / `sell` だけを抽出した履歴テーブル

### Bottom Section

- RiskSettings: 折りたたみ式。通常時は閉じたまま、必要時だけ開いて更新する

## 6. File Structure

```text
Product/autotrader-suite/ui/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── api/
│       └── settings/
│           └── route.ts
├── components/
│   ├── DashboardShell.tsx
│   ├── StatusHeader.tsx
│   ├── PricePanel.tsx
│   ├── PositionPanel.tsx
│   ├── LatestActionCard.tsx
│   ├── AiLogPanel.tsx
│   ├── OrderHistory.tsx
│   └── RiskSettingsAccordion.tsx
├── hooks/
│   └── useTraderSocket.ts
├── lib/
│   ├── api.ts
│   ├── trader-view-model.ts
│   └── constants.ts
├── types/
│   └── trader.ts
└── tests/
    ├── useTraderSocket.test.ts
    ├── DashboardShell.test.tsx
    └── RiskSettingsAccordion.test.tsx
```

### Responsibility Boundaries

- `app/page.tsx`: レイアウト組み立てだけを担当し、ソケット処理を持たない
- `hooks/useTraderSocket.ts`: WebSocket 接続、再接続、stale 判定、waiting-first-tick 管理、raw payload の受信だけを担当する
- `lib/trader-view-model.ts`: raw payload の検証、malformed payload の破棄、履歴生成、50 件丸め、UI 用の安定した ViewModel 生成を担当する
- `components/*`: 純表示と最小限のイベント発火に限定する
- `app/api/settings/route.ts`: Next.js 側の薄いプロキシ。CORS と呼び出し元統一のために置く

## 7. Data Contracts

### Backend WebSocket Payload

SP-1 からの `state_update` を受ける。

```json
{
  "type": "state_update",
  "ts": "2026-04-12T10:30:05",
  "price": {
    "code": "1234",
    "current": 2500,
    "volume": 12000,
    "feed_role": "execution",
    "feed_source": "rakuten_rss"
  },
  "position": {
    "qty": 100,
    "avg_cost": 2480,
    "pnl": 2000,
    "pnl_pct": 0.81
  },
  "last_action": {
    "action": "buy",
    "qty": 100,
    "reason": "RSI過売り圏からの反転",
    "at": "10:30:05"
  },
  "risk": {
    "limit_per_order": 100000,
    "stop_loss_pct": 3.0,
    "trading_mode": "conservative",
    "available_cash": 290000,
    "execution_feed": "rakuten_rss",
    "reference_feed": "jquants_light"
  }
}
```

### UI ViewModel

UI では backend payload を直接 panel に渡さず、`useTraderSocket` が受信した raw payload を `lib/trader-view-model.ts` に渡して以下へ正規化する。

- `connectionState`
- `lastUpdatedAt`
- `latestPrice`
- `positionSnapshot`
- `latestEvent`
- `aiEventHistory`
- `orderHistory`
- `riskSnapshot`

`aiEventHistory` は `buy` / `sell` / `hold` を保持し、`orderHistory` は `buy` / `sell` のみ保持する。両者ともメモリ保持のみとし、最大 50 件で切り詰める。

### Latest Event Semantics

現行 backend は execution feed と reference feed の双方で `last_action` を更新する。そのため UI は `latestEvent` を「最後に受信した backend event」と定義し、実行判断専用の意味にはしない。

- `latestEvent` には action, qty, reason, feed role, feed source を併記する
- reference feed 由来の hold は `参照` バッジ付きで表示する
- 実発注の振り返りは `orderHistory` を真実のソースとする

これにより、reference feed の hold が表示されても誤って実発注判断と読まれないようにする。

### Initial Empty State

現行 backend の `/ws` は接続直後のスナップショット送信を持たない。そのため UI は初回 `state_update` 到着まで空状態を許容する。

- Header は `waiting-first-tick` を表示する
- PricePanel はプレースホルダ表示にする
- PositionPanel は数量や損益を 0 と断定せず、`未取得` として表示する
- LatestActionCard は `起動中` または `初回データ待機` を表示する

## 8. Settings Strategy

監視中心のため、設定パネルは折りたたみ式にする。優先表示項目は以下。

- `limit_per_order`
- `stop_loss_pct`
- `max_qty_per_order`
- `poll_interval_sec`
- `ai_mode`
- `trading_mode`
- `available_cash`
- `prioritize_manual_price_band`
- `manual_price_min`
- `manual_price_max`
- `max_daily_orders`
- `max_concurrent_positions`

`execution_feed` と `reference_feed` はこの版では誤操作を避けるため表示中心とし、編集対象から外す。

### Operator-Facing AI Mode Labels

現行 backend を正本として、UI の `ai_mode` は以下の 2 択だけを表示する。

- `gemini`: 単独判断
- `hybrid`: Gemini と Claude の併用判断

umbrella design の Claude-only 記述とは差分があるため、この SP-3 では backend 実装に合わせたラベルを優先する。Claude-only の単独モードは表示しない。

### Nullable Override UX

`max_daily_orders` と `max_concurrent_positions` は backend では nullable override であり、`null` のとき `trading_mode` から effective 値が導出される。UI はこの契約を崩さないため、数値入力だけにしない。

- 表示は `Auto` と `Manual` の切替を持つ
- `Auto` 選択時は `null` を送る
- `Manual` 選択時だけ数値入力を有効化する
- 画面には override 値だけでなく effective 値も併記する

例:

- `最大発注回数: Auto (実効値 3)`
- `最大同時保有数: Manual 2 (実効値 2)`

### Settings Update Contract

現行 backend の `PUT /api/settings` は `RiskSettings` 全体を受ける。そのため UI は部分更新を送らず、以下の手順を必須とする。

1. 初期 `GET /api/settings` の結果をフォームの元データとして保持する
2. ユーザーが変更した項目だけ上書きする
3. `PUT /api/settings` には未変更項目を含めた全量 payload を送る
4. 成功レスポンスを新しい canonical settings として保存する

これにより、`ai_mode`、`max_qty_per_order`、feed 設定などの非表示項目が既定値へ戻る事故を防ぐ。

## 9. Error Handling

- WebSocket 切断: reconnecting 表示に切り替え、5 秒間隔で再接続
- stale 判定: 15 秒を超えて `state_update` が来なければ stale バナーを表示する。これは backend 契約ではなく SP-3 側の UI heuristic とする
- settings 読み込み失敗: 監視 UI は表示継続、設定パネルだけ disabled
- settings 更新失敗: フォーム値は未確定として保持し、成功レスポンスまで ViewModel を更新しない
- malformed payload: 受信イベントを破棄し、最後の正常状態を保持する

## 10. Testing Strategy

### Hook Tests

- 正常受信で ViewModel が更新される
- WebSocket 再接続フローが動く
- stale 判定が 15 秒で有効になる
- 初回 `state_update` 前は `waiting-first-tick` が表示される
- `aiEventHistory` と `orderHistory` が意図どおりフィルタされる
- 履歴が 50 件で丸められる

### Component / Integration Tests

- `page.tsx` が主要パネルを表示する
- `StatusHeader` が接続状態を反映する
- `PricePanel` が `feed_role` / `feed_source` と簡易 sparkline を表示する
- `RiskSettingsAccordion` が GET 結果を表示し、未変更項目を保持した全量 PUT を送り、成功時だけ更新する
- `OrderHistory` が buy/sell のみを履歴表示し、hold は AiLogPanel のみに出る
- settings 取得失敗時に監視 UI は表示継続し、設定パネルだけ disabled になる

### Non-Goals For Initial Testing

- ブラウザ E2E
- 実 WebSocket サーバーとの end-to-end 接続

## 11. Intentional Deltas From Umbrella Design

承認済みの全体設計との差分を以下に明示する。

- Zustand: 全体設計では stack に含まれているが、初版は 1 ページ完結かつ shared state が浅いため必須化しない。`useTraderSocket` とローカル state で足りなくなった時点で導入する
- 簡易チャート: 削除ではなく、PricePanel に直近ティック由来の sparkline として残す

これらはスコープ圧縮ではなく、監視中心の初版に合わせた実装密度の調整である。

## 12. Implementation Notes

- 状態管理ライブラリは初版では必須にしない。`useTraderSocket` とローカル state で足りるなら追加しない
- TypeScript 型は backend contract を写した Raw 型と、UI 用 ViewModel 型を分ける
- デザインは「密度高めの監視コンソール」を目指し、余白過多のカード並べではなく、運用中に数字を拾いやすい配置を優先する

## 13. Acceptance Criteria

- 初回 `state_update` 到着後、1 ページで現在値、ポジション、最新イベント、履歴、設定を確認できる
- WebSocket 切断時に stale / reconnecting が明示される
- `GET /api/settings` の初期値が UI に反映される
- `PUT /api/settings` 成功時だけ設定表示が更新される
- `state_update` の `feed_role` と `feed_source` が UI で判別できる

