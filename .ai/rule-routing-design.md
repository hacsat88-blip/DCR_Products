# ルール動的参照設計

## 結論

このリポジトリでは、`rules/` を単一のロール定義ソースとして維持しつつ、
各エディタでは「共通カーネル + 軽量ルータ + エディタ別アダプタ」で
動的参照をそろえる設計が最も安全です。

完全な共通仕様を期待するのではなく、共通の判断基準を1つに寄せ、
各エディタの読み込み方式に合わせて最小限の差分だけを持たせます。

## 現状の事実

- ルートに `AGENTS.md` と `CLAUDE.md` がある
- `rules/` にロール別のMarkdownがある
- `.cursor/rules/` に Cursor 用の `.mdc` が展開済み
- `.github/copilot-instructions.md` がある
- `.gemini/settings.json` がある
- `deploy.ps1` が同期の中心になっている

## 制約

1. Editorごとに instruction の読み込み方法が違う
2. `Cursor` は `.mdc` 形式が使える
3. `Claude Code` と `Codex` は Markdown 指示ファイルの再帰参照に寄せやすい
4. `Antigravity` は現状 `systemInstruction` 中心で、外部ファイルの動的読込前提にしない方が安全
5. 品質重視のため、曖昧なときに無理にロールを自動適用しない

## 設計方針

### 1. 単一ソース原則

- 共通カーネルの正本: `.ai/kernel.md`
- ロールの正本: `rules/*.md`
- エディタ固有ファイルは生成物または薄い入口に寄せる

`AGENTS.md`、`CLAUDE.md`、`.github/copilot-instructions.md`、
`.gemini/settings.json`、`.cursor/rules/*.mdc` は
できるだけ正本ではなく配布形にする。

### 2. 自動参照の安全条件

ロール自動参照は、次のどれかを満たしたときだけ行う。

- ユーザーがロール名を明示した
- タスクの専門性が高く、対応ロールが1つか2つに強く絞れる
- ファイル種別と依頼内容の両方が一致している

次の条件では自動参照しない。

- 一致候補が3つ以上ある
- 汎用依頼で、ロールを足すと過剰最適化になりうる
- 破壊的操作、セキュリティ変更、デプロイなどで誤適用コストが高い

### 3. 参照優先順位

1. 常時ルール: カーネル
2. 明示ロール: ユーザー指定の `rules/<role>.md`
3. 高一致ロール: 自動選択した `rules/<role>.md`
4. 補助ロール: 最大1件まで追加

原則として、同時に読むロールは最大2件までに制限する。

## ルーティング規則

### 高一致の判定軸

- `依頼文`: セキュリティ監査、SEO診断、UI実装などの意図
- `対象物`: `tsx`、`sql`、`OpenAPI`、広告文、レポートなど
- `成果物`: 実装、監査、設計、要約、戦略
- `危険度`: セキュリティ、法務、運用、課金の変更か

### ルーティング例

- React/Next.js のUI実装
  - 主ロール: `rules/frontend-developer.md`
  - 補助候補: `rules/ux-architect.md`
- 脆弱性レビュー
  - 主ロール: `rules/security-engineer.md`
  - 補助候補: `rules/threat-detection-engineer.md`
- SEO改善案
  - 主ロール: `rules/seo-specialist.md`
- APIテスト設計
  - 主ロール: `rules/api-tester.md`
  - 補助候補: `rules/backend-architect.md`
- 要件整理と進行設計
  - 主ロール: `rules/senior-project-manager.md`
  - 補助候補: `rules/project-shepherd.md`

## エディタ別マッピング

### Codex

- 入口: `AGENTS.md`
- 方式: `AGENTS.md` に共通カーネルとルーティング方針を書く
- ロール適用: 高一致時に `rules/*.md` を参照する
- 方針: ロール本文を `AGENTS.md` に全展開しない

### Claude Code

- 入口: `CLAUDE.md`
- 方式: `CLAUDE.md` に共通カーネル、権限モデル、ルーティング方針を書く
- ロール適用: 高一致時に `rules/*.md` を参照する
- 方針: `Codex` と同じ判断基準を使い、差分は権限周りだけに限定する

### VS Code / Copilot

- 入口: `.github/copilot-instructions.md`
- 方式: 既存の `.ai/` モジュール参照方式を維持する
- ロール適用: まず共通カーネルを読み、必要時のみ `rules/*.md` を追加参照する
- 方針: Copilot 固有の `.instructions.md` を増やしすぎない

### Cursor

- 入口: `.cursor/rules/dcr-kernel.md` と `.cursor/rules/*.mdc`
- 方式: `rules/*.md` から `.mdc` を生成する
- ロール適用: `alwaysApply: false` を基本とし、必要なら `description` と `globs` で補助する
- 方針: `.cursor/rules/*.mdc` を手編集の正本にしない

### Antigravity

- 入口: `.gemini/settings.json`
- 方式: 共通カーネルの要約 + ロール選択方針を `systemInstruction` に持たせる
- ロール適用: 自動読込ではなく、ルータ要約に基づく選択支援を前提にする
- 方針: 外部ロール本文の完全自動参照を前提設計にしない

## 推奨する運用

### 運用ルール

- 通常時はカーネルのみで開始する
- 高一致のときだけロールを自動参照する
- 高リスク作業では、ロールを増やすより確認を優先する
- 明示指定があれば自動判定より優先する

### 品質ガード

- 1タスクでロールは最大2件まで
- セキュリティ、法務、課金、デプロイは補助ロール乱用を禁止
- 生成先ファイルは手編集しない
- 文字コードは UTF-8 に統一する

## 実装フェーズ

### Phase 1: 無事故で始める

- `rules/` を正本とする方針を文書化する
- `AGENTS.md` と `CLAUDE.md` に動的参照ポリシーを追記する
- `.cursor/rules/` は既存のまま維持する

### Phase 2: ずれ防止

- `deploy.ps1` で `rules/*.md -> .cursor/rules/*.mdc` の生成を標準化する
- 可能なら共通カーネルもテンプレートから出力する

### Phase 3: 精度向上

- ロールにメタデータを追加する
  - 例: `domain`, `risk`, `artifacts`, `keywords`
- そのメタデータで自動選択の一致率を上げる

## この設計で避けられる事故

- Editorごとに別判断基準が育ってずれる
- `.cursor/rules/*.mdc` と `rules/*.md` が乖離する
- 曖昧な依頼で専門ロールを誤適用する
- 高リスク作業でロールを重ねすぎて判断が不安定になる

## 未解決事項

- Antigravity が将来どこまで外部ファイル参照できるか
- VS Code 側で `rules/*.md` の追加参照をどこまで安定運用できるか
- 各ロールにどの粒度のメタデータを持たせるか

## 推奨決定

現時点では、次を正式方針にするのが安全。

1. `rules/` をロール定義の正本にする
2. 自動参照は「高一致時のみ」に制限する
3. `Cursor` は生成アダプタ方式にする
4. `Claude Code` と `Codex` は `rules/*.md` の動的参照を採用する
5. `Antigravity` は当面、要約ルータ方式に留める
