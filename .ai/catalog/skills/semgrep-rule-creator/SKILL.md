---
name: semgrep-rule-creator
routing_category: devops
description: "Semgrep ルールを新規作成、改善、テストしたいときに使う。危険パターンを grep ではなく構文ベースで検出したい、positive/negative fixture を用意したい、既存 security-scan を具体ルール化したい場面で使う。"
contract:
  preconditions:
    - "検出したいコードパターン、対象言語、許容する false positive の目安がある"
  postconditions:
    - "Semgrep rule、positive fixture、negative fixture、実行コマンドが揃っている"
    - "検出意図と限界がドキュメント化されている"
  invariants:
    - "grep 的な文字列一致で済ませず、AST パターンを優先する"
    - "positive と negative の両方を必ず用意する"
composable:
  input_type: code
  output_type: rule
  chains_with:
    - dcr-pipeline
    - security-scan
    - verification-before-completion
metadata:
  origin: antigravity-awesome-skills
  upstream_url: "https://github.com/sickn33/antigravity-awesome-skills"
  upstream_path: "skills/semgrep-rule-creator/SKILL.md"
  license: "CC-BY-4.0 content / MIT repository code; adapted summary"
  upstream_source: "antigravity-awesome-skills skill catalog"
  upstream_version: "not captured"
  upstream_last_updated: "not captured"
  source_notice: "Adapted as a DCR-local summary; inspect upstream_path before expanding or copying source text."
  imported_at: "2026-05-06"
  adapted_from: "Condensed into a DCR reinforcement skill; not a wholesale import."
runtime_targets:
  - codex
  - claude
  - cursor
---

# Semgrep Rule Creator

## 目的

セキュリティや品質の危険パターンを、再利用可能な Semgrep ルールに落とす。
この skill は `security-scan` の検出観点を、実行できる静的解析へ具体化するために使う。

## ルール作成手順

1. 検出したい危険を 1 文で書く
2. 対象言語、対象 framework、除外したい安全パターンを決める
3. 最小の positive fixture を 1-3 件作る
4. false positive を避ける negative fixture を 1-3 件作る
5. `pattern`、`pattern-either`、`pattern-not`、`metavariable-pattern` を選ぶ
6. `semgrep --test` または同等の既存検証で確認する
7. severity、message、metadata に判断根拠を残す

## Rule Skeleton

```yaml
rules:
  - id: dcr.example-risk
    languages: [python]
    severity: WARNING
    message: "Explain the concrete risk and safer alternative."
    patterns:
      - pattern: dangerous_call(...)
      - pattern-not: safe_wrapper(...)
    metadata:
      category: security
      confidence: medium
```

## 注意

- ルールは広すぎると運用されなくなる
- 最初は狭く当て、実例で広げる
- secret、shell、filesystem、template injection は `security-scan` と合わせて扱う
- CI に入れる前に false positive の扱いを決める
