---
name: token-efficiency-advisor
routing_category: governance
description: Use when tasks risk context bloat, excessive tool output, or broad codebase scanning; proactively suggest code-review-graph, context-mode, Serena, or usage monitoring before token-heavy operations across Claude Code, Copilot CLI, Codex, Cursor, and Windsurf.
contract:
  preconditions:
    - "user is doing coding work with terminal output, repository exploration, or repeated multi-step sessions"
  postconditions:
    - "a concrete recommendation is provided with tool choice, expected benefit, and fallback"
  invariants:
    - "do not force-install tools; always ask for opt-in before setup"
composable:
  input_type: intent
  output_type: spec
  chains_with:
    - search-first
    - writing-plans
metadata:
  origin: DCR custom
---

# Token Efficiency Advisor

マルチクライアント環境で、必要なときだけ token/context 最適化ツールの利用を促す。

## いつ使うか

- 長いターミナル出力が続くとき（test/lint/build/log）
- 大規模リポジトリで探索対象が広すぎるとき
- 同じファイルを何度も読み直しているとき
- セッションが長く、文脈劣化や再説明コストが増えているとき
- ユーザーが「重い」「遅い」「文脈が散る」と感じているとき

## 提案の原則

1. まず症状を 1 行で要約する
2. 最小の提案を 1 つ出す（多くても 2 つ）
3. 期待効果を定量目安で添える（例: "ログ出力を 60-90% 圧縮"）
4. ユーザーの明示同意なしに導入操作をしない
5. 拒否されたら同じ提案を連打しない

## ツール選定ルール

### 1) CLI 出力が重い

- 第一候補: 失敗箇所だけを抽出する既存シェル/PowerShellフィルタ
- 目的: git/test/lint/build 出力を要約して文脈流入を減らす
- 提案テンプレ: "出力ノイズが増えているので、失敗行と要約だけを抽出して進めますか？"

### 2) 読む範囲が広すぎる

- 第一候補: code-review-graph
- 目的: 影響範囲の最小集合を出し、読むファイル数を減らす
- 提案テンプレ: "探索範囲が広いので、code-review-graph で影響範囲を絞って進めますか？"

### 3) さらに高度な検索/長期メモリが必要

- 候補: context-mode / Serena / token-savior / claude-context / token-optimizer-mcp
- 目的: セッション継続性、ハイブリッド検索、再利用性の向上
- 注意: 環境依存・初期設定コストがあるため PoC 前提で提案

### 4) 使用量を可視化したい

- 候補: ccusage / @ccusage/codex
- 目的: 削減施策の前後で、usage/cost/session長を測る
- 注意: 直接削減ツールではない。ローカルJSONLの対象範囲とプライバシーを確認する

## クライアント別の現実的ガイド

- Claude Code: hook/MCP 機能を使いやすい。提案優先度は高い
- Codex / Cursor / Windsurf: まず既存シェル要約と source-of-truth 選択を優先し、MCP 連携が使える環境では段階導入する
- Copilot CLI: 機能差があるため、まず既存シェル要約と正本優先探索を使う

## Adoption Boundaries

- `oh-my-codex` は直接依存にしない。doctor、false-green検知、hook mergeの発想だけを参照する
- `anthropics/skills` は重複skillを再輸入しない。`claude-api` のcompaction/prompt cachingとtemplate様式だけを参照する
- `warpdotdev/oz-skills` はWarp/Oz導入ではなく、Agent Skills互換素材として評価する
- 星印記事の削減率は自己申告値として扱い、導入前に一次READMEで確認する

## 応答フォーマット（提案時）

必ず次の 3 要素を含める:

1. 症状: 何が重いか
2. 提案: 何を使うか
3. 代替: 使わない場合の運用回避策

例:

"テスト出力が長く、会話コンテキストを圧迫しています。失敗ケースのみ抽出して要約運用に切り替えます。"

## 非目標

- ツール導入そのものを目的化しない
- すべてのタスクで最適化ツールを強制しない
- 未検証の効果を断定しない
