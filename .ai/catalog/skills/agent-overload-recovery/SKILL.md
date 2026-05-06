---
name: agent-overload-recovery
routing_category: governance
description: "候補 agent / skill / tool が多すぎてルーティングが散る、複数 agent の出力が衝突する、pied-piper の判断前後で役割過多になっているときに使う。単体 agent の追加ではなく、前後に挟む補助役へ戻すための回復スキル。"
contract:
  preconditions:
    - "複数 agent、skill、tool、外部カタログ候補が同時に検討されている"
  postconditions:
    - "primary agent と補助 insert が分離されている"
    - "同時採用数と順序が制限されている"
    - "過剰な候補が defer または discard されている"
  invariants:
    - "pied-piper を単一入口として維持する"
    - "新候補を coordinator として重複させない"
composable:
  input_type: routing
  output_type: decision
  chains_with:
    - unified-router
    - parallel-agent-patterns
    - token-efficiency-advisor
metadata:
  origin: antigravity-awesome-skills
  upstream_url: "https://github.com/sickn33/antigravity-awesome-skills"
  upstream_path: "skills/agent-overload-recovery/SKILL.md"
  license: "CC-BY-4.0 content / MIT repository code; adapted summary"
  imported_at: "2026-05-06"
  adapted_from: "Condensed into a DCR reinforcement skill; not a wholesale import."
---

# Agent Overload Recovery

## 目的

候補が増えすぎたときに、司令塔を増やすのではなく役割を戻す。
この repo では `pied-piper` が coordinator であり、追加 agent/skill は primary の前後に挟む insert として扱う。

## 症状

- 候補が多く、どれを使うべきか説明が長くなる
- 同じ責務の agent が複数いる
- 評価、調査、実装、検証が同時に走って出力が衝突する
- 外部カタログを見た後に「全部よさそう」に見える

## Recovery

1. 現在の主目的を 1 行に戻す
2. primary agent は最大 1 つ、補助 insert は最大 2 つに絞る
3. 各候補を `before / during / after / discard` に分類する
4. coordinator になろうとする候補は discard または helper 化する
5. 実行順を決めてから作業に戻る

## Decision Table

| Class | 採用条件 |
|---|---|
| before | 調査、前提確認、context 整理に効く |
| during | 実装中の専門判断に必要 |
| after | QA、評価、証跡、性能確認に効く |
| discard | 既存 skill/agent と責務が重複する |

