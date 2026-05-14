---
name: context-optimization
routing_category: governance
description: "repo 探索、ログ確認、外部カタログ比較、長い設計レビューで、読み込む情報を減らしつつ判断精度を保ちたいときに使う。compaction、masking、caching、just-in-time loading、generated mirror の除外を選ぶ場面で使う。"
contract:
  preconditions:
    - "調査対象が広い、出力が長い、または generated mirror がノイズになっている"
  postconditions:
    - "読む範囲、読み飛ばす範囲、後で参照する範囲が決まっている"
    - "必要最小の source-of-truth から判断できている"
  invariants:
    - "generated mirror を正本として読まない"
    - "重要な根拠は検索ヒット数ではなく source quality で判断する"
composable:
  input_type: context
  output_type: plan
  chains_with:
    - search-first
    - repo-boundary-hygiene
    - token-efficiency-advisor
metadata:
  origin: antigravity-awesome-skills
  upstream_url: "https://github.com/sickn33/antigravity-awesome-skills"
  upstream_path: "skills/context-optimization/SKILL.md"
  license: "CC-BY-4.0 content / MIT repository code; adapted summary"
  upstream_source: "antigravity-awesome-skills skill catalog"
  upstream_version: "not captured"
  upstream_last_updated: "not captured"
  source_notice: "Adapted as a DCR-local summary; inspect upstream_path before expanding or copying source text."
  imported_at: "2026-05-06"
  adapted_from: "Condensed into a DCR reinforcement skill; not a wholesale import."
---

# Context Optimization

## 目的

大きな情報空間をそのまま会話に入れず、必要な根拠だけを段階的に読む。
DCR では `.ai/catalog/`、`.ai/book/`、`.ai/kernel/`、deploy/adapters を優先し、生成ミラーは整合確認の対象として扱う。

## Techniques

| Technique | 使う場面 | DCRでの例 |
|---|---|---|
| select | 正本だけを先に読む | `.ai/catalog/skills/*/SKILL.md` |
| mask | 長い出力の不要部分を捨てる | build/test の成功行を要約する |
| compress | 継続に必要な履歴だけ残す | `context-compression` へ渡す |
| cache | 再読が高い情報を短いメモにする | 決定表、触ったファイル一覧 |
| isolate | タスクが混ざる前に分ける | agent 評価と静的解析を別 pass にする |
| offload | raw tool outputを会話に入れない | context-mode / Serena を外部候補として検討 |

## 手順

1. 判断に必要な問いを 1 つに絞る
2. source-of-truth、runtime config、generated mirror を分類する
3. まず source-of-truth だけを読む
4. 生成物は deploy/check の証拠として確認する
5. 長い出力は失敗箇所、差分、要約だけを残す
6. 読み込んだ根拠と未読の範囲を明示する

## External Candidates

星印記事の候補は自己申告値を含むため、導入前に各READMEで再検証する。

| Candidate | Use when | DCR stance |
|---|---|---|
| context-mode | MCP/Web/Playwright/GitHub API出力が重い | 外部MCP PoC候補。正本には混ぜない |
| ccusage / @ccusage/codex | 使用量やコストを可視化したい | 外部可視化ツール。削減ではなく判断材料 |
| Serena | 大規模コードのsymbol探索が必要 | 外部MCP PoC候補。編集権限は慎重に扱う |
| post_compact_reminder pattern | compaction後に判断品質が落ちる | ルール/skill文面へパターンだけ採用 |

## 避けること

- repo 全体を無差別に読み込む
- 生成ミラーの差分だけで正本を直す
- 長いログを全文保持して、現在の目的を埋もれさせる
- 既に十分な local pattern があるのに外部カタログを丸ごと移植する
