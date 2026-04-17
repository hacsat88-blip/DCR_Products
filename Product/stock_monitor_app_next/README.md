# Investment Navigator Pro

Next.js ベースの投資判断支援ダッシュボードです。日本株・米国株・ETF を対象に、監視、比較、ポートフォリオ管理、バックテスト、アラート、AI ナビゲーターを 1 つのアプリにまとめています。

このディレクトリで現在メンテしている対象は Next.js アプリです。過去の Phase 単位メモや Single HTML 実験の詳細は `IMPLEMENTATION_NOTES.md` と `DESIGN.md` を参照してください。

## 現在の機能範囲

- ホームダッシュボード: マーケット、ポートフォリオ、AI Navigator、設定の 4 タブ
- 監視系 UI: compare、snapshot archive、saved screens、ranking、export、データ品質表示
- 個別ページ: `/portfolio`, `/backtest`, `/alerts`, `/etf`
- AI 補助: AI Navigator、inline explain、radar score、portfolio review、why moved
- 運用補助: PWA manifest、service worker、command palette、仮説ログ、アラート評価 API

## 主要ディレクトリ

- `src/app` : App Router のページと API ルート
- `src/components` : ダッシュボード、チャート、ナビゲーター、UI 部品
- `src/services` : データ取得、ニュース集約、LLM 呼び出し、価格プロバイダ
- `src/store` : Zustand ストア
- `src/lib` : alert、backtest、runtime、persistence などの補助ロジック
- `public` : PWA 用アセット

## セットアップ

```bash
npm install
npm run dev
```

起動後は `http://localhost:3000` を開きます。

## 環境変数

ベースとなる live 構成は `.env.local.example` にあります。まずはそれを `.env.local` にコピーしてから、必要なキーを追加してください。

### 基本構成

