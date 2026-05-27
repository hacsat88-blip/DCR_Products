---
name: phase-state-artifacts
routing_category: governance
deprecated: true
successor: governance-ops
deprecation_reason: "Folded into governance-ops Decision and Planning lane for OpenAI Skills baseline slimming."
description: "長い開発、複数 phase、複数 IDE/CLI、セッション再開をまたぐ作業で、状態を会話だけに置くと危険なときに使う。人間可読の計画・状態・決定・検証 artifact を残し、Codex以外のモデルでも継続できるようにする。"
contract:
  preconditions:
    - "作業が複数ステップ、複数セッション、または複数 agent にまたがる"
  postconditions:
    - "現在状態、決定、未完了タスク、検証結果が人間可読 artifact に残っている"
    - "次の runtime が同じ作業を再開できる"
  invariants:
    - "状態の正本を生成ミラーや会話履歴だけに置かない"
    - "ユーザーが明示した保持対象を artifact に残す"
composable:
  input_type: state
  output_type: artifact
  chains_with:
    - context-compression
    - strategic-compact
    - repo-boundary-hygiene
metadata:
  origin: gsd-build/get-shit-done
  upstream_url: "https://github.com/gsd-build/get-shit-done"
  upstream_paths:
    - "README.md"
    - "docs/ARCHITECTURE.md"
  related_sources:
    - "https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md"
  upstream_license: "MIT"
  imported_at: "2026-05-11"
  adapted_from: "File-based state artifact pattern and handoff compression; mapped to DCR docs and catalog ownership."
  model_neutral: true
---

# Phase State Artifacts

## 目的

会話コンテキストではなく、repo 内の人間可読 artifact に作業状態を固定する。
DCR では `.planning/` をそのまま導入せず、既存の `docs/dcr/plans/`、`.ai/book/`、`.ai/catalog/` の責務に合わせて置く。

## Artifact Set

| Artifact | DCRでの置き場 | 内容 |
|---|---|---|
| project intent | `docs/dcr/plans/` または既存計画 docs | 目的、成功条件、制約 |
| phase state | `docs/dcr/plans/<topic>.md` | 現在 phase、完了/未完了 |
| decision log | 同じ plan 内の `Decisions` | 採用/棄却と理由 |
| context summary | `Context` / `Handoff` | 次 runtime が読む最小文脈 |
| verification log | `Verification` | 実行コマンド、結果、残リスク |

## 手順

1. 作業が 1 ターンで閉じるかを判定する
2. 閉じない場合、plan artifact を作るか既存 artifact を更新する
3. `Goal / Current state / Decisions / Remaining / Verification` を必須欄にする
4. phase 終了時に artifact を更新する
5. 別モデルや別IDEに渡すときは artifact を正本として読む

## Handoff Compression

別 runtime / 別 session / 別 agent に渡すときは、会話全文を保存しない。
既存 artifact にある情報は複製せず、パスまたは URL で参照する。

handoff に含める:

- 次の session の目的
- 今回の決定と理由
- 未完了タスク
- 参照すべき plan / ADR / issue / diff / test result
- 次に使うべき skill

handoff に含めない:

- 既存 plan、ADR、PRD、issue の全文コピー
- ログ全文、巨大 diff、中間推論
- secret、PII、環境固有 token

## Handoff Template

```markdown
Handoff
- Next focus:
- Current state:
- Decisions:
- References:
- Remaining:
- Suggested skills:
- Verification:
```

## 非目標

- GSD の `.planning/` ディレクトリをそのまま導入しない
- 生成ミラーに状態正本を置かない
- 会話要約だけで長期状態を管理しない

