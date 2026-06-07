---
name: unified-router
description: Unified routing dispatcher for DCR. Classifies intent/domain/risk/phase, reduces candidates to the few useful rule/skill/agent options, and reports via a low-cognitive-load proposal template. Replaces skill-router; actual execution handled by pied-piper agent.
routing_category: governance
keywords:
  - routing
  - router
  - dispatcher
  - skill-selection
  - auto-select
  - orchestration
targets:
  - vscode
  - cursor
  - claude
  - codex
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

# unified-router

> **このスキルは参照エントリーポイントです。**
> 実際のルーティング実行は **[pied-piper](./../agents-source/pied-piper.md)** agent が担います。
> ロジック定義は **[.ai/module/unified-router.md](../../../module/unified-router.md)** を参照してください。

## 役割

`unified-router` は旧 `skill-router` を置き換えるルーティング基盤の統合窓口です。候補を増やす司令塔ではなく、候補を減らして束ねる入口として振る舞います。

- **入力分類**: intent / domain / risk / phase / scale / ambiguity の6軸でタスクを分類
- **アセット選定**: 決定木（Step 0–6）で Rule / Skill / Agent をユーザー表示最大3件に圧縮
- **発火判定**: confidence は候補順位に使い、auto / propose / approve_required で実行可否を決める

## 決定木（概要）

| ステップ | 基準 | 優先度 |
|---|---|---|
| Step 0 | deprecated alias 解決（successor へ無音置換） | 最高 |
| Step 1 | ユーザー明示指定（`/name`, `use X`） | 高 |
| Step 2 | `routing_category` 完全一致 | ↑ |
| Step 3 | `keywords` 重み付き一致数 | ↓ |
| Step 4 | `domain` 一致 | ↓ |
| Step 5 | `risk` 整合性 | ↓ |
| Step 6 | `phase` 整合性 | 低 |

## 実行フロー

```
ユーザー入力
  → pied-piper (Unified Coordinator)
          → unified-router モジュール（決定木適用）
          → 採用アセット選定
          → 発火前提案（採用候補 / 理由 / 期待効果）
          → 必要時はユーザー承認
          → 実行
          → Write-RouterDecision でテレメトリ記録
```

## 発火モード

- `auto`: P1 read-only、単独候補、曖昧さ低、外部送信なし。
- `propose`: 複数候補、曖昧、タスク規模中以上、Skill/Agent 起動が有益。
- `approve_required`: P2/P3、subagent、並列、外部MCP/API、設定変更、削除、依存変更、セキュリティ/金融/法務。

高信頼でも、Skill / Agent / サブエージェント / orchestration を発火する場合は原則として候補提示または承認待ちにする。

## Cognitive Load Contract

提案は原則として次の短い形にします。

```text
採用候補：<おすすめ候補>（mode: propose|approve_required）
理由：<短い理由>
期待効果：<何が楽になるか>
選択：A) おすすめで進める / B) 軽めに見る / C) 別案を見る
```

- ユーザーに見せる候補は最大3件。内部候補やスコア詳細は telemetry に残す。
- `おすすめで` / `推奨で` / `Aで` / `1で` は、対象が一意の直前候補に結びつく場合のみ承認として扱う。
- `それで` / `進めて` / `承認` / `OK` は、単独候補の場合のみ承認として扱う。
- `いい感じに` / `任せる` / `おまかせ` / `よさそう` / `よさげ` / `たぶん` / `多分` は承認にせず、候補提示または再確認に戻す。
- `approve_required` の場合だけ `承認が必要な理由` を追加する。

## Proposal State Machine

`gate-state.json` に `proposal_state.status = proposed|refined` がある場合、短い次発話は通常ルーティングより先に直前提案への返答として解釈します。

- `approve`: 一意の option が選ばれた場合だけ `approved`
- `reject`: `やめて` / `却下` / `違う` / `不要` / `キャンセル` / `中止` で `rejected`
- `refine`: `別案` / `別の案` / `軽めに` / `軽く` / `詳しく` / `もう少し` / `絞って` で `refined`
- `ambiguous`: active proposal がない、または候補が一意でない場合は発火せず再確認

状態は `.ai/kernel/gate-state.json`、監査履歴は `.ai/kernel/router-decisions.jsonl` に残します。分類の実装は `tools/lib/gate-state.ps1` の proposal state machine に従います。
V5 では `tools/test-proposal-reply-vocabulary.ps1` で、自然語返答の実行時挙動を検証します。
V6 では `tools/test-routing-entrypoint-contract.ps1` で、Codex / Claude Code / VS Code Copilot の生成入口が同じ自然語返答契約を読めることを検証します。
V7 では `tools/router-decisions-report.ps1` と `tools/reduction-advisor.ps1` が smoke/test/fixture 由来の synthetic telemetry を削減判断から除外し、実運用ログ不足時は `collect_real_usage` に留めます。
V7.1 では `tools/shadow-routing-trial.ps1` で、実作業に近い依頼文とユーザー評価を `shadow_trial: true` として記録し、削減前の判断材料を集めます。
V8 では `tools/display-policy-advisor.ps1` で、shadow trial を表示抑制・軽量化・裏側 asset 表示の提案に変換します。これは表示ポリシーの提案までで、削除や deprecated 追加は行いません。
V9 では `tools/display-policy-proposal.ps1` で、V8 の提案を `proposal_state` に渡せる承認待ち案へ変換します。既定は preview のみで、`-CommitState` のときだけ gate-state に保存します。
V10 では `tools/bundle-advisor.ps1` で、候補を親ハブに束ねるべきかを助言します。これは束ね提案までで、物理統合、削除、deprecated 追加は行いません。
V10.1 では `tools/bundle-proposal.ps1` で、V10 の束ね提案を `proposal_state` に渡せる承認待ち案へ変換します。既定は preview のみで、`-CommitState` のときだけ gate-state に保存します。

## 詳細

- 決定木・ローカルオーバーライド優先順位: [unified-router.md](../../../module/unified-router.md)
- 統一Coordinator 実装: [pied-piper.md](./../agents-source/pied-piper.md)
- ゲート連鎖: [trigger-p/q/sh](../../../kernel/gates/)