```env
DATA_MODE=live
ENABLE_LIVE_DATA=true
JQUANTS_API_KEY=your_jquants_api_key_here
EDINET_DB_API_KEY=your_edinet_db_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 追加で使う環境変数

| 変数 | 用途 | 必須度 |
| ---- | ---- | ------ |
| `OPENROUTER_API_KEY` | `/api/quick/*`, `/api/deep/*` の LLM 呼び出し | Deep 系は必須 |
| `DEEP_LLM_DAILY_CAP` | Deep 系の 1 日上限 | 任意 |
| `QUICK_LLM_MODEL` | Quick tier モデル上書き | 任意 |
| `DEEP_LLM_MODEL` | Deep tier モデル上書き | 任意 |
| `DEEP_LLM_FALLBACK_MODEL` | Deep tier fallback モデル | 任意 |
| `GOOGLE_API_KEY` | Quick tier の互換 fallback | 通常不要 |
| `MARKETAUX_API_KEY` | 株式ニュース補強 | 任意 |
| `CRON_SECRET` | `/api/cron/evaluate-alerts` 認証 | Cron 利用時は必須 |
| `NEXT_PUBLIC_STOCK_MONITOR_RUNTIME` | Artifact 互換ランタイム切替 | 通常不要 |
| `YAHOO_PRICE_CACHE_TTL_SECONDS` | Yahoo 価格キャッシュ TTL | 任意 |
| `ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS` | Alpha Vantage 価格キャッシュ TTL | 任意 |
| `JQUANTS_PRICE_CACHE_TTL_SECONDS` | J-Quants 価格キャッシュ TTL | 任意 |
| `EDINET_DB_BASE_URL` | EDINET DB ベース URL 上書き | 通常不要 |

補足:

- `GEMINI_API_KEY` は AI Navigator API で使います。
- `OPENROUTER_API_KEY` は Quick / Deep API の主経路です。Quick 系は互換 fallback を持ちますが、Deep 系は OpenRouter 前提です。
- `JQUANTS_REFRESH_TOKEN` / `JQUANTS_ID_TOKEN` は現行価格取得では使いません。
- `CRON_SECRET` を Vercel Project Environment Variables に設定すると、Vercel Cron は同じ値を `Authorization: Bearer <CRON_SECRET>` で自動送信します。

## データソース

| 種別 | 主要ソース | 補足 |
| ---- | ---------- | ---- |
| 日本株価 | J-Quants V2 | `JQUANTS_API_KEY` が必要 |
| 米国株価 / 代替価格 | Yahoo Finance / Alpha Vantage | Alpha Vantage は fallback と intraday 用 |
| 日本企業財務 | EDINET DB | `EDINET_DB_API_KEY` が必要 |
| ニュース | RSS + Marketaux | Marketaux は任意 |
| AI Navigator | Gemini | `GEMINI_API_KEY` が必要 |
| Quick / Deep AI 補助 | OpenRouter | `OPENROUTER_API_KEY` 推奨 |

## 主要ページと API

### ページ

- `/` : メインダッシュボード
- `/portfolio` : 保有銘柄管理
- `/backtest` : バックテスト
- `/alerts` : アラート設定
- `/etf` : ETF 一覧

### API

- `/api/stocks` : 銘柄一覧と価格・財務の集約
- `/api/stock-search` : 検索
- `/api/market-index`, `/api/market-index-intraday` : 指数データ
- `/api/navigator/run`, `/api/navigator/config` : AI Navigator
- `/api/quick/*` : 軽量 AI 補助
- `/api/deep/*` : 重めの AI 補助
- `/api/cron/evaluate-alerts` : アラート評価
- `/api/health`, `/api/data-source-info`, `/api/yahoo-proxy` : 運用確認系

## 運用メモ

- 保存は主に localStorage ベースです。
- compare は最大 4 件の軽量設計です。
- `/api/cron/evaluate-alerts` は `Authorization: Bearer <CRON_SECRET>` を要求します。
- `vercel.json` では `/api/cron/evaluate-alerts` を UTC 日次 `0 0 * * *` で定義しています。Hobby 制限に合わせた安全側の既定値です。
- Cron の頻度を上げる場合は Vercel プラン制約を確認したうえで `Product/stock_monitor_app_next/vercel.json` を更新してください。
- Artifact / Single HTML 系の過去メモは `IMPLEMENTATION_NOTES.md` に残していますが、現行の保守対象は Next.js アプリです。

## Vercel 本番チェックリスト

### 1. Project Settings

- Root Directory: `Product/stock_monitor_app_next`
- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`
- Production Branch: `main`

### 2. Environment Variables

| 区分 | 必要な変数 |
| ---- | ---------- |
| ベース運用 | `DATA_MODE=live`, `ENABLE_LIVE_DATA=true`, `JQUANTS_API_KEY`, `EDINET_DB_API_KEY` |
| 価格 fallback / intraday | `ALPHA_VANTAGE_API_KEY` |
| AI Navigator | `GEMINI_API_KEY` |
| Quick / Deep AI | `OPENROUTER_API_KEY` |
| Cron | `CRON_SECRET` |
| 任意 | `MARKETAUX_API_KEY`, `DEEP_LLM_DAILY_CAP`, `QUICK_LLM_MODEL`, `DEEP_LLM_MODEL`, `DEEP_LLM_FALLBACK_MODEL`, `NEXT_PUBLIC_STOCK_MONITOR_RUNTIME` |

補足:

- `OPENROUTER_API_KEY` がない場合、`/api/deep/*` は 503 を返します。
- `GEMINI_API_KEY` がない場合、AI Navigator 実行系は動きません。
- `CRON_SECRET` を設定すると、Vercel Cron は `Authorization: Bearer <CRON_SECRET>` を自動送信します。

### 3. Cron Jobs

- `vercel.json` の定義は `/api/cron/evaluate-alerts` を UTC 日次 `0 0 * * *`
- Hobby では高頻度 Cron を使えないため、この既定値を維持するのが安全です。
- Vercel ダッシュボードの `Settings > Cron Jobs` で対象 path が見えていることを確認してください。

### 4. Post-deploy Smoke Test

- `/api/health` が JSON を返す
- `/api/data-source-info` が provider 情報を返す
- `/api/stocks` が 500 にならず、データ取得結果を返す
- `/` を開いて初期表示が崩れていない
- AI を使う場合は `/api/navigator/config` と AI 関連 UI が期待通りに動く

## 検証コマンド

```bash
npm run lint
npm run test
npm run build
powershell ../../validate.ps1
powershell ../../deploy.ps1 -Check
```

テスト件数やビルド出力件数は変わりやすいため README には固定値を書かず、都度コマンド結果を正としてください。

## 関連ドキュメント

- `IMPLEMENTATION_NOTES.md` : 実装履歴、Phase 単位メモ、Artifact / Single HTML の補足
- `DESIGN.md` : 設計メモ
- `AGENTS.md` : 作業ルール
