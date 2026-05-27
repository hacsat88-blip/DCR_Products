---
name: agent-evaluation
routing_category: governance
deprecated: true
successor: governance-ops
deprecation_reason: "Folded into governance-ops Evaluation lane for OpenAI Skills baseline slimming."
description: "agent、skill、routing、tool-use の品質を評価したいときに使う。単発の印象ではなく、行動契約、回帰、ばらつき、実運用サンプルで agent の信頼性を測る必要がある場面で使う。"
contract:
  preconditions:
    - "評価対象の agent、skill、routing decision、または tool workflow がある"
  postconditions:
    - "評価観点、fixture、合格条件、残リスクが定義されている"
    - "必要なら eval-harness または routing accuracy eval に接続されている"
  invariants:
    - "単発成功を安定性の証拠にしない"
    - "本番に近い入力、失敗例、境界例を含める"
composable:
  input_type: behavior
  output_type: eval-plan
  chains_with:
    - eval-harness
    - verification-before-completion
metadata:
  origin: antigravity-awesome-skills
  upstream_url: "https://github.com/sickn33/antigravity-awesome-skills"
  upstream_path: "skills/agent-evaluation/SKILL.md"
  license: "CC-BY-4.0 content / MIT repository code; adapted summary"
  upstream_source: "antigravity-awesome-skills skill catalog"
  upstream_version: "not captured"
  upstream_last_updated: "not captured"
  source_notice: "Adapted as a DCR-local summary; inspect upstream_path before expanding or copying source text."
  imported_at: "2026-05-06"
  adapted_from: "Condensed into a DCR reinforcement skill; not a wholesale import."
---

# Agent Evaluation

## 目的

agent や skill の「使えそう」を、再現可能な評価に変える。
この skill は `eval-harness` の前段として、何を測るべきかを決める。

## 評価軸

| Axis | 見るもの |
|---|---|
| correctness | 期待した作業結果に到達するか |
| reliability | 複数回で結果が大きくぶれないか |
| boundary | やってはいけないことをしないか |
| tool discipline | 必要な tool を選び、不要な tool を避けるか |
| artifact trail | 触ったファイル、根拠、検証結果を残すか |

## 手順

1. 対象 agent/skill の責務を 1 文で定義する
2. must / must not の behavioral contract を書く
3. 代表例、境界例、失敗しやすい例を 3-5 件作る
4. 合格基準を pass/fail または score で定義する
5. stochastic な出力は複数回実行か、人手確認の閾値を決める
6. 既存 repo なら `tools/eval-routing-accuracy.ps1` や `validate.ps1` に接続する

## 出力テンプレート

```markdown
AGENT EVAL
- target:
- contract:
- fixtures:
- pass criteria:
- known risks:
- verification command:
```
