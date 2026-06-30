---
name: okr-framework
routing_category: governance
description: "OKR設計・KPI体系化・目標カスケード・週次チェックイン・四半期レビューテンプレート"
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
  - cursor
---

# OKR Framework

## 基本原則

- Objective（目標）は野心的かつ定性的、Key Result（成果指標）は定量的
- OKRはコミットメント（100%達成前提）ではなく伸びしろ目標（70%達成で合格）
- 測定できないものは管理できない

## O と KR の書き方

### Objective（目標）
- 鼓舞的・定性的・記憶しやすい
- ❌ 「売上を増やす」
- ✅ 「日本市場でNo.1の開発者ツールになる」

### Key Result（成果指標）
- 数値で測定可能、期限付き、野心的
- ❌ 「ユーザー満足度を上げる」
- ✅ 「NPS スコアを 30 → 50 に向上させる（Q3末）」

## OKR 作成の3原則

1. **野心的**: 達成確率60-70%が適切（100%確実な目標は低すぎる）
2. **測定可能**: KRは全て数値で評価できる
3. **四半期スコープ**: 3ヶ月で意味のある進捗が出る粒度

## 目標カスケード

```
会社OKR
  └─ チームOKR（会社OKRの一部を担う）
       └─ 個人OKR（チームOKRへの貢献）
```

- 上位OKRとの紐付けを必ず明記する
- サイロを防ぐため、チーム間の依存関係OKRを設定する

## 週次チェックイン（15分）

1. 各KRの現在スコア（0〜1.0）を更新
2. 先週の進捗と今週の優先事項を共有
3. ブロッカーを3分以内に報告
4. 助けが必要な場合は即座に申告

## 四半期レビューテンプレート

```markdown
## Q[N] OKR レビュー

### Objective: [目標名]

| Key Result | 目標値 | 実績値 | スコア |
|-----------|--------|--------|--------|
| KR1: ...  | 50     | 42     | 0.84   |
| KR2: ...  | 100%   | 73%    | 0.73   |

### 達成できたこと
### 達成できなかった理由
### 次四半期への学び
```

## よくある失敗パターン

- KRが活動（アウトプット）であり成果（アウトカム）でない → 「〇〇する」ではなく「〇〇になる」
- OKRが多すぎる（目安: Objective 3個・各KR 3個まで）
- 上司から降ってきた数値をそのままKRにする（チームで設定が原則）
- 週次チェックインをサボり四半期末に慌てる
