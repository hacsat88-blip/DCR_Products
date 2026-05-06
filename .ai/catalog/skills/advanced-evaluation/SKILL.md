---
name: advanced-evaluation
routing_category: governance
description: "LLM-as-judge、pairwise comparison、rubric generation、評価バイアス対策、複数モデル比較、品質スコアリングの設計が必要なときに使う。単純な validate では測れない出力品質を評価するときに使う。"
contract:
  preconditions:
    - "評価対象の出力、比較候補、または rubric 化したい品質基準がある"
  postconditions:
    - "direct scoring / pairwise / reference-based の方式が選ばれている"
    - "bias mitigation と confidence の扱いが定義されている"
  invariants:
    - "score だけを出さず、根拠と confidence を一緒に残す"
    - "pairwise comparison は可能な限り位置入れ替えで確認する"
composable:
  input_type: output
  output_type: rubric
  chains_with:
    - agent-evaluation
    - eval-harness
    - structured-output
metadata:
  origin: antigravity-awesome-skills
  upstream_url: "https://github.com/sickn33/antigravity-awesome-skills"
  upstream_path: "skills/advanced-evaluation/SKILL.md"
  license: "CC-BY-4.0 content / MIT repository code; adapted summary"
  imported_at: "2026-05-06"
  adapted_from: "Condensed into a DCR reinforcement skill; not a wholesale import."
---

# Advanced Evaluation

## 目的

LLM 出力の品質を、単純な成功/失敗ではなく rubric と bias 対策込みで評価する。
自動評価を信じすぎず、人間判断や既存検証と合わせて使う。

## 方式選択

| Method | 向く場面 | 注意 |
|---|---|---|
| direct scoring | factual accuracy、format、instruction following | scale drift を避けるため rubric を細かくする |
| pairwise comparison | tone、clarity、preference | position bias を避けるため左右を入れ替える |
| reference-based | 要約、翻訳、抽出 | reference 自体の品質を確認する |
| human-in-the-loop | high-stakes、曖昧判断 | low confidence だけ人に回す |

## Rubric

rubric は次を含める。

- criterion name
- what it measures
- score scale
- examples or edge cases
- required evidence
- confidence policy

## Bias Mitigation

- position bias: A/B の順序を入れ替える
- length bias: 長さではなく基準への一致を見る
- verbosity bias: 余計な説明を加点しない
- self-enhancement bias: 生成モデルと評価モデルを分ける
- authority bias: 根拠なしの断定を高評価にしない

## 出力

```markdown
EVALUATION DESIGN
- method:
- rubric:
- bias controls:
- confidence:
- escalation:
- validation:
```

