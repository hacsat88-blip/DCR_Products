---
name: rules-distill
description: "複数 skill に分散した実践知を抽出し、rule に昇格すべき原則を特定する。what と how の境界を維持する。"
---

# Rules Distill

## 目的

skill が増えるほど重複や知識散逸が起こるため、共通原則を rule へ昇格する。

## 昇格条件

- 2つ以上の skill に同種パターンがある
- ルール違反時のリスクが明確
- 実装手順ではなく原則として記述できる

## 非昇格条件

- 単一フレームワーク限定の How
- ツール固有の CLI 手順
- 文脈依存で一般化できない知見

## 出力

```markdown
Rule Candidate
- principle: ...
- evidence_skills: [a, b, c]
- risk_if_missing: ...
- recommendation: Promote | Keep in skill
```
