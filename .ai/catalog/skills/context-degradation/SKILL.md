---
name: context-degradation
routing_category: governance
description: "長い会話、巨大ログ、複数タスク混在、古い前提の混入で agent の判断品質が落ちている疑いがあるときに使う。lost-in-middle、context poisoning、context clash、文脈劣化、前提ズレ、同じ失敗の反復を診断し、圧縮・分離・再検証へつなぐ。"
contract:
  preconditions:
    - "会話、ログ、検索結果、生成サマリー、または複数 agent の出力が判断に影響している"
  postconditions:
    - "劣化パターンと根拠が短く分類されている"
    - "保持すべき verified context と捨てる/隔離する context が分離されている"
    - "次の圧縮、再取得、再検証アクションが決まっている"
  invariants:
    - "古いサマリーや生成物を未検証の正本として扱わない"
    - "critical な前提は source-of-truth または一次出力で再確認する"
composable:
  input_type: context
  output_type: diagnosis
  chains_with:
    - context-compression
    - context-optimization
    - token-efficiency-advisor
    - verification-before-completion
metadata:
  origin: antigravity-awesome-skills
  upstream_url: "https://github.com/sickn33/antigravity-awesome-skills"
  upstream_path: "skills/context-degradation/SKILL.md"
  license: "CC-BY-4.0 content / MIT repository code; adapted summary"
  imported_at: "2026-05-06"
  adapted_from: "Condensed into a DCR reinforcement skill; not a wholesale import."
---

# Context Degradation

## 目的

長い作業中に起きる「文脈の質の低下」を、気分ではなく症状で切り分ける。
DCR では、これは単体 agent の能力不足ではなく、`pied-piper` 配下の前後処理として扱う。

## 見る症状

| Pattern | 兆候 | 対処 |
|---|---|---|
| lost-in-middle | 重要情報が会話中央に埋まり、後続判断から抜ける | 重要事実を先頭/末尾の状態メモに移す |
| context poisoning | 誤った前提や hallucination が後続判断に残る | 汚染箇所を明示し、verified context だけで再開する |
| context distraction | 不要ログや生成物が多すぎて本筋が薄まる | relevance filter と要約で入力を減らす |
| context confusion | 別タスクの制約やツール選定が混ざる | タスク単位で文脈を分割する |
| context clash | 複数の正しい情報がバージョン差で衝突する | 優先順位、日付、source-of-truth を明示する |

## DCRでの手順

1. 現在の失敗を 1 行で症状化する
2. 影響していそうな context を `verified / suspect / noise` に分ける
3. `verified` は source-of-truth、コマンド出力、一次資料で根拠を残す
4. `suspect` は再確認するか、以後の判断から隔離する
5. `noise` は読み込まず、必要なら `context-compression` で短くする
6. 再開時は「現在の目的、触ったファイル、残タスク、検証結果」だけを残す

## 連携

- 長い会話を続ける前: `context-compression`
- 読む範囲を減らす前: `context-optimization`
- ツール出力が重いとき: `token-efficiency-advisor`
- 完了主張の直前: `verification-before-completion`

