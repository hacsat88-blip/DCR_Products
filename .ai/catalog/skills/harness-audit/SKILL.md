---
name: harness-audit
routing_category: governance
description: "repo の harness 健全性を監査し、Tool Coverage / Quality Gates / Security / Cost の不足を優先順位付きで可視化する。"
disable-model-invocation: true
---

# Harness Audit

## 目的

設定・運用の品質を定期点検し、次に直すべきボトルネックを明確化する。

## 監査カテゴリ

- Tool Coverage: 必要 skill/command/rule が揃っているか
- Quality Gates: p/q/sh と verify が運用されているか
- Security Guardrails: セキュリティ監査導線があるか
- Cost Efficiency: モデル使い分け指針があるか

## 実行手順

1. `skills/`, `rules/`, `.ai/kernel/gates/` を棚卸し
2. 監査結果を PASS/FAIL で記録
3. Top 3 改善アクションを提示

## 出力テンプレート

```markdown
Harness Audit: [score]/100
- Tool Coverage: PASS/FAIL
- Quality Gates: PASS/FAIL
- Security Guardrails: PASS/FAIL
- Cost Efficiency: PASS/FAIL

Top 3 Actions:
1) ...
2) ...
3) ...
```
