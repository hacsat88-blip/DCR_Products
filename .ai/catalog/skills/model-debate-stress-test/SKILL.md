---
name: model-debate-stress-test
routing_category: governance
deprecated: true
successor: dcr-pipeline
deprecation_reason: "Folded into dcr-pipeline p/ Decision Stress Test for OpenAI Skills baseline slimming."
description: "2〜3 個の大きな選択肢（採用判断・アーキテクチャ分岐・ADR 候補）の間で迷っているとき、複数モデル or 複数役割インスタンスにディベートさせ、各案の前提と反論をストレステストする。並列マルチエージェントが使えるランタイムでは複数インスタンス並列、不可なランタイムでは Proposer / Opponent / Judge の役割切替で順次実行する。"
contract:
  preconditions:
    - "判断対象が 2〜3 個に絞れている（4 個以上なら design-an-interface で先に絞る）"
    - "判断が hard-to-reverse、または波及範囲が大きい"
    - "現時点で『どれも一長一短』で決められない状態"
  postconditions:
    - "各案に対し『最強の反論』が記録されている"
    - "Judge による比較サマリと、反論を踏まえた推奨が出ている"
    - "推奨に対する残存リスクと監視ポイントが明示されている"
  invariants:
    - "Proposer は自案を擁護、Opponent は容赦なく攻撃、Judge は中立"
    - "ランタイムが並列マルチエージェントを持たない場合は、役割切替の順次実行で代替する"
    - "ディベートは『勝敗を決める』のではなく『隠れた前提を炙り出す』ことが目的"
composable:
  input_type: decision-candidates
  output_type: stress-tested-decision
  chains_with:
    - design-an-interface
    - domain-decision-grilling
    - adr-management
    - decision-complete-planning
metadata:
  origin: synthesized
  upstream_url: "https://github.com/tommasinigiovanni/conclave"
  upstream_paths:
    - "README.md"
  upstream_license: "MIT"
  imported_at: "2026-05-16"
  adapted_from: "Conclave / Model-chat debate pattern; conclave's multi-instance Claude assumption was generalized to any runtime via role-switching fallback. Hungv47/meta-skills stochastic-consensus inspiration for the Judge aggregation step."
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

# Model Debate Stress Test

## 目的

「どれも一長一短で決められない」大きな判断に対し、各案を**最強の反論**にさらしてから採用判断する。
合議で多数決を取るのではなく、**前提の脆さを炙り出す**ことが目的。

`design-an-interface` で 3〜5 案を生成 → 2〜3 案に絞った後 → この skill でストレステスト、というチェーンが標準ルート。

## Natural Language Triggers

- 「A と B どっちにする？」「これで進めて本当に大丈夫？」
- 「ライブラリ X を入れる価値ある？」（採用判断）
- 「アーキテクチャを切り替えるか迷っている」
- ADR を切る直前で確信が持てないとき
- 「楽観論しか出てこない」と感じたとき

## 適用しない場面

- 判断が reversible で実装コストも低い（やってみて戻せばよい）
- 候補が 4 個以上（先に `design-an-interface` で絞る）
- 緊急インシデント対応（`incident-postmortem` 系へ）

## 役割定義

| Role | 目的 | スタンス |
|---|---|---|
| **Proposer** | 担当案を擁護し、最良の運用条件を提示する | 案の支持者として一貫 |
| **Opponent** | 担当案の前提・データ・コストを攻撃する | 容赦なく。「うまく行く」前提を全て疑う |
| **Judge** | Proposer と Opponent の主張を要約、矛盾点を抽出、最終推奨を出す | 中立。判断根拠を明示 |

各案に Proposer 1 + Opponent 1 を割り当て、最後に Judge 1 がまとめる。

## 手順（ランタイム別）

### A. 並列マルチエージェントが使えるランタイム

(Claude Code の Task / subagent、Codex CLI の parallel agents、Copilot CLI の agent mode、opencode 等)

1. 各案について Proposer / Opponent を並列ディスパッチ
2. ラウンド 1：各 Proposer が自案を提示
3. ラウンド 2：各 Opponent が他案の Proposer 出力に反論
4. ラウンド 3：各 Proposer が反論に再反論（任意、争点が深まる場合のみ）
5. Judge が全議論を読み、最終サマリと推奨を出す

### B. 並列マルチエージェントが無いランタイム

(素の Cursor chat、Windsurf、gemini-cli の single session)

役割を**順次切り替え**て同じ思考を実行する：

1. **Proposer モード**：案 A の最良ケースを書く（「自分はこの案の支持者」と明示）
2. **Opponent モード**：案 A への最強反論を書く（「自分は反対派」と明示）
3. 1〜2 を案 B、案 C についても繰り返す
4. **Judge モード**：全出力を読み、矛盾点・隠れた前提・推奨を出す

切替を**明示的に宣言**することがコツ：曖昧にすると Proposer が反論し始める。

## ディベートの質を上げる質問テンプレ

Opponent 用：

- 「この案が失敗するシナリオで、最も再現性が高いものは？」
- 「この案を選んだ 1 年後、最も後悔するポイントは？」
- 「採用論拠で『おそらく』『一般に』『多くの場合』と書かれた箇所は実データがあるか？」
- 「この案の隠れたコスト（運用・学習・依存）は何か？」
- 「『これは reversible だ』という主張は本当か？戻すコストは？」

Judge 用：

- 「Proposer と Opponent の主張で、事実認識がずれている箇所はどこか？」
- 「反論を踏まえて、推奨案の前提条件はどう変わるか？」
- 「推奨が外れたときの早期検出シグナルは何か？」

## Output

```markdown
Model Debate Stress Test
- Decision under stress: <1 sentence>
- Candidates: A, B, (C)
- Runtime mode: parallel | sequential role-switch

Round summary:
- A (Proposer): ...
- A (Opponent): ...
- B (Proposer): ...
- B (Opponent): ...

Judge summary:
- 隠れた前提:
- 事実認識の食い違い:
- 反論で揺らがなかった主張:
- 反論で崩れた主張:

Recommendation: <case A | B | C>
- Conditions for it to hold: [...]
- Residual risks: [...]
- Monitoring signals (early-fail detection): [...]
- ADR candidate: yes/no
- Next skill: adr-management | decision-complete-planning
```

## 失敗モード

| 兆候 | 原因 | 対処 |
|---|---|---|
| 結局両論併記で決まらない | Judge が中立すぎる | Judge に「条件付き推奨」を必ず出させる |
| Opponent が弱い反論しかしない | スタンス切替が甘い | テンプレ質問を強制適用 |
| 同じ案を繰り返し擁護してしまう | 単一セッションで役割切替が機能していない | 役割を明示宣言・別ファイルに書き分け |
| 議論が抽象論で終わる | 具体的なデータ・コード参照が不足 | 各 Round で repo 参照を必須にする |
| 並列実行できないと諦める | ランタイム制約の誤解 | 順次切替モードへフォールバック（手順 B） |

## 非目標

- 多数決で決める（合議ではない）
- ディベート自体を成果物にする（出力は Judge 推奨のみが本体）
- 全判断にこれを使う（reversible で軽い判断は素通り）
