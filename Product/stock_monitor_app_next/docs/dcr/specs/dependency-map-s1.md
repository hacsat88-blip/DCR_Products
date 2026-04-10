# S1 Dependency Map (Extraction Blockers)

S2 の単一HTML抽出で差し替えが必要な依存点を、S1 実装に対する実コード確認ベースで整理する。

## Extraction blockers (S1 verified)

- 確認日: 2026-04-09
- 対象: `src/` の実装参照（`stockService`, `useNikkei*`, `useNavigatorStore`, `SummaryBar`, `DataSourceInfoPanel`, `runtimeConfig`, `persistenceLayer`, `polling`, `claudeSearchProvider`）

## Next route依存

| 依存点 | 現状（S1） | 抽出ブロッカー |
|---|---|---|
| 銘柄一覧/評価データ取得 | `stockService.fetchStocks` が `/api/stocks` を直接呼ぶ (`src/services/stockService.ts`) | 単一HTMLでは Next API Route が存在しない |
| 指数チャート取得 | `useNikkei` / `useNikkeiOhlc` が `/api/market-index` と `/api/market-index-intraday` を呼ぶ (`src/hooks/useNikkei.ts`, `src/hooks/useNikkeiOhlc.ts`) | サーバールート依存のためブラウザ単体で解決不能 |
| ナビゲータ実行 | `useNavigatorStore` が `/api/navigator/run` を実行 (`src/store/useNavigatorStore.ts`) | サーバー側推論実行経路に依存 |
| ヘルス/運用情報取得 | `DataSourceInfoPanel`, `SummaryBar` が `/api/data-source-info`, `/api/health` を呼ぶ (`src/components/dashboard/*.tsx`) | 運用情報取得が Next route 前提 |

## env依存

| 依存点 | 現状（S1） | 抽出ブロッカー |
|---|---|---|
| live/mock 切替 | `compositeProvider` が `DATA_MODE`, `ENABLE_LIVE_DATA`（fallbackで `NEXT_PUBLIC_*`）を参照 | `process.env` がない実行環境ではモード固定化または外部設定注入が必要 |
| APIキー/TTL/運用パラメータ | provider と API route が `ALPHA_VANTAGE_API_KEY`, `EDINET_DB_API_KEY`, `JQUANTS_API_KEY`, `GEMINI_API_KEY`, 各種 `*_TTL_SECONDS` を参照 | 秘密情報・運用値はサーバー注入前提で、単一HTMLへ直埋めできない |
| ランタイム切替 | `runtimeConfig` が `NEXT_PUBLIC_STOCK_MONITOR_RUNTIME` を参照 (`src/lib/runtimeConfig.ts`) | S2 は env 依存を外し、起動時 override 注入を正とする必要がある |

## browser API依存

| 依存点 | 現状（S1） | 抽出ブロッカー |
|---|---|---|
| 永続化 | `persistenceLayer` が `window.localStorage` を利用 (`src/lib/persistenceLayer.ts`) | 埋め込み先ポリシーで storage 不可の場合、注入アダプタが必須 |
| UIイベント | `page.tsx` で `window.alert`, `window.scrollTo`, `window.addEventListener` を利用 | host 側制限で動作差分が出る |
| ダウンロード/インポート | `downloadTextFile` が `Blob` / `URL.createObjectURL` / `document` を利用、`ImportPanel` が `FileReader` を利用 | host 側制限下で export/import が不能になる |
| 通知 | alert helper が `Notification` API を利用 (`src/store/slices/helpers.ts`) | 権限/非対応環境で通知が劣化または無効化される |

## adapterで隔離済み依存

| 隔離点 | 現状（S1） | S2 差し替え方針 |
|---|---|---|
| Persistence adapter | `getPersistenceAdapter` が `__STOCK_MONITOR_PERSISTENCE__` 注入を優先 (`src/lib/persistenceLayer.ts`) | 単一HTML側で Storage 互換アダプタを注入 |
| Runtime adapter | `__STOCK_MONITOR_RUNTIME__` override（fallback: env）で runtime を解決 (`src/lib/runtimeConfig.ts`) | S2 は起動時に `artifact` 固定を override 注入 |
| Polling controller | `startPolling` が `PollingController` 差し替えを受け付ける (`src/hooks/polling.ts`) | host の timer 制約を controller で吸収 |
| Claude search hook | `__STOCK_MONITOR_CLAUDE_SEARCH__` 経由で検索実装を注入 (`src/services/claudeSearchProvider.ts`) | 抽出先ホストの検索実装へ置換 |

