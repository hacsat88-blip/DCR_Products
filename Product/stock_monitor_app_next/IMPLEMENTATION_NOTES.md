# IMPLEMENTATION_NOTES (Phase 5 Patch)

## A〜U UX 拡張（最小差分）

- A系
  - DataQualityRibbon を追加（data mode / provider health を常時可視化）
  - StockDetailDrawer に3行クイックレビューを追加（今の判定 / 次に見る数字 / 崩れる条件）
  - ComparePanel の差分表示を強化（価格は優劣色なし）
- B系
  - MorningCheckPanel を追加（前回snapshot差分）
  - 仮説ログを store に追加（`HYPOTHESIS_KEY`、localStorage永続化）
  - RuleManager に `priority` / `dueDate` を追加し AlertCenter で表示
  - DecisionReviewPanel に同判定の過去簡易実績を追加
- C系
  - ActionLaneBoard を追加（4アクション俯瞰）
  - StockOnboardingPanel を追加（mock銘柄JSONの必須項目チェック）
- U系
  - CollapseSimulatorPanel を追加（成長率/PER補正で score/action 試算）
  - ContrarianPanel を追加（反対意見を1件提示）

## 目的

Phase 5 の骨格実装に対して、最小差分で挙動整合を追加。  
既存の `provider / scoring / backtest / alert engine / UI` を維持しつつ、保存モデル・並び順・通知意味づけを修正。

## 今回の修正要点

1. silent alert baseline 更新
- `setScoringConfig()` / `resetScoringConfig()` で score/action を再計算
- 通常 alert event は発火しない
- `previousSnapshots` と `alertConditionState` を再評価後状態で再基準化
- localStorage (`ALERT_SNAPSHOTS_KEY`, `ALERT_CONDITION_STATE_KEY`) へ反映
- 次回 refresh で設定変更由来の diff alert (`score_delta`, `action_changed` など) が混ざらない

2. Ranking 並び順の単一化
- `rankingSortKey` を store に追加
- `sortKey`（一覧）と `rankingSortKey`（Ranking/Ranking CSV）を分離
- `page.tsx` で `rankedRows` を `useMemo` 生成し、`RankingBoard` と `ExportPanel` に同一配列を配線
- `RankingBoard` の内部 `useState` を廃止
- `exportRankingCsv(rows?)` は rows 指定時にその順序を尊重、未指定時は `rankingSortKey` で算出

3. Snapshot を capture 単位へ変更
- `StockSnapshot` に `captureId`, `captureSource` (`manual` / `autosave`) を追加
- `saveCurrentSnapshots(source?)` で 1 回の保存につき 1 capture を生成
- `SnapshotPanel` は capture 件数表示、recent も capture 単位表示
- 削除 API を `deleteSnapshotCapture(captureId)` に変更
- Timeline は従来どおり stock 行ベースで継続

4. autosave 容量対策
- `AUTOSAVE_CAPTURE_LIMIT = 30`
- 上限超過時は古い autosave capture から削除
- manual capture は autosave prune の対象外
- localStorage write 失敗は try/catch でクラッシュ回避し `console.warn` を出力

5. Saved Screen の保存範囲と rename 制約
- 保存対象: `filters`, `sortKey`, `rankingSortKey`, `compareSelection`
- `updateSavedScreen()`:
  - trim 後空文字を拒否
  - 自分以外との重複名を拒否
  - 戻り値 `{ ok, reason }` を返却
- UI 側は rename 失敗時に軽い通知（`alert`）を表示
- `applySavedScreen()` は `filters + sortKey + rankingSortKey + compareSelection` を復元

6. Compare の意味づけ補正
- 価格行の highlight を削除
- `PER/PBR` の低位優位ロジックは維持
- `narrativeSummary` と `scoreSummary` の分離表示は維持

7. `.at(-1)` 除去
- `src/app/page.tsx` と `src/lib/backtestEngine.ts` から `.at(-1)` を除去
- ES2020 互換の末尾参照へ置換

