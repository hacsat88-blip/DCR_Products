---
name: architecture-zoom-out
routing_category: devops
description: "初見領域や影響範囲が読みにくい変更の前に、局所ファイルだけでなく一段上のモジュール地図・呼び出し元・用語・正本/生成物境界を整理する。zoom-out 型の全体把握を、Codex以外のCLI/IDEでも読める短い map として出す。"
contract:
  preconditions:
    - "変更対象の周辺構造、呼び出し元、所有境界、または用語が不明"
    - "局所修正だけで進めると、正本/生成物境界や影響範囲を誤る可能性がある"
  postconditions:
    - "関連モジュール、呼び出し元、データ/制御フロー、正本境界、検証入口が短い map に整理されている"
  invariants:
    - "実装前の地図づくりに徹し、不要なリファクタを始めない"
    - "生成ミラーや runtime cache を正本として扱わない"
    - "特定IDEの機能名ではなく、ファイル・コマンド・artifactで説明する"
composable:
  input_type: codebase-area
  output_type: architecture-map
  chains_with:
    - improve-codebase-architecture
    - repo-boundary-hygiene
    - context-optimization
    - code-review
metadata:
  origin: mattpocock/skills
  upstream_url: "https://github.com/mattpocock/skills"
  upstream_paths:
    - "skills/engineering/zoom-out/SKILL.md"
  upstream_license: "MIT"
  imported_at: "2026-05-16"
  adapted_from: "zoom-out pattern; no skills.sh installer or slash command imported."
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

# Architecture Zoom Out

## 目的

初見領域や影響範囲が読みにくい変更で、いきなり局所ファイルを直さない。
一段上の構造、呼び出し元、用語、正本/生成物境界を短く整理してから次の skill に渡す。

## Natural Language Triggers

- 「このあたりよくわからない」「一段上から見て」
- 「影響範囲を見て」「どこを触るべき？」
- 「このファイルは正本？生成物？」「消していい？」
- レビュー前に、変更が局所最適になっていないか確認したい

## 調査観点

1. Entry points: どこから呼ばれるか
2. Ownership: どの層/機能が責務を持つか
3. Source of truth: 正本、生成物、runtime cache、個人設定のどれか
4. Data/control flow: 入力、出力、副作用、永続化
5. Vocabulary: repo 内 docs と実装で同じ言葉を使っているか
6. Verification: どのコマンド、テスト、画面、ログで安全確認できるか

## Output Template

```markdown
Architecture Zoom Out
- Area:
- Entry points:
- Callers / consumers:
- Source-of-truth boundary:
- Key terms:
- Risks:
- Recommended next skill:
- Verification entry:
```

## 次に渡す先

| 状況 | Next skill |
|---|---|
| 構造改善が必要 | `improve-codebase-architecture` |
| 正本/生成物境界が怪しい | `repo-boundary-hygiene` |
| 読み込み対象が多すぎる | `context-optimization` |
| レビュー前の整理 | `code-review` |

## 非目標

- 地図作成中にリファクタを始める
- 影響範囲未確認のままファイル削除する
- IDE 固有の説明だけで終わる
