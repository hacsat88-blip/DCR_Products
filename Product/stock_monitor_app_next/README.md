# Stock Selection Dashboard (Phase 5)

日本株監視アプリの Phase 5 実装です。  
Phase 4 までの `live/mock/fallback + scoring + alert + backtest` を維持しつつ、`蓄積・比較・振り返り` レイヤーを追加しました。

## S1 完了状態 / S2 引き継ぎ（Task6）

- S1（Next.js 版フル実装）の最終検証・引き継ぎパッケージを更新済み。
- S2 単一HTML抽出の依存ブロッカーは `docs/dcr/specs/dependency-map-s1.md` に集約（Next route / env / browser API / adapter境界）。
- S2 で優先して差し替える境界:
  - API route 呼び出し（`/api/stocks`, `/api/market-index*`, `/api/navigator/run`, `/api/data-source-info`, `/api/health`）
  - env 依存（API key / TTL / runtime）
  - host 制約を受ける browser API（storage / download / import / notification）
  - 注入済み adapter（`__STOCK_MONITOR_PERSISTENCE__`, `__STOCK_MONITOR_RUNTIME__`, `__STOCK_MONITOR_CLAUDE_SEARCH__`, `PollingController`）

## セットアップ

```bash
npm install
npm run dev
```

起動後: `http://localhost:3000`

Artifact 互換ランタイムを使う場合は `NEXT_PUBLIC_STOCK_MONITOR_RUNTIME=artifact` を指定し、必要に応じて `globalThis.__STOCK_MONITOR_PERSISTENCE__` に Storage 互換アダプタを注入してください。未注入時はセッション内メモリに退避します。

## Single HTML v1（`artifact-dashboard.html`）

`artifact-dashboard.html` は React/Next.js なしでそのまま実行できる単一ファイル版です。

- ローカルで開く: `Product\stock_monitor_app_next\artifact-dashboard.html` をブラウザで直接開く
- 簡易サーバーで開く（推奨）:

```bash
npx serve .
```

### Host 互換性（Claude / Gemini / Grok）

- コード生成はどのモデルでも可能ですが、**実行可否はモデルではなくホストの実行環境依存**です。
- そのため「コードを渡せば必ず動く」ではなく、「実行面（Artifact/Canvas/Preview等）があると動く」が正確です。

### Single HTML v1 の実装ポリシー

- 検索: `globalThis.__STOCK_MONITOR_CLAUDE_SEARCH__` があれば優先利用、未注入時はローカル検索へフォールバック
- 永続化: `globalThis.__STOCK_MONITOR_PERSISTENCE__` があれば利用、未注入時は `localStorage`、さらに不可ならメモリへフォールバック
- compare/watch/export/import/ranking は単一ファイル内で継続動作
- APIキーや secret は埋め込まない

検証:

```bash
npm run lint
npm run build
```

## 環境変数（.env.local）

```env
# live 運用の正規設定（server env）
DATA_MODE=live
ENABLE_LIVE_DATA=true

# 必要時のみ（互換 fallback / クライアント公開用の補助）
# NEXT_PUBLIC_DATA_MODE=live
# NEXT_PUBLIC_ENABLE_LIVE_DATA=true

# optional
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
EDINET_DB_API_KEY=your_key_here
STOCKS_CACHE_TTL_SECONDS=120
YAHOO_PRICE_CACHE_TTL_SECONDS=1800
ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS=1800
EDINET_FUNDAMENTALS_CACHE_TTL_SECONDS=3600
EDINET_RATE_LIMIT_BACKOFF_BASE_SECONDS=600
```

- 正規の live 判定は server env の `DATA_MODE` / `ENABLE_LIVE_DATA` を優先
- `NEXT_PUBLIC_DATA_MODE` / `NEXT_PUBLIC_ENABLE_LIVE_DATA` は互換 fallback としてのみ利用
- 価格データは Yahoo Finance を優先し、欠損時のみ Alpha Vantage を fallback 利用
- `ALPHA_VANTAGE_API_KEY` は server env 専用（`NEXT_PUBLIC_*` で公開しない）
- EDINET APIキー未設定時は `mock/fallback` で継続動作
- `.env.local` はコミットしない（`.gitignore` で除外）
- 常時運用時は「価格: 5〜15分」「財務: 30〜60分」を目安に手動更新

