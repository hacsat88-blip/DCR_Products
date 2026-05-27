---
name: decision-complete-planning
routing_category: governance
deprecated: true
successor: governance-ops
deprecation_reason: "Folded into governance-ops Decision and Planning lane for OpenAI Skills baseline slimming."
description: "実装前の計画が曖昧で、実装者に判断を残しすぎているときに使う。仕様、制約、未決定事項、検証条件を整理し、どのモデル/IDE/CLIでも同じ実装判断に到達できる Decision Complete な計画へ落とす。"
contract:
  preconditions:
    - "ユーザーの目的、実装対象、または計画したい phase がある"
  postconditions:
    - "実装者に残る設計判断が明示的にゼロ、または承認待ちとして隔離されている"
    - "受け入れ条件、検証コマンド、変更対象、非対象が明確になっている"
  invariants:
    - "特定モデルの挙動やツール名に依存しない"
    - "未決定事項を reasonable default として勝手に埋めない"
composable:
  input_type: intent
  output_type: plan
  chains_with:
    - writing-plans
    - user-interview
    - verification-before-completion
metadata:
  origin: gsd-build/get-shit-done
  upstream_url: "https://github.com/gsd-build/get-shit-done"
  upstream_paths:
    - "README.md"
    - "docs/ARCHITECTURE.md"
    - "docs/USER-GUIDE.md"
  upstream_license: "MIT"
  imported_at: "2026-05-11"
  adapted_from: "Decision Complete planning pattern; no GSD runtime, commands, or .planning directory imported."
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

# Decision Complete Planning

## 目的

実装者に「あとで考えておいて」を残さない計画を作る。
モデルごとの得意不得意に寄せず、どの agent / IDE / CLI が読んでも同じ判断に着地できる状態を目指す。

## Decision Complete の条件

計画は次を満たすまで完了扱いにしない。

- 目的: 何を達成するか
- 対象: どのファイル、機能、経路を触るか
- 非対象: 今回やらないこと
- 制約: 既存方針、安全境界、互換性
- 判断: 設計選択と理由
- 未決定: ユーザー承認が必要なものだけを分離
- 検証: 成功を証明するコマンドまたは観察
- 失敗時: rollback / retry / defer の扱い

## 手順

1. ユーザー目的を 1 文に圧縮する
2. 実装者が迷いそうな判断点を列挙する
3. 既存 repo pattern から決められるものは根拠付きで決める
4. 決められないものは `Open Questions` に隔離する
5. 実装 plan を task 単位に分け、各 task に検証を付ける
6. 「この plan だけで実装できるか」を最後に probe する

## モデル非依存の書き方

- 長い手順ではなく、短い原則 + 具体的な decision table にする
- Claude / GPT / Gemini / OSS model の名前を前提にしない
- ツール名ではなく required capability を書く
- subagent が使えない環境では、同じ task を逐次実行できる形にする

## Output Template

```markdown
DECISION COMPLETE PLAN
- Goal:
- Scope:
- Non-goals:
- Constraints:
- Decisions:
- Open questions:
- Tasks:
- Verification:
- Recovery:
```

