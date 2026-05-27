---
name: static-analysis
routing_category: devops
deprecated: true
successor: dcr-pipeline
deprecation_reason: "Folded into dcr-pipeline q/ Static Gate for OpenAI Skills baseline slimming."
description: "コードや設定を実行せずに解析し、lint、型、依存、危険パターン、生成物と正本の混在を確認したいときに使う。実装後の軽量 QA、セキュリティ前段、Semgrep ルール適用前の棚卸しで使う。"
contract:
  preconditions:
    - "解析対象のファイル、言語、設定、または変更範囲が分かっている"
  postconditions:
    - "実行した静的解析コマンド、検出結果、対応優先度が残っている"
    - "generated path と source-of-truth path が混同されていない"
  invariants:
    - "静的解析結果を実行時テストの代替にしない"
    - "検出結果は false positive と exploitability を分けて扱う"
composable:
  input_type: code
  output_type: findings
  chains_with:
    - security-scan
    - repo-boundary-hygiene
    - verification-before-completion
metadata:
  origin: antigravity-awesome-skills
  upstream_url: "https://github.com/sickn33/antigravity-awesome-skills"
  upstream_path: "skills/static-analysis/SKILL.md"
  license: "CC-BY-4.0 content / MIT repository code; adapted summary"
  upstream_source: "antigravity-awesome-skills skill catalog"
  upstream_version: "not captured"
  upstream_last_updated: "not captured"
  source_notice: "Adapted as a DCR-local summary; inspect upstream_path before expanding or copying source text."
  imported_at: "2026-05-06"
  adapted_from: "Condensed into a DCR reinforcement skill; not a wholesale import."
---

# Static Analysis

## 目的

コードを実行せず、構文、型、依存、危険なパターン、設定の不整合を早めに見つける。
DCR では source-of-truth と generated mirror を分け、正本に対して解析や修正を行う。

## 見る項目

- lint / format / typecheck
- dependency and license risk
- secrets and credential patterns
- injection-prone string construction
- unsafe shell or filesystem operations
- generated mirror drift
- config path that points to removed products

## 手順

1. 変更範囲を `git diff --name-only` や検索で把握する
2. generated mirror を除外し、必要なら最後に drift check で見る
3. 言語ごとの既存コマンドを優先する
4. 重大度を `critical / high / medium / info` に分ける
5. false positive は理由を残して閉じる
6. 修正後に `validate.ps1`、test、build の少なくとも該当するものを実行する

## 出力テンプレート

```markdown
STATIC ANALYSIS
- scope:
- commands:
- findings:
- false positives:
- required fixes:
- verification:
```