8. archive migration 強化
- `ARCHIVE_SCHEMA_VERSION = phase5-v2`
- schema 不一致でも archive 全 wipe を廃止
- slice 単位 migration を実装:
  - `snapshots`: `captureId` / `captureSource` 補完
  - `savedScreens`: `rankingSortKey` / `compareSelection` 補完
  - `compareSelection`: sanitize
  - `autosaveSnapshots`: boolean sanitize
- 部分破損時も読めるレコードは温存

9. export 整合
- allowlist 方針を維持
- API key / env / secret は export しない
- snapshots export は `captureId` / `captureSource` を含む
- ranking CSV は `rankingSortKey` と同一順序
- `scoreSummary` と narrative (`stock.summary`) を別列で保持

10. 価格プロバイダ差し替え（Yahoo Finance / Stooq → J-Quants）
- 価格取得を `JQuantsPriceProvider` に置換
- 認証は server env の `JQUANTS_API_KEY`（J-Quants V2 `x-api-key`）
- `JQUANTS_REFRESH_TOKEN` / `JQUANTS_ID_TOKEN` は価格認証に使用しない
- issue code resolver は `code` → `code0` を順次試行
- `/v2/equities/bars/daily` から終値2点で前日比を計算
- provider cache（15〜60分、既定30分）を追加
- 失敗理由を `J-Quants API key missing / J-Quants unauthorized / rate limit exceeded / symbol mapping failed / empty daily series` で識別
- 既存の EDINET DB / fallback / mock / health 表示の流れは維持

11. 常時ライブ運用の最小追加（リクエスト抑制）
- EDINET provider に fundamentals TTL キャッシュを追加
  - 環境変数: `EDINET_FUNDAMENTALS_CACHE_TTL_SECONDS`（既定3600秒）
- EDINET 429 検知時にバックオフ窓を追加
  - 環境変数: `EDINET_RATE_LIMIT_BACKOFF_BASE_SECONDS`（既定600秒）
  - バックオフ中は再試行を抑制し、理由をエラー文言に明示
- SummaryBar に `fallbackStartedAt` を表示
  - `フォールバック継続: xx分` を可視化して運用判断しやすくした
- 更新周期の運用目安を UI に明示
  - 価格 5〜15分 / 財務 30〜60分

12. 検索UIのハイブリッド化（登録銘柄 + 市場検索API）
- `SearchBar` を2モード化
  - 登録銘柄: テキスト検索 + プルダウン適用
  - 市場検索(API): ボタン実行型でEDINET `/search` を使用
- 新API route: `/api/stock-search`
  - 登録銘柄結果とAPI結果をコード単位で統合
  - 未登録銘柄をバッジ表示
- API連打を避けるため、クライアントで検索結果キャッシュ（TTLあり）

13. SummaryBar の表示改善（バックオフ時のUX）
- providerカードのラベルを改善
  - `データ時刻` → `最終更新`
  - `判定キー` → `取得元`
- `backoff active` 文言をユーザー向けに短文化
  - `API混雑のため再試行待機中（あとX分）`
- 取得状況の要約表示を追加
  - 例: `価格: 正常 / 財務: 待機中（あと32分）`
- 長文エラーは折りたたみ表示に変更

## 主要更新ファイル

- `src/types/archive.ts`
- `src/lib/alertEngine.ts`
- `src/lib/backtestEngine.ts`
- `src/store/useStockStore.ts`
- `src/components/dashboard/SnapshotPanel.tsx`
- `src/components/dashboard/RankingBoard.tsx`
- `src/components/dashboard/SavedScreenPanel.tsx`
- `src/components/dashboard/ComparePanel.tsx`
- `src/app/page.tsx`
- `README.md`
- `IMPLEMENTATION_NOTES.md`
- `src/services/providers/jquantsPriceProvider.ts`
- `src/services/providers/compositeProvider.ts`
- `src/services/providers/types.ts`

## 検証

- `npm run lint` 成功
- `npm run build` 成功
