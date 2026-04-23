# Supermemory Project Memory Design

## Goal

サトシ開発における会話前提の再説明コストを最小化するため、既存の正本運用を壊さずに、project-scoped memory layer を追加する。

この設計は置換ではなく補完を目的とする。

## Scope

- VS Code を含む MCP client での memory 利用
- project 単位の保存・参照方針
- 高リスク領域のみの確認フロー
- 改修方針・コードレビュー方針の共有化

## Non-Goals

- 既存 rule/spec/CI の正本化を supermemory へ移すこと
- CI の代替として memory を使うこと
- 生成物の直接編集運用を導入すること

## Current Assumptions

サトシ開発では、次が継続して正本である。

- rule / instruction: root entrypoint と catalog
- validation / deploy: `validate.ps1`, `deploy.ps1`
- active design records: `docs/dcr/specs/`, `docs/dcr/plans/`

memory layer は上記の判断・検証レイヤーを補助する。

## Design Principles

1. 正本と記憶を分離する
2. 通常操作は自動化し、危険操作だけ確認する
3. スコープは project 固定で混線を防ぐ
4. 方針は「project 共通」優先で運用する
5. 推測より明示を優先し、確認理由を短文で返す

## Operation Model

### Default Mode

- 既定は省力優先
- 通常: 自動保存 + 自動参照
- 重要時: Y/N 確認

### Confirm Categories

次のカテゴリは保存前、または参照前に確認する。

1. 秘密情報（鍵、トークン、認証情報）
2. 個人情報
3. 本番環境操作
4. 金銭、契約、法務判断
5. 重要方針変更（運用、アーキテクチャ）
6. 改修方針の新規作成または変更
7. コードレビュー方針の新規作成または変更

### UX Contract

- 通常保存通知:
  - 「要点をプロジェクトメモリに保存しました」
- 保存確認:
  - 「保存候補があります。保存しますか？ Y/N」
- 通常参照通知:
  - 「前回の関連セッション要点を参照しました」
- 参照確認:
  - 「関連履歴があります。今回参照しますか？ Y/N」

## Data Model (Project-Scoped)

最低限の論理区分は次とする。

- project_profile
  - 改修方針
  - レビュー方針
  - 既定の検証順序
- session_memory
  - 実行履歴、試行錯誤、暫定判断
- guard_events
  - Y/N 確認が発生した理由と結果

## Priority Order

競合時は次の順序で適用する。

1. repo 正本（rule/spec/code）
2. 明示されたユーザー指示
3. project_profile memory
4. session_memory

## Review Policy Integration

コードレビューでは memory を一次情報にせず、次の用途に限定する。

- レビュー観点の呼び出し
- 過去の指摘傾向の再利用
- 見落とし防止のチェックリスト注入

最終判断は必ず現行コードとテスト結果で行う。

## Rollout Plan

### Phase 1

- MCP 接続を project scope 付きで導入
- 自動保存 / 自動参照を有効化
- 7カテゴリ確認を有効化

### Phase 2

- 改修方針テンプレを導入
- レビュー方針テンプレを導入
- guard_events を観測し閾値を調整

### Phase 3

- 過検知 / 取りこぼしを集計
- 確認ルールを更新

## Acceptance Criteria

- 同一プロジェクトで再説明回数が体感的に減る
- 高リスク情報は確認なしで保存されない
- 改修方針 / レビュー方針が project 共通で引き継がれる
- 正本と CI の責務を侵食しない

## Risks And Mitigations

- リスク: 誤保存
  - 対策: 7カテゴリ確認 + forget 運用
- リスク: memory 過信
  - 対策: priority order 明記 + CI 優先
- リスク: project 混線
  - 対策: project scope header 固定
