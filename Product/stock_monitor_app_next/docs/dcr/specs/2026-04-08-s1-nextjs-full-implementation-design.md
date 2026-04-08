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

## 3. S1対象（README準拠）

S1ではREADMEに記載済みのPhase 5機能を対象とする。

- ダッシュボード主要導線: 検索 / 一覧 / 比較 / 詳細 / 監視
- 判定/スコア関連: ranking, action lane, review補助
- 記録関連: snapshots, timeline, saved screens, export/import
- alert関連: ルール/イベント/通知・優先度・期限
- ナビゲータ関連: 実行フローと429再試行導線
- データ品質表示: source/freshness/fallback表示

## 4. 非対象（S1ではやらないこと）

- 単一HTML自動抽出パイプラインの本実装
- モデル/ホストごとの実行面最適化（Claude/Gemini/Grok別adapter）
- 秘密情報を必要とするクライアント直埋め運用

## 5. データフロー規約

1. Service/Provider層で外部データを正規化し、Storeへ渡す  
2. Storeは状態の正本（single source of truth）  
3. UIはselector経由で読み取り、副作用はaction/serviceへ委譲  
4. エラー/リトライ/フォールバック状態は型付きでStoreへ保持

## 6. エラーハンドリング規約

- 例外を握りつぶさない（型付きエラーか明示メッセージで返す）
- fallback発生時はUIで理由を表示する
- 429は`retryAfter/retryAt/reason`を保持し、再実行導線を制御する

## 7. 品質基準（Done Definition）

S1完了条件:

1. README記載のPhase 5機能が実際に動作する
2. 抽出不能依存点（Next/API/env/browser機能）が一覧化されている
3. 重要導線テストが揃っている（回帰防止）
4. `npm run lint` / `npm run test` / `npm run build` が通過

## 8. 次段（S2: 自動抽出）への引き渡し

S1完了後にS2へ渡す成果物:

- 機能正本としてのNext.js実装
- 依存点マップ（抽出対象/非対象）
- adapter境界定義
- 単一HTML化の可否判定チェックリスト

これにより、S2では「機能再設計」ではなく「変換・差し替え」に集中できる。
