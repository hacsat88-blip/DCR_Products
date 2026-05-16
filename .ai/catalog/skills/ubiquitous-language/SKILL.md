---
name: ubiquitous-language
routing_category: documents
description: "会話・docs・コードに散らばっているドメイン用語を抽出し、DDD のユビキタス言語用語集として統一する。同じ語が repo 内で複数の意味で使われている『language drift』を検出し、glossary を .ai/book / docs に正本化する。コード生成前にドメイン語彙を固定することで、agent と人間が同じ言葉でやり取りできるようにする。"
contract:
  preconditions:
    - "ドメイン用語が会話、コメント、変数名、docs に複数登場している"
    - "用語の意味揺れ、別名、訳語不統一が疑われる、または既に痛みになっている"
  postconditions:
    - "用語集に candidate term / canonical name / definition / 反例 / 関連用語 が記録されている"
    - "drift 検出結果（同義異名 / 異義同名）が明示されている"
    - "正本の置き場所（.ai/book / docs / ADR / コード）が決まっている"
  invariants:
    - "用語の意味は repo 内のコード・docs・過去判断から逆算する。agent の想像で埋めない"
    - "英訳と和訳の両方を持つ用語は両方を canonical 候補として残す"
    - "1 用語 1 意味の DDD 原則を守る。多義になった場合は文脈別に分割する"
composable:
  input_type: domain-corpus
  output_type: glossary
  chains_with:
    - domain-decision-grilling
    - decision-complete-planning
    - adr-management
    - docs-update
metadata:
  origin: mattpocock/skills
  upstream_url: "https://github.com/mattpocock/skills"
  upstream_paths:
    - "skills/engineering/ubiquitous-language/SKILL.md"
  upstream_license: "MIT"
  imported_at: "2026-05-16"
  adapted_from: "ubiquitous-language pattern; output destination changed from CONTEXT.md to this repo's .ai/book / docs convention. Bilingual (JP/EN) glossary support added because DCR docs mix Japanese domain terms with English code identifiers."
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

# Ubiquitous Language

## 目的

ドメイン語彙を repo 内で 1 用語 1 意味に正本化する。
コード（identifier）・docs（自然言語）・会話（チャット履歴）で**同じ語が違う意味**になっている、または**違う語が同じ意味**になっている状態を解消し、agent と人間の理解ズレを防ぐ。

DCR のような JP/EN 混在環境では特に「order = 注文 / 順序」「position = ポジション（金融）/ 位置（UI）」のような多義語が起きやすい。

## Natural Language Triggers

- 「用語を整理したい」「glossary 作って」
- 「これ position って 2 つの意味で使われてる」
- 新規ドメインに踏み込む前（自動売買、金融、医療等）
- ADR や PRD を書く前で語彙が固まっていない
- コードレビューで「この変数名どっちの意味？」が頻発

## 適用しない場面

- 用語が 1〜2 個しかない局所的タスク
- 既に `_glossary.md` 等で正本化済みで drift もないとき
- 単純な typo / 命名修正（リファクタで十分）

## 手順

### Step 1: コーパス収集

- 対象範囲（モジュール / リポジトリ / 機能）を決める
- 抽出ソースを集める：
  - コード：型名、関数名、変数名、コメント
  - docs：`.ai/book/`、`docs/`、README、ADR
  - 会話：直近の意思決定ログ、PR description
  - 過去判断：runtime memory が使えるなら検索

### Step 2: 候補語抽出

頻度と分散の両方が高い語を候補とする：

- 出現頻度 ≥ 3
- 出現箇所が 2 種類以上（例：コードと docs の両方）

抽出は agent が実行：grep / ripgrep ベースで名詞・複合語を拾う。

### Step 3: drift 検出

| パターン | 例 |
|---|---|
| 同義異名 | `order` / `注文` / `エントリー` が同一概念 |
| 異義同名 | `position` がポジション（金融）と UI 座標で両用 |
| 訳語不統一 | `signal` / `シグナル` / `合図` の混在 |
| 単複・時制揺れ | `User` / `Users`, `submit` / `submitted` |

各 drift について **どちらを canonical にするか**を決める。

### Step 4: 用語定義

各 canonical 用語に対し：

```yaml
term: Order
canonical_jp: 注文
definition: "ユーザーが発行する売買指示の単位。約定 (Execution) とは区別する。"
not: "約定済みの取引 (= Execution)、ポジション (= Position) ではない"
related: [Execution, Position, Signal]
examples_in_repo:
  - "src/autotrader/order.ts: class Order"
  - ".ai/book/trading-glossary.md"
authority: ".ai/book/trading-glossary.md"
```

**not** フィールドが特に重要：何でないかを書くことで境界を立てる。

### Step 5: 正本の置き場所決定

DCR の場合：

| 用途 | 置き場所 |
|---|---|
| ドメイン全体の glossary | `.ai/book/<domain>-glossary.md` |
| 機能スコープの用語 | その機能の README / docs |
| 1 用語の重大な意味変更 | ADR を切る |
| 一時的・実験中の用語 | plan ファイル内、まだ正本化しない |

### Step 6: drift の修正計画

- コード側の rename は別 PR、glossary 整備とは分ける（review しやすい）
- 訳語不統一は docs 側を先に揃える
- 多義語の分割は ADR 候補

## Output

```markdown
Ubiquitous Language
- Scope: <module / feature / repo>
- Candidate terms: N
- Drift found:
  - 同義異名: [...]
  - 異義同名: [...]
  - 訳語不統一: [...]
- Glossary entries: (上記 yaml 形式)
- Authority files updated: [...]
- Follow-up:
  - rename PRs: [...]
  - ADR candidates: [...]
- Next skill: docs-update | adr-management
```

## 失敗モード

| 兆候 | 原因 | 対処 |
|---|---|---|
| 用語数が爆発する | 抽出範囲が広すぎ | スコープを 1 モジュールに絞る |
| 定義が agent 想像で埋まる | 既存 docs を読まずに書いた | Step 1 のコーパス収集を強化 |
| canonical が決まらない | 利害が違うレイヤを混ぜている | レイヤ別 glossary に分割 |
| rename が肥大化 | glossary と rename を同 PR に詰めた | 分割する |

## 非目標

- 全用語に長文定義をつける（短く、not を入れる方が効く）
- 一度で全 drift を解消する
- 多義語を強引に 1 つに統合する（分割する方が正しいことが多い）
