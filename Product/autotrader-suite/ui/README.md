# AutoTrader UI

東証プライム短期売買基盤向けの Next.js 監視コンソールです。execution feed と reference feed を分離して表示し、WebSocket 状態、最新イベント、履歴、settings 編集を 1 画面で扱います。

## セットアップ

1. `.env.local.example` を `.env.local` として複製します。
2. `NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL` を backend URL に合わせます。
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

## 現在の検証範囲

- Dashboard shell の waiting / execution / reference 表示
- trader socket reducer と reconnect / stale 挙動
- settings GET / PUT / Auto-Manual override / draft 保持

