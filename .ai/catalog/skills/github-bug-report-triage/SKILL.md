---
name: github-bug-report-triage
routing_category: devops
description: "GitHub Issue やPRコメントの不具合報告を、再現性・影響範囲・不足情報・次アクションで仕分ける。CI失敗、外部サービス失敗、ユーザー報告の初動整理に使う。"
contract:
  preconditions:
    - "bug report、CI failure、PR comment、またはユーザーからの不具合説明がある"
  postconditions:
    - "再現可能性、重大度、不足情報、担当可能な次アクションが明確になっている"
    - "調査で読むべき一次情報が列挙されている"
  invariants:
    - "未確認の推測を原因として断定しない"
    - "外部サービスの失敗とrepo内の失敗を分ける"
composable:
  input_type: report
  output_type: triage
  chains_with:
    - systematic-debugging
    - static-analysis
    - dcr-pipeline
metadata:
  origin: warpdotdev/oz-skills
  upstream_url: "https://github.com/warpdotdev/oz-skills"
  upstream_path: ".agents/skills/github-bug-report-triage/SKILL.md"
  license: "MIT"
  imported_at: "2026-05-09"
  adapted_from: "Condensed into a DCR issue/CI triage workflow; not a wholesale external runtime import."
---

# GitHub Bug Report Triage

## 目的

不具合報告を、すぐ直せるもの、再現情報が足りないもの、外部要因のものに分ける。
DCRでは、CIやPRの失敗を見たらまず一次情報を確認し、正本と生成物のどちらに原因があるかを分離する。

## いつ使うか

- GitHub Issue が実行可能なbug reportか判断したい
- PRチェック、CI、外部deploy/statusが失敗している
- ユーザーが「エラーが出ている」とだけ共有した
- 再現手順、期待結果、実際の結果、ログの不足を整理したい

## 手順

1. 報告本文、スクリーンショット、ログ、CI run、PR状態を確認する
2. `expected / actual / repro steps / environment / regression range` を抽出する
3. repo内検証で再現可能か、外部サービス由来かを分ける
4. 重大度を `STOP / FIX / GO` で分類する
5. 不足情報がある場合は、最小の追加質問だけを出す
6. 修正可能なら `systematic-debugging` または `dcr-pipeline` に渡す

## 分類

| Class | 条件 | Action |
|---|---|---|
| actionable | 再現手順と失敗ログがある | 修正または検証へ進む |
| needs-info | 期待結果、環境、再現手順のどれかが欠ける | 追加情報を1-3点だけ依頼 |
| external | Vercel/GitHub/APIなどrepo外ステータスが主因 | 外部状態とrepo検証を分けて報告 |
| duplicate | 既存issue/PRと同じ | 参照先に集約 |
| invalid | 仕様通り、または対象外 | 理由を短く明示 |

## 出力テンプレート

```markdown
BUG TRIAGE
- classification:
- severity:
- evidence:
- missing info:
- next action:
```