### 最小構成

- live 運用:
  - `DATA_MODE=live`
  - `ENABLE_LIVE_DATA=true`
  - （任意）`ALPHA_VANTAGE_API_KEY=...` ※ Yahoo 欠損時 fallback 強化
- mock 運用:
  - `DATA_MODE=mock`
  - `ENABLE_LIVE_DATA=false`

## Price provider トラブルシュート

- `Yahoo quotes failed for all symbols` が出るとき:
  - `/api/yahoo-proxy` で upstream 到達性を確認
  - 企業コードのサフィックス（`.T` など）マッピングを確認
- `Alpha Vantage API key missing` が出るとき:
  - `.env.local` に `ALPHA_VANTAGE_API_KEY=...` を追加し、dev server を再起動
- `.env.local` を更新したら、dev server を完全再起動する
- それでも古い失敗表示が残る場合は:
  - 実行中プロセスを停止して再起動
  - 必要に応じて `.next` を削除して再起動（キャッシュ影響を除外）

## Phase 5 追加機能

- Snapshot Archive:
  - 手動保存
  - autosave（refresh成功時）
  - 保存上限 500（capture単位）
- Compare View:
  - 最大4銘柄の横並び比較
  - 数値の簡易 diff highlight
  - narrative summary / scoreSummary を分離表示
- Ranking Board:
  - 複数軸ソート
  - compare 追加/解除
  - ranking CSV export
- Saved Screens:
  - フィルタ/ソート保存・適用・削除・名称更新
- Evaluation Timeline:
  - score/price の時系列
  - action change / score delta の確認
- Export Panel:
  - JSON export（対象選択）
  - snapshots CSV / ranking CSV
- Search:
  - `登録銘柄` モード: プルダウンですぐ絞り込み
  - `市場検索(API)` モード: ボタン実行でEDINET検索（クエリ結果はクライアント側で短期キャッシュ）

## A〜U 改善パック（UI/UX 拡張）

- データ品質リボン（DataQualityRibbon）
  - Header直下で `dataMode / 最終更新 / provider状態` を常時表示
- 判断レーン（ActionLaneBoard）
  - `buy_now / wait_earnings / wait_pullback / exclude` の4レーンで俯瞰
- 朝チェックモード（MorningCheckPanel）
  - 前回スナップショットとの差分（判定・スコア・価格）を先に確認
- 詳細ドロワーのクイックレビュー
  - 最上部に `今の判定 / 次に見る数字 / 崩れる条件` を固定表示
- 仮説ログ（StockDetailDrawer）
  - `仮説 / 根拠 / 見直し日 / 検証結果` を localStorage 保存
- アラート優先度・期限
  - RuleManager で `priority` と `dueDate` を設定
  - AlertCenter で `優先度バッジ` と `対応目安` を表示
- 判定レビュー強化（DecisionReviewPanel）
  - 同判定の過去簡易実績（次期平均リターン）を表示
- 比較ビュー強化（ComparePanel）
  - 価格は優劣色を付けず、成長・CF・PER/PBRの相対差を明示
- 銘柄追加オンボーディング（StockOnboardingPanel）
  - mock銘柄追加前に必須項目のJSONチェック
- 崩れシミュレーター（CollapseSimulatorPanel）
  - 売上成長/営業利益成長/PER補正で score/action を即時試算
- 逆張り監査官（ContrarianPanel）
  - 現在判断に対する反対意見を1件提示

## Phase 5 修正版（最小差分）での追加整合

- `captureId` / `captureSource` を Snapshot に導入
  - 1回の保存操作で 1 capture を作成
  - `captureSource` は `manual` / `autosave`
  - SnapshotPanel は capture 件数表示・capture 単位削除
- `rankingSortKey` を導入
  - `sortKey`（一覧向け）と `rankingSortKey`（Ranking/Ranking CSV向け）を分離
  - RankingBoard の並び順と Ranking CSV の順序を一致
