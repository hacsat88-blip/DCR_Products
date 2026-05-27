---
name: docs-update
routing_category: documents
deprecated: true
successor: documents-ops
deprecation_reason: "Folded into documents-ops Docs and Governance lane for OpenAI Skills baseline slimming."
description: "コード、設定、運用フローの変更に合わせてユーザー向けドキュメントとDCR正本を同期する。README、運用手順、生成ミラーの説明が実装からずれた可能性があるときに使う。"
contract:
  preconditions:
    - "コード、設定、workflow、skill、agent、または運用手順に変更がある"
  postconditions:
    - "更新が必要なドキュメント、不要なドキュメント、保留理由が分かれている"
    - "source-of-truth と generated mirror のどちらを更新するかが明確になっている"
  invariants:
    - "generated mirror を直接の正本として編集しない"
    - "コード変更がないのに不要な説明文を増やさない"
composable:
  input_type: diff
  output_type: docs-plan
  chains_with:
    - repo-boundary-hygiene
    - dcr-pipeline
    - verification-before-completion
metadata:
  origin: warpdotdev/oz-skills
  upstream_url: "https://github.com/warpdotdev/oz-skills"
  upstream_path: ".agents/skills/docs-update/SKILL.md"
  license: "MIT"
  imported_at: "2026-05-09"
  adapted_from: "Condensed into a DCR documentation synchronization workflow; not a wholesale external runtime import."
---

# Docs Update

## 目的

実装差分に追随して、ユーザーが読むドキュメント、運用手順、DCR正本の説明を古くしない。
このskillは「書くべきドキュメント」を見つけるためのもので、生成ミラーを正本化しない。

## いつ使うか

- public behavior、CLI、workflow、adapter、validation、deployment の動きが変わった
- `.ai/catalog/skills/`、`.ai/catalog/agents-source/`、`.ai/kernel/` の意味が変わった
- README、AGENTS、CLAUDE、Copilot instructions、Cursor/Windsurf mirror の記述がずれそう
- PRやリリース前に、コード変更とドキュメント変更の対応を確認したい

## 手順

1. `git diff --name-only` で変更範囲を確認する
2. 変更を `user-facing / operator-facing / internal-only / generated` に分類する
3. 正本ドキュメントを先に更新する
4. generated mirror は `deploy.ps1 -Check` または deploy で整合確認する
5. 不要なドキュメント更新は理由付きでスキップする
6. 最後に、更新した文書と未更新でよい文書を短く報告する

## 判定表

| Change | Docs action |
|---|---|
| CLI/API/command behavior | README or operator docs を更新 |
| DCR routing/skill/agent behavior | `.ai/catalog/` または `.ai/module/` の正本を更新 |
| Generated mirror drift | 正本を確認し、deploy/check で再生成判断 |
| Internal refactor only | 原則 docs 変更不要 |
| External capability policy | kernel/module/skill のいずれかに境界を記録 |

## 出力テンプレート

```markdown
DOCS UPDATE
- source changes:
- docs updated:
- docs intentionally unchanged:
- generated mirror action:
- verification:
```
