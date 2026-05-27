---
name: context-compression
routing_category: governance
deprecated: true
successor: governance-ops
deprecation_reason: "Folded into governance-ops Agent Load and Context lane for OpenAI Skills baseline slimming."
description: "長時間セッション、巨大コードベース探索、複数 agent の結果統合、引き継ぎ前に、会話や作業履歴を圧縮する必要があるときに使う。要約でファイル履歴、意思決定、検証結果、未完了タスクを落としたくない場面では必ず候補に入れる。"
contract:
  preconditions:
    - "圧縮したい会話、調査結果、実装履歴、または agent 出力がある"
  postconditions:
    - "継続に必要な artifact trail と decision trail が保持されている"
    - "再取得コストを増やす過圧縮が避けられている"
  invariants:
    - "tokens-per-request ではなく tokens-per-task を最適化する"
    - "触ったファイル、未完了作業、検証結果を落とさない"
composable:
  input_type: context
  output_type: summary
  chains_with:
    - strategic-compact
    - context-degradation
    - verification-before-completion
metadata:
  origin: antigravity-awesome-skills
  upstream_url: "https://github.com/sickn33/antigravity-awesome-skills"
  upstream_path: "skills/context-compression/SKILL.md"
  license: "CC-BY-4.0 content / MIT repository code; adapted summary"
  upstream_source: "Agent Skills for Context Engineering Contributors"
  upstream_version: "1.1.0"
  upstream_last_updated: "2025-12-26"
  source_notice: "Adapted from upstream concepts and headings; no verbatim wholesale import."
  imported_at: "2026-05-06"
  adapted_from: "Condensed into a DCR reinforcement skill; not a wholesale import."
---

# Context Compression

## 目的

会話や調査結果を短くしながら、次の agent や次ターンが本当に必要とする作業状態を残す。
圧縮率だけを追わず、再探索や再説明を増やさないことを優先する。

## 残すべき項目

```markdown
## Current Goal
ユーザーが達成したいこと。

## Verified Facts
確認済みの事実、出典、コマンド結果。

## Files Touched
- path: read/modified/created/deleted と要点

## Decisions
採用した方針、棄却した方針、理由。

## Remaining Work
次にやること、ブロッカー、検証コマンド。

## Do Not Touch
明示的に保持する成果物やユーザー変更。
```

## 圧縮手順

1. まず目的と未完了状態を先頭に置く
2. ファイル履歴は `read / modified / created / deleted` を分ける
3. 古い候補、棄却案、ノイズログは結論だけにする
4. 未検証の推測は `Assumption` として分ける
5. 圧縮後に「この要約だけで続行できるか」を probe する

## Probe

圧縮品質は次の質問に答えられるかで見る。

- 何を達成中か
- どのファイルを触ったか
- なぜその方針か
- 何が未検証か
- 次に実行すべき検証は何か
