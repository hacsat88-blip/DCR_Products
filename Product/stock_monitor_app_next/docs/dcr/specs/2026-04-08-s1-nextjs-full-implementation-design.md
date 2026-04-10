# S1 Design: Next.js版フル実装先行（単一HTML自動抽出の前段）

- Date: 2026-04-08
- Scope: S1（README記載のPhase 5機能をNext.js版でフル実装・安定化）
- Background: 将来の「単一HTML自動抽出（C案）」を成立させるため、先にNext.js実装を完成・安定化する。

## 1. 目的

単一HTML変換の前に、Next.js版の機能をREADMEのPhase 5定義まで揃え、実装境界を整理し、抽出不能な依存点を明示化する。  
この段階では「変換パイプライン本体」よりも「変換しやすい正本アプリ」を作ることを優先する。

## 2. 設計方針（承認済み）

1. 境界分離を徹底する  
   - UI層: 表示とユーザー操作に限定  
   - ドメインロジック層: 判定・整形・スコア計算・状態遷移  
   - ランタイム依存層: Next API / env / storage / polling / host hook

2. 抽出適性を高める  
   - Next.js依存はadapterへ閉じ込める  
   - UIから直接 `fetch/localStorage/process.env` を触らない  
   - 将来はadapter差し替えで単一HTMLへ移植可能にする

3. 品質ゲートを先行  
   - 重要導線をTDDで固定（検索・比較・監視・429再試行・鮮度表示・fallback）  
   - `lint/test/build` を最終ゲートとする

## 3. S1対象（README準拠）と機能グループ境界

S1ではREADMEに記載済みのPhase 5機能を対象とする。  
各グループは「deliverable / 最低動作 / S2へ遅延」の3点で明示する。

### 3.1 ダッシュボード主要導線（検索 / 一覧 / 比較 / 詳細 / 監視）

- Deliverable
  - 検索→選択→比較→詳細確認→監視登録の導線が単一セッションで完結する
  - 比較上限・監視状態・保有状態の表示が一貫する
- 最低動作
  - 検索結果を一覧へ反映できる
  - 比較追加/解除でUIとstoreが同期する
  - 詳細ドロワーでメモ・仮説が保持される
- S2へ遅延
  - 単一HTMLでの高機能チャート最適化（描画性能チューニング）

### 3.2 判定/スコア（ranking / action lane / review補助）

- Deliverable
  - rankingとaction laneが同一の評価ロジックを参照
  - スコア関連文言（summary/scoreSummary）が目的別に分離される
- 最低動作
  - 並び替え・フィルタ変更でrankingが決定的に再計算される
  - 判定の変化がレビュー導線で確認できる
- S2へ遅延
  - 単一HTMLでの重い再計算最適化（worker化等）

### 3.3 記録（snapshots / timeline / saved screens / export-import）

- Deliverable
  - capture単位の保存・削除・履歴表示が機能する
  - saved screenで画面復元が可能
  - JSON/CSVのexport-importが往復整合する
- 最低動作
  - snapshot保存後にtimeline反映
  - 保存画面の再適用でfilters/sort/compareが復元
- S2へ遅延
  - 単一HTML向けのファイルI/O UX最適化

### 3.4 Alert（ルール/イベント/通知・優先度・期限）

- Deliverable
  - ルール作成/更新/削除、イベント生成、通知状態管理が一貫
  - 優先度・期限が表示/運用導線に反映
- 最低動作
  - refresh時に期待通りのイベント生成
  - silent re-evaluation時に誤通知を抑止
- S2へ遅延
  - ホスト別通知UI差分の最適化

### 3.5 ナビゲータ（実行フロー / 429再試行）

- Deliverable
  - step0-3 の実行状態が可視化される
  - 429 retry情報が全stepで保持・表示される
- 最低動作
  - rate-limit時にcooldown導線で再実行制御
  - 非429時は通常エラーフローへ分岐
- S2へ遅延
  - モデルホスト注入での実行経路切替（Claude/Gemini/Grok別）

### 3.6 データ品質表示（source / freshness / fallback）

- Deliverable
  - source/freshness/fallbackがカード・ランキング・詳細で整合
- 最低動作
  - stale/fallbackが表示上誤認されない
  - sourceラベルが実データ起点と一致
- S2へ遅延
  - ホストごとの時刻同期差分吸収

## 4. 非対象（S1ではやらないこと）

- 単一HTML自動抽出パイプラインの本実装
- モデル/ホストごとの実行面最適化（Claude/Gemini/Grok別adapter）
- 秘密情報を必要とするクライアント直埋め運用

## 5. コンポーネント/モジュール責務マップ

### 5.1 UI層

- `src/components/screener/*`: 検索・絞り込み・結果選択
- `src/components/dashboard/*`: ranking / action lane / timeline / export / data quality
- `src/components/stock/*`: card / detail drawer / holding/memo/hypothesis
- `src/components/navigator/*`: setup / execution status / cooldown UI

