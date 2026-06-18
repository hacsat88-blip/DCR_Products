---
name: design-an-interface
routing_category: ui-ux
description: "API・UI コンポーネント・モジュール境界の設計で、単一案に飛びつく前に 3〜5 個の根本的に異なる代替案をトレードオフ付きで生成する。並列サブエージェントが確実に使えるランタイムでは並列実行、それ以外（Codex CLI / Cursor / Copilot CLI / gemini-cli 等）では順次思考で同じ多視点比較を作る。"
contract:
  preconditions:
    - "設計対象のモジュール、コンポーネント、API、または UI 単位が特定されている"
    - "そのモジュールの責務、入力、出力、呼び出し元のうち少なくとも1つが明確"
  postconditions:
    - "3〜5 個の代替案が、命名・形・粒度・依存方向のレベルで根本的に異なる形で並んでいる"
    - "各案に明示的なトレードオフ（reversibility / 拡張性 / 既存整合 / 実装コスト）が付いている"
    - "推奨案が 1 つ選ばれ、却下案の却下理由が記録されている"
  invariants:
    - "命名違いだけの『見せかけの3案』を出さない"
    - "ランタイムが並列サブエージェントを持たない場合は、順次思考で同じ多視点比較を作る"
    - "既存コードベースの命名・境界・ADR と矛盾していないか各案で確認する"
composable:
  input_type: design-intent
  output_type: design-alternatives
  chains_with:
    - governance-ops
    - documents-ops
    - improve-codebase-architecture
metadata:
  origin: mattpocock/skills
  upstream_url: "https://github.com/mattpocock/skills"
  upstream_paths:
    - "skills/engineering/design-an-interface/SKILL.md"
  upstream_license: "MIT"
  imported_at: "2026-05-16"
  adapted_from: "design-an-interface pattern; no skills.sh installer or repo-specific CONTEXT.md convention imported. Parallel subagent step is downgraded to sequential thinking when the runtime lacks subagent dispatch."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - copilot
    - cursor
    - gemini-cli
---

# Design an Interface

## 目的

API・UI コンポーネント・モジュール境界の設計で、最初に思いついた1案へ飛びつかず、**根本的に違う形の代替案を並べて比較**してから採用案を確定する。
`improve-codebase-architecture` は既存コードの改善方向探索、こちらは**新規 or 置き換え対象のインターフェース形状探索**で使う。

## Natural Language Triggers

- 「この API どう切る？」「コンポーネント分割どうする？」
- 「インターフェース案を出して」「型をどう切るか」
- 「これ Hook にする？コンポーネントにする？Provider にする？」
- ライブラリ／フレームワーク選定の前段で抽象の置き場所が決まらないとき

## 適用しない場面

- 既に明確な ADR で形が決まっている場合
- 局所的なリファクタ・命名修正（1 案で十分）
- バグ修正（`systematic-debugging` を使う）

## 手順

### Step 1: スコープ確定

設計対象を 1 文で書く。曖昧なら `governance-ops` に戻る。

```
対象: <module / component / API>
責務: <1 sentence>
入力: ...
出力: ...
主要な呼び出し元: ...
```

### Step 2: 既存制約の収集

- 既存コードの命名・型・境界
- ADR・`.ai/core/`・README に書かれた決定
- 過去判断（runtime memory が使えるなら検索）

### Step 3: 代替案の生成（ランタイム別）

**並列サブエージェントが確実に使えるランタイム** (Claude Code の `Task` tool 等):

- 3〜5 個のサブエージェントを並列ディスパッチ
- 各サブエージェントに「他案と根本的に異なる形」を制約として渡す
- 例: agent A は関数 API、agent B はクラス API、agent C は宣言的 DSL、agent D は config-driven

**並列サブエージェントが無い／確実でないランタイム** (Codex CLI, Copilot CLI agent mode, Cursor composer, gemini-cli 等 — multi-instance を手動起動できる場合はそれでも可、不確実なら順次へ):

- 順次思考で 3〜5 案を出す
- 各案を出した直後に「これと根本的に違う形は？」と自問してから次案へ
- **直前案の命名違いになっていないか**を都度チェック

### Step 4: トレードオフ表

| 案 | 形 | reversibility | 拡張性 | 既存整合 | 実装コスト | リスク |
|---|---|---|---|---|---|---|
| A | ... | high/med/low | ... | ... | ... | ... |
| B | ... | ... | ... | ... | ... | ... |
| C | ... | ... | ... | ... | ... | ... |

### Step 5: 推奨と却下記録

- 推奨案を 1 つ選ぶ（同点なら reversibility 高い方）
- 各却下案に **却下理由を 1 行**残す（後で振り返れるように）
- 決定が hard-to-reverse なら ADR 候補にする

## Output

```markdown
Interface Design Alternatives
- Target:
- Constraints (from repo):
- Alternatives:
  - A: <shape> — pros / cons
  - B: <shape> — pros / cons
  - C: <shape> — pros / cons
- Tradeoff table: (上記の表)
- Recommended: A (reason)
- Rejected: B (reason), C (reason)
- ADR candidate: yes/no
- Next skill: governance-ops | documents-ops
```

## 失敗モード

| 兆候 | 原因 | 対処 |
|---|---|---|
| 全案が命名違いだけ | 「根本的に違う形」の制約が弱い | Step 3 のサブエージェント指示を強化 |
| 案 1 つに偏る | 既存実装に引きずられている | 既存制約を Step 2 で明文化してから案出し |
| 推奨が決まらない | トレードオフ軸が抽象すぎる | reversibility / 実装コストの 2 軸で決め切る |
| 並列が走らない | ランタイム非対応 | 順次思考モードへフォールバック（Step 3 参照） |

## 非目標

- 1 案だけの「設計」を出す
- 命名違いの 3 案でお茶を濁す
- 全モデル並列前提でランタイム非対応を無視する
