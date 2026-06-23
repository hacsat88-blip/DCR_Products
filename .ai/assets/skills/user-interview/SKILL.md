---
name: user-interview
routing_category: ui-ux
description: "ユーザーインタビュー設計：質問設計・JTBD分析・認知バイアス回避・親和図法・HMW変換"
disable-model-invocation: true
contract:
  preconditions:
    - "The request matches this skill's description or routing category."
  postconditions:
    - "The response names the result, reasoning, and verification or handoff path."
  invariants:
    - "Do not treat generated mirrors or runtime caches as DCR source of truth."
composable:
  input_type: task
  output_type: artifact-or-decision
  chains_with:
    - verification-before-completion
runtime_targets:
  - codex
  - claude
  - copilot
  - cursor
  - gemini-cli
---

# User Interview

## 基本原則

- 解決策を聞くのではなく、問題と文脈を深く聞く
- 「なぜ」を繰り返し、表層の要望の奥にある動機を探る
- バイアスを持ち込まない——インタビュアーの仮説を確認する場ではない

## 質問設計の3種類

| 種類 | 例 | 用途 |
|------|-----|------|
| オープン質問 | 「どのように〜していますか?」 | 探索・文脈把握 |
| プローブ質問 | 「もう少し詳しく教えていただけますか?」 | 深掘り |
| クローズド質問 | 「それは毎日起きますか?」 | 事実確認 |

**禁止**: 誘導質問（「〇〇だと思いますか?」）

## Jobs-to-be-Done（JTBD）フレームワーク

```
When [状況・文脈],
I want to [やりたいこと・動機],
So I can [達成したい結果].

例:
When 朝の通勤中に,
I want to 前日のニュースを素早く把握したい,
So I can 職場での会話に遅れを取らないようにしたい.
```

- 機能より動機（Job）に焦点を当てる
- 同じ機能でも Jobs が異なればセグメントが異なる

## インタビュー質問例

```
導入:
「今日は〇〇について伺います。まず普段どのように〇〇をされているか教えてください」

探索:
「その作業で最もストレスを感じる瞬間はどんな時ですか?」
「その問題が起きたとき、どうやって対処されていますか?」
「理想的にはどんな状態になっていてほしいですか?」

深掘り:
「それはなぜそう感じますか?」
「具体的な最近の例を教えていただけますか?」
「他にも似たような状況はありますか?」
```

## 認知バイアス回避

- **確証バイアス**: 自分の仮説を確認しようとする → 反証する質問も意識的に用意
- **ソーシャルデジラビリティバイアス**: 良いことを言いたがる → 「困ったことは?」を必ず聞く
- **思い出しバイアス**: 記憶は不正確 → 最近の具体例を聞く（「昨日〜はありましたか?」）

## 親和図法（KJ法）による分析

1. インタビューメモから観察事実を1枚1カードで書き出す
2. 内容が似ているカードをグループ化する
3. グループに見出し（表題）をつける
4. グループ間の関係（因果・対立）を整理する

## インサイト→HMW 変換

```
インサイト: 「ユーザーは設定が多すぎて圧倒されている」
↓
HMW（How Might We）: 「どうすればユーザーが設定の量に圧倒されずに済むか?」

インサイト: 「上級ユーザーは細かい設定を求めているが初心者は混乱している」
↓
HMW: 「どうすれば初心者と上級者の両方のニーズを同時に満たせるか?」
```

## インタビュー後のチェックリスト

- [ ] 録音・メモの整理（24時間以内）
- [ ] 主要な引用文を抽出
- [ ] 観察→インサイト→HMW の変換
- [ ] チームへの共有（参加していない人にも伝わる形式で）
- [ ] パターンが出るまで5〜8名インタビュー
