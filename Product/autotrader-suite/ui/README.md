# AutoTrader UI

東証プライム短期売買基盤向けの Next.js 監視コンソールです。execution feed と reference feed を分離して表示し、WebSocket 状態、最新イベント、履歴、settings 編集を 1 画面で扱います。

起動順、停止順、paper smoke、live go-no-go の canonical 手順は `../RUNBOOK.md` を使います。この README は dashboard の意味づけだけを扱います。

## セットアップ

1. `.env.local.example` を `.env.local` として複製します。
2. `NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL` を backend URL に合わせます。health/settings proxy と browser WebSocket の両方で使うため、ブラウザからその URL へ直接到達できる必要があります。
3. backend を `Product/autotrader-suite/backend` で起動します。前提は SP-1 backend が `127.0.0.1:8000` で応答することです。
4. frontend をこのディレクトリで起動します。

## コマンド

- 開発起動: `npm run dev`
- テスト: `npm run test`
- Lint: `npm run lint`
- 本番 build: `npm run build`

## API プロキシ

- `GET /api/settings` は backend の `GET /api/settings` を透過します。
- `PUT /api/settings` は backend の `PUT /api/settings` を透過します。
- settings editor は canonical settings を読み込み、未表示フィールドを保持したまま全量 PUT を送ります。

## 運用メモ

- `waiting-first-tick`: WebSocket は開けていても、まだ最初の `state_update` を受け取っていない状態です。
- `stale`: 最後の正常 update から 15 秒を超えて新しい `state_update` が来ていない状態です。feed 停滞や接続断を疑います。
- `poll_interval_sec` は backend settings の保持項目です。実際の送信 cadence を変えるときは workbook の `Control!B2` を更新します。
- health summary は workbook から受けた `mode` / `order_mode` / `live_armed` を反映します。live 発注時は browser 上でも `live` と `broker auto / armed` が見えます。
- `status` / `ai_status` / `reference_status` / `last_warning` は live go-no-go の材料です。small live では `healthy` / `ready` / `ready` を基準にします。

## 現在の検証範囲

- Dashboard shell の waiting / execution / reference 表示
- trader socket reducer と reconnect / stale 挙動
- settings GET / PUT / Auto-Manual override / draft 保持

