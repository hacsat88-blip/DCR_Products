---
name: harness-audit
routing_category: governance
description: "repo の harness 健全性を監査し、Tool Coverage / Quality Gates / Security / Cost の不足を優先順位付きで可視化する。"
disable-model-invocation: true
contract:
  preconditions:
    - "The request matches this skill's description or routing category."
  postconditions:
    - "The response names the result, reasoning, and verification or handoff path."
  invariants:
    - "Do not treat generated mirrors or runtime caches as DCR source of truth."
composable:
  input_type: task
  output_type: artifact-or-decision
  chains_with:
    - verification-before-completion
runtime_targets:
  - codex
  - claude
  - copilot
  - cursor
  - windsurf
  - opencode
  - gemini-cli
---

# Harness Audit

## 目的

設定・運用の品質を定期点検し、次に直すべきボトルネックを明確化する。

## 監査カテゴリ

- Tool Coverage: 必要 skill/command/rule が揃っているか
- Quality Gates: p/q/sh と verify が運用されているか
- Security Guardrails: セキュリティ監査導線があるか
- Cost Efficiency: モデル使い分け指針があるか
- External Capability Packs: 外部CLI/MCP/skill catalogを正本に混ぜていないか

## 実行手順

1. `skills/`, `rules/`, `.ai/kernel/gates/` を棚卸し
2. 監査結果を PASS/FAIL で記録
3. Top 3 改善アクションを提示
4. 外部候補は `external-capability-intake` に渡し、`skip / concept-import / selective-source-import / immutable-upstream / external-tool-poc` に分類する

## External Capability Audit

| Candidate | Default decision | Check |
|---|---|---|
| github/spec-kit | adopt patterns only | clarify/analyze/checklist/doctor を DCR gate に対応付ける |
| anthropics/skills | selective reference | 重複skillは輸入せず、claude-api/template の設計差分だけ確認 |
| warpdotdev/oz-skills | selective skill import | 外部 runtime は入れず、Agent Skills互換素材だけ採用 |
| oh-my-codex | pattern library | doctor / false-green / hook merge の考え方だけ採用 |
| rohitg00/agentmemory | external-check | runtime memory backend 候補。DCR 正本を置換せず、過去判断 recall と小さな memory_save だけに使う |
| gsd-build/get-shit-done | adopt patterns only | phase/state/decision/verify/wave/namespace pattern のみ DCR skill 化し、GSD runtime と `.planning/` は入れない |
| external Skill/Agent/MCP repo | use external-capability-intake | サトシ開発の共通資産正本へ取り込むか、概念だけ取り込むか、改修不可の外部正本にするかを分類する |
| mattpocock/skills | selective pattern import | grill-with-docs / zoom-out / diagnose / handoff など engineering method だけを DCR skill 化し、skills.sh runtime と setup command は入れない |
| addyosmani/agent-skills | selective reference | lifecycle skill pack として比較し、installer / plugin / slash command / agent persona は入れず、未充足の checklist / workflow 観点だけ採用候補にする |
| colbymchenry/codegraph | external-check | skill 正本ではなく optional MCP / code intelligence tool 候補。`codegraph install --print-config codex` などの非破壊確認と PoC 後に判断する |
| multica-ai/andrej-karpathy-skills | skip / covered-by-existing-policy | 単体 CLAUDE.md は導入せず、Think Before Coding / Simplicity / Surgical Changes / Goal-Driven 原則は既存 AGENTS / kernel / editing constraints でカバーする |
| millionco/react-doctor | selective quality gate | React 専用 diagnostic CLI は Product 単位の advisory gate とし、agent install や root 共通 CI への即導入はしない |
| openai/skills | official baseline | curated/system skills を DCR skill 整理の基準線にし、DCR 固有要素だけ overlay / pipeline / local-only として残す |
| context-mode | external-check | MCP出力オフロードとしてPoC候補、repo正本には混ぜない |
| ccusage / @ccusage/codex | external-check | 使用量可視化候補、導入前にローカルJSONL範囲を確認 |
| oraios/serena | external-check | シンボル探索MCP候補、編集権限と対応言語を確認 |
| post_compact_reminder pattern | adopt pattern only | compaction後の品質維持ルールとして文書化 |

## 出力テンプレート

```markdown
Harness Audit: [score]/100
- Tool Coverage: PASS/FAIL
- Quality Gates: PASS/FAIL
- Security Guardrails: PASS/FAIL
- Cost Efficiency: PASS/FAIL
- External Capability Packs: PASS/FAIL

Top 3 Actions:
1) ...
2) ...
3) ...
```