- scoring tuning 時の silent alert baseline 更新
  - `setScoringConfig` / `resetScoringConfig` では alert event を追加しない
  - 再評価後の `previousSnapshots` と `alertConditionState` を静かに再基準化
  - 設定変更由来の `score_delta` / `action_changed` 誤発火を抑止
- autosave capture 上限を追加
  - `AUTOSAVE_CAPTURE_LIMIT = 30`
  - 上限超過時は古い autosave capture から整理
  - manual capture は autosave prune 対象外
- Saved Screen の保存対象を明確化
  - 保存: `filters`, `sortKey`, `rankingSortKey`, `compareSelection`
  - 非保存: snapshot / alert history / backtest cache / 一時UI状態
  - rename は空文字と重複名を拒否
- archive migration を slice 単位で実装
  - schema 不一致でも全 wipe しない
  - 壊れたレコードだけ除外し、読める旧データは温存
  - 旧 snapshot は `checkedAt` 単位で `captureId` を補完
  - 旧 savedScreen は `rankingSortKey` を補完

## summary 分離（Phase 4 継続）

- `Stock.summary`: 企業説明（narrative）
- `ScoreEvaluation.scoreSummary`: 判定要約

この2つは分離されており、再評価で上書きされません。  
検索対象は企業説明 (`Stock.summary`) を参照します。

## tuning と alert の関係（Phase 4 継続）

- scoringConfig 変更時は score/action を再計算
- ただし alert は silent re-evaluation（通常 alert history を汚さない）
- baseline も同時に更新し、次回 refresh で設定変更由来の差分通知を出さない
- 市場由来の alert は refresh 時評価のみで発生

## データソース

- Price data: Yahoo Finance (primary), Alpha Vantage (fallback)
- Fundamentals: EDINET DB
- 文章項目 / 補助履歴: mock
- 設定タブの「データソース情報」パネルで以下を確認可能
  - YF / AV の役割
  - キャッシュ戦略（route/provider TTL）
  - `ALPHA_VANTAGE_API_KEY` の末尾4文字マスク表示
  - コール上限ガイダンス（YF / AV）

## 常時ライブ運用の最小追加（Phase 5+）

- EDINET fundamentals は provider 側で TTL キャッシュ（既定 3600秒）
- EDINET 429 時はバックオフ窓を設定し、短時間の再試行を抑制
- SummaryBar にフォールバック継続時間を表示
  - providerごとの状態を `価格:正常 / 財務:待機中` の要約で表示
  - 長文エラーは折りたたみ表示（詳細ログ）
- 価格と財務の更新周期を分離（価格頻度高め、財務頻度低め）
- Yahoo の CORS/可用性問題は `/api/yahoo-proxy` 経由で切り分け可能

## Backtest の位置づけ

- Phase 5 UI は単銘柄バックテスト優先
- watchlist backtest はエンジン側対応のみ（UI拡張は将来）
- 簡易検証であり、投資成果を保証しません

## Snapshot / Saved Screen / Compare 仕様

- compare 最大件数: 4
- snapshots 最大件数: 500
- savedScreens 最大件数: 30
- autosaveSnapshots 初期値: `false`

## Export 仕様

- JSON:
  - `compareSelection`
  - `snapshots`
  - `alertEvents`
  - `savedScreens`
  - `backtestResults`
- CSV:
  - `snapshots`
  - `ranking`
- クライアント側ダウンロードのみ
- APIキーや `.env` 情報は出力しない

## localStorage キー

- Phase 3:
  - `stock-monitor-alert-rules-v1`
  - `stock-monitor-alert-events-v1`
  - `stock-monitor-alert-snapshots-v1`
  - `stock-monitor-alert-condition-state-v1`
  - `stock-monitor-alert-notifications-v1`
  - `stock-monitor-alert-schema-version`
- Phase 4:
  - `stock-monitor-scoring-config-v1`
  - `stock-monitor-backtest-results-v1`
  - `stock-monitor-backtest-schema-version`
- Phase 5:
  - `stock-monitor-archive-snapshots-v1`
  - `stock-monitor-saved-screens-v1`
  - `stock-monitor-compare-selection-v1`
  - `stock-monitor-autosave-snapshots-v1`
  - `stock-monitor-ranking-sort-v1`
  - `stock-monitor-archive-schema-version`