### 5.2 状態管理層

- `src/store/useStockStore.ts`: 株式監視系の正本状態
- `src/store/useNavigatorStore.ts`: step実行・retry state・diagnostics
- `src/store/slices/*`: ドメイン別の更新ロジック分割

### 5.3 サービス/プロバイダ層

- `src/services/providers/*`: 価格/財務の取得とfallback判断
- `src/services/claudeSearchProvider.ts`: Claude hook + catalog fallback検索
- `src/services/stockSearchService.ts`: UI向け検索API

### 5.4 ランタイム依存層

- `src/lib/runtimeConfig.ts`: nextjs/artifact判定
- `src/lib/persistenceLayer.ts`: storage adapter抽象
- `src/hooks/polling.ts`: polling制御抽象

### 5.5 主要インターフェース規約

- UI→Store: action呼び出しのみ（外部I/O禁止）
- Store→Service: 型付きpayloadでI/O委譲
- Service→Store: 正規化済みデータ + 明示的error/retry/fallback metadata

## 6. クリティカルパスのE2Eデータフロー

### 6.1 検索 → 一覧/詳細

1. ユーザー入力（SearchBar）
2. `stockSearchService` 実行（Claude hook or catalog fallback）
3. 結果選択でstoreへ登録/反映
4. 一覧・ランキング・詳細が同一stateを参照
5. 異常時: 検索errorをUI表示し既存一覧は維持

### 6.2 比較導線

1. ranking/cardから比較追加
2. compareSelection更新（上限4）
3. ComparePanelで差分表示
4. 異常時: 上限超過は追加拒否 + UI説明

### 6.3 監視 + 429再試行

1. navigator step実行開始
2. `/api/navigator/run` 結果をstep別にstore反映
3. 429時は`retryState`保持（step0-3共通）
4. cooldown UIで再実行可能時刻を提示
5. 異常時: 非429は汎用エラー導線へ分岐

### 6.4 fallback + freshness/source表示

1. provider chainで primary→fallback→mock 判定
2. source/freshnessを正規化してstockへ付与
3. card/ranking/detailで同一ルール表示
4. 異常時: source不明は明示的neutral表示

### 6.5 snapshot/export/import

1. capture作成（manual/autosave）
2. timeline/snapshot panelに反映
3. export(JSON/CSV)
4. import時にschema補完して復元
5. 異常時: 部分破損は読めるレコードのみ保持

## 7. エラーハンドリング規約

- 例外を握りつぶさない（型付きエラーか明示メッセージで返す）
- fallback発生時はUIで理由を表示する
- 429は`retryAfter/retryAt/reason`を保持し、再実行導線を制御する

## 8. テスト戦略と品質ゲート

### 8.1 テストレベル

- Unit: 判定ロジック/整形/ヘルパー/selector
- Integration: store action + service/provider + route契約
- UI behavior: 重要導線（検索・比較・retry・freshness）

### 8.2 必須シナリオ（最小）

1. 429 retry metadata が step0-3 全てで保持される
2. fallback発生時に理由・source・freshnessが整合表示される
3. 検索（Claude hook失敗時）でcatalog fallback継続
4. compare上限と解除が整合
5. snapshot/export-import往復で主要フィールド欠損なし

### 8.3 受入基準

- クリティカルシナリオは全て自動テストで緑
- `npm run lint` / `npm run test` / `npm run build` 緑
- 回帰警戒導線（429/fallback/freshness）は手動確認チェックを通過

## 9. 品質基準（Done Definition）

S1完了条件:

1. 機能チェックリスト（3.1〜3.6）に対する実装証跡がある
2. 抽出不能依存点（Next/API/env/browser機能）が一覧化されている
3. UI層から直接runtime依存へアクセスしない（adapter境界遵守）
4. 8.2の必須シナリオが自動テストで緑
5. `npm run lint` / `npm run test` / `npm run build` が通過

## 10. リスク管理

### R1: Hidden Next.js coupling
- Signal: UIが直接route/env/storageを参照
- Mitigation: adapter経由ルール + lint/reviewチェック

### R2: Retry stateの分岐漏れ
- Signal: step別エラー導線の挙動差
- Mitigation: step0-3共通テストテンプレート化

### R3: Source/Freshness表示不整合
- Signal: card/ranking/detailでラベル差異
- Mitigation: shared formatter/badgeで一元化

### R4: Persistence整合性崩れ
- Signal: import後の欠損/破損
- Mitigation: schema migration + partial-recover戦略

## 11. 次段（S2: 自動抽出）への引き渡し

S1完了後にS2へ渡す成果物:

- 機能正本としてのNext.js実装
- 依存点マップ（抽出対象/非対象）
- adapter境界定義
- 単一HTML化の可否判定チェックリスト

これにより、S2では「機能再設計」ではなく「変換・差し替え」に集中できる。
