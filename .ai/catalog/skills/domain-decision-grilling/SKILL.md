---
name: domain-decision-grilling
routing_category: governance
description: "実装前の計画や外部候補が曖昧なとき、ユーザーに長い仕様文を書かせず、既存コード・用語・ADR・過去判断を照合しながら一問ずつ判断を固める。grill-with-docs 型の質問設計を DCR の .ai/book / docs / ADR 運用へ薄く適用する。"
contract:
  preconditions:
    - "実装前の目的、用語、対象範囲、または採用判断に曖昧さがある"
    - "コードベースや既存 docs を読めば一部の問いを agent 側で解ける"
  postconditions:
    - "未決定事項が、ユーザー確認が必要な問いと repo から解決済みの判断に分離されている"
    - "用語、ADR候補、採用/非採用理由が必要最小限の artifact に残る"
  invariants:
    - "ユーザーに聞く前に、repo 内の正本・実装・過去判断で答えられることを確認する"
    - "一度に大量質問せず、依存関係が強い判断から一問ずつ解く"
    - "CONTEXT.md 固定ではなく、この repo の .ai/book、docs/dcr、ADR、Product docs に合わせる"
composable:
  input_type: intent
  output_type: decision-questions
  chains_with:
    - user-interview
    - adr-management
    - decision-complete-planning
    - agent-memory-design
metadata:
  origin: mattpocock/skills
  upstream_url: "https://github.com/mattpocock/skills"
  upstream_paths:
    - "skills/engineering/grill-with-docs/SKILL.md"
    - "CONTEXT.md"
  upstream_license: "MIT"
  imported_at: "2026-05-16"
  adapted_from: "grill-with-docs pattern; no skills.sh installer, slash command, or repo-specific CONTEXT.md convention imported."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - copilot
    - cursor
    - windsurf
    - opencode
    - gemini-cli
---

# Domain Decision Grilling

## 目的

曖昧な計画を、既存の用語・実装・ADR・過去判断に照らして、実装可能な判断へ落とす。
これは `pied-piper` の置換ではなく、plan / pre-impl / external adoption review の前段に挟む質問スキルである。

## Natural Language Triggers

- 「これどう？」「入れる価値ある？」「サトシ開発目線で」
- 「前と同じ観点で」「過去判断も踏まえて」
- 「この設計で進めてよい？」「仕様が曖昧か見て」
- 外部 skill / agent / MCP / runtime wrapper の採用相談
- 実装前に用語、責務、境界、非対象が曖昧なとき

## 手順

1. ユーザー目的を1文にする
2. `agent-memory-design` の Runtime Memory Preflight が必要か判定する
3. `.ai/book`、`.ai/catalog`、docs、Product docs、ADR、該当コードを確認する
4. repo から答えられる問いは agent 側で解く
5. 残った判断だけを、依存関係が強い順に一問ずつ聞く
6. 用語が曖昧なら、既存 glossary / docs / code の表現と衝突していないか確認する
7. 決定が hard-to-reverse / surprising / trade-off の3条件を満たす場合だけ ADR 候補にする

## 質問の作り方

| 状況 | 質問 |
|---|---|
| 用語が曖昧 | 「ここでいう X は既存 docs の A と B のどちらですか？」 |
| 既存実装と発言が矛盾 | 「コードでは X ですが、今回の意図は Y ですか？」 |
| 外部候補が広すぎる | 「置換ではなく補強なら、どの失敗モードを埋めたいですか？」 |
| 判断が reversible | 「これは ADR ではなく plan の決定ログで十分です。異論ありますか？」 |
| repo から解ける | ユーザーに聞かず、根拠ファイルを示して判断する |

## Output

```markdown
Decision Grilling
- Goal:
- Existing language / docs checked:
- Repo-resolved decisions:
- User questions:
- ADR candidates:
- Next skill:
```

## 非目標

- ユーザーに長い質問リストを投げる
- 既存 docs を読まずに抽象論だけで質問する
- `CONTEXT.md` を DCR の正本として固定する
- 外部 repo の手順や installer をそのまま導入する