JSON破損時は壊れたレコードのみ除外し、schema version 不一致時も slice 単位 migration で復元します。

## 主要ファイル（Phase 5）

- `src/types/archive.ts`
- `src/store/useStockStore.ts`
- `src/components/dashboard/SnapshotPanel.tsx`
- `src/components/dashboard/ComparePanel.tsx`
- `src/components/dashboard/RankingBoard.tsx`
- `src/components/dashboard/SavedScreenPanel.tsx`
- `src/components/dashboard/TimelinePanel.tsx`
- `src/components/dashboard/ExportPanel.tsx`
- `src/components/dashboard/DataQualityRibbon.tsx`
- `src/components/dashboard/ActionLaneBoard.tsx`
- `src/components/dashboard/MorningCheckPanel.tsx`
- `src/components/dashboard/CollapseSimulatorPanel.tsx`
- `src/components/dashboard/ContrarianPanel.tsx`
- `src/components/dashboard/StockOnboardingPanel.tsx`

## 現在の制約

- 保存は localStorage のみ（サーバー永続化なし）
- compare は最大4件の軽量設計
- timeline は snapshot 依存（未保存時は empty state）
- watchlist backtest UI は未実装（将来拡張）

## 今後の拡張候補（Phase 6+）

- watchlist比較UIの本格化
- snapshot差分分析（期間比較）
- exportテンプレート拡張
- サーバー側アーカイブ/共有

## Phase 6: サイバーデザイン + AI ナビゲーター + ローソク足チャート

### 概要

Investment Dashboard のサイバー風デザインと AI 投資パイプラインを統合しました。

- **デザインシステム全面置換**: 黒背景 + 緑 #00ff41、Orbitron / Share Tech Mono フォント、スキャンライン、グロー効果
- **日経225ローソク足チャート**: TradingView lightweight-charts で 5分足〜週足に対応
- **AI 投資ナビゲーター**: Gemini API による 4段階パイプライン（マクロ分析 → 銘柄選定 → ディベート → 最終評価）

### 追加環境変数

```env
# AI ナビゲーター（Gemini API）
GEMINI_API_KEY=your_gemini_api_key_here

# Alpha Vantage（5分足・15分足・1時間足に必要）
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

- `GEMINI_API_KEY` 未設定時: ナビゲーターは mock データで動作
- `ALPHA_VANTAGE_API_KEY` 未設定時: 日足・週足のみ利用可能（Yahoo Finance 経由）
- Alpha Vantage 無料枠: 25 リクエスト/日

### ナビゲーター使い方

1. マーケットタブ上部の **「AI NAVIGATOR」** ボタンをクリック
2. モーダルで市場（JP / US / BOTH）、リスク許容度、投資期間を設定
3. **「EXECUTE RESEARCH」** でパイプライン実行
4. 結果はマーケットタブ上部に表示（マクロ環境、銘柄テーブル、ディベート判定、ベストピック）
5. JSON エクスポート / インポートで結果を保存・復元可能

### ローソク足チャート

- 5分足 / 15分足 / 1時間足: Alpha Vantage API（要 API キー）
- 日足 / 週足: Yahoo Finance（API キー不要）
- ボリュームヒストグラム表示
- サイバーテーマ（黒背景、緑/赤ローソク、緑グリッド）

### 主要新規ファイル

- `src/components/dashboard/NikkeiCandlestickChart.tsx` — ローソク足チャート
- `src/components/navigator/` — AI ナビゲーター UI 一式
- `src/services/gemini.ts` — Gemini API サービス層
- `src/store/useNavigatorStore.ts` — ナビゲーター状態管理
- `src/hooks/useNikkeiOhlc.ts` — OHLC データ取得フック
- `src/types/navigator.ts` — ナビゲーター型定義
- `src/app/api/navigator/` — ナビゲーター API ルート
- `src/app/api/market-index-intraday/route.ts` — Alpha Vantage イントラデイ API

### localStorage キー（追加）

- `stock-navigator-state-v1` — ナビゲーター設定・結果の永続化
