# Cyber Stock Dashboard

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 を用いたサイバーパンク調の株式投資ダッシュボード。
日米株 + ETF のポートフォリオ管理・押し目銘柄スクリーニング・LLMチャット・経済ニュース集約を統合。

## 主な機能
- **ダッシュボード** (`/`): 4 大指数 (N225/DJI/SPX/IXIC) サマリ + 押し目銘柄カルーセル + ポートフォリオ評価額/構成チャート + ニュースタイル + AIチャット mini
- **ポートフォリオ** (`/portfolio`): CRUD + スナップショット蓄積 (`/api/portfolio/snapshot` を CRON で叩く)
- **アナライズ** (`/analyze`): セクター/銘柄から 5 軸スコア + シナリオ + 関連ニュース + 文脈付きチャット
- **個別銘柄** (`/stocks/[symbol]`): ローソク足 (lightweight-charts v5) + RadarScore + ニュース + 180°Flip カード
- **LLM ルータ**: 推論型 `openai/gpt-oss-120b:free` (analyze) / 高速型 `nvidia/nemotron-3-super-120b-a12b:free` (chat/summarize) を自動振り分け

## セットアップ

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

開発サーバ: http://localhost:3000

## スクリプト

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバ起動 |
| `npm run build` | 本番ビルド (webpack 固定。Windows 日本語パスでの Turbopack panic 回避) |
| `npm run build:turbo` | Turbopack ビルド (ASCII パス環境向け) |
| `npm run start` | 本番サーバ起動 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest 一回実行 (125 tests) |
| `npm run test:watch` | Vitest watch |

## 環境変数

`.env.example` を `.env.local` にコピーして必要なキーを設定してください。

- `OPENROUTER_API_KEY` + `OPENROUTER_MODEL_REASONING` / `OPENROUTER_MODEL_FAST`: LLM 連携 (未設定時は friendly fallback)
- `NEXT_PUBLIC_OPENROUTER_ENABLE_WEB_SEARCH`, `OPENROUTER_ENABLE_WEB_SEARCH`: Web検索トグル表示 / サーバー側検索有効化
- `OPENROUTER_WEB_SEARCH_MAX_RESULTS`, `OPENROUTER_WEB_SEARCH_MAX_TOTAL_RESULTS`, `OPENROUTER_WEB_SEARCH_ALLOWED_DOMAINS`: Web検索件数とドメイン制御
- `JQUANTS_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `MARKETAUX_API_KEY`, `EDINETDB_API_KEY`: 市場データ (`J-Quants V2` は `x-api-key` ヘッダーで API キー認証)
- 価格/指数データは `J-Quants/Alpha Vantage` 失敗時に `Yahoo Finance` へ自動フォールバック（Yahoo 用の追加キーは不要）
- `JQUANTS_REFRESH_TOKEN` (任意/旧互換): `JQUANTS_API_KEY` 未設定時のみ旧 V1 認証へフォールバック
- `DATABASE_URL` + `DATABASE_DRIVER` (`sqlite` | `pg`): SQLite (better-sqlite3) / Neon Postgres を切替
- `CRON_SECRET`: Vercel Cron 標準の認証キー。`Authorization: Bearer ${CRON_SECRET}` で `/api/portfolio/snapshot` 等を保護
- `CRON_KEY` (任意/旧方式): `x-cron-key` ヘッダーの互換用。移行中のみ設定

## デプロイ (Vercel)
- `DATABASE_DRIVER=pg` + Neon `DATABASE_URL` に切替
- Vercel Cron で `/api/portfolio/snapshot` を 1 日 1 回 (`Authorization: Bearer ${CRON_SECRET}`)
- 移行メモ: `CRON_KEY` を設定している間は旧 `x-cron-key` も動作しますが、今後は `CRON_SECRET` へ統一推奨
- Edge runtime 対応: `/api/chat` (SSE ストリーム)

## ディレクトリ

- `src/app/` — App Router エントリ + API ルート
- `src/components/{ui,dashboard,cards,charts,chat}/` — UI 構成
- `src/lib/{providers,llm,services,db}/` — データ層 + LLM + DB
- `src/test/` — テストセットアップ
- alias: `@/*` → `src/*`

## 既知制約
- Turbopack は Windows + 日本語パスで panic (`build` は webpack 固定で回避)
- J-Quants 無料プランは前営業日終値のみ。取得失敗時は Yahoo → 静的系列の順でフォールバック
- Alpha Vantage 5 req/min。in-memory queue で守るが複数プロセス共有不可
- レート制限・キャッシュは in-memory (Vercel 本番は Upstash 等への置換推奨)

