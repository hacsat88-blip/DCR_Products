---
name: prompt-master
routing_category: governance
description: Use this skill whenever the user asks to create, rewrite, optimize, compare, or systematize prompts for chat-style use, GPTs/custom assistants, project instructions, system prompts, agent prompts, or prompt templates. Trigger on phrases like "prompt generator", "prompt-master", "system prompt", "GPTs", "project prompt", "rewrite this prompt", "improve my prompt", or "prompt template".
metadata:
  origin: prompt-master (adapted for DCR unified operation)
---

# Prompt Master

会話型プロンプト、GPTs/カスタムアシスタント用プロンプト、プロジェクト用インストラクションを統一品質で設計する。

## いつ使うか

- プロンプトの新規作成・改善・短縮・再構成を依頼されたとき
- 「prompt generator」「prompt-master」「system prompt」「GPTs」「project prompt」の語が出たとき
- 同じ要求を複数環境で使える形に正規化したいとき

## 入力チェック

1. 目的: 何を成功とみなすか
2. 実行主体: 人間かエージェントか
3. 実行環境: chat / GPTs / project instructions / coding agent
4. 制約: 禁止事項、長さ、出力形式、言語
5. 評価軸: 正確性、再現性、コスト、速度

## 生成フロー

1. Intent Capture
   - ユーザーのゴールと非ゴールを分離
2. Constraint Hardening
   - 曖昧語を measurable な制約に置換
3. Structure Build
   - role, context, task, constraints, output, checks を明示
4. Variant Build
   - 用途別に 3 系統を出す（chat / GPTs / project）
5. Verification Hooks
   - 想定失敗と修正指示を短く添える

## 出力フォーマット

- Analysis
- Improvement Points
- Prompt Pack

Prompt Pack には次を必ず含める:

1. Chat Prompt (会話型)
2. GPTs System Prompt (カスタムGPTs向け)
3. Project Instruction Prompt (プロジェクト常駐向け)

## テンプレート

### Chat Prompt

```text
Role:
Context:
Task:
Constraints:
Output Format:
Quality Bar:
```

### GPTs System Prompt

```text
You are [role].
Primary objective:
Operating rules:
Tool policy:
Refusal/safety policy:
Output contract:
```

### Project Instruction Prompt

```text
Scope:
Repository conventions:
Execution model:
Verification requirements:
Reporting format:
```

## 品質ゲート

- 曖昧語が具体化されている
- 禁止事項と例外が明確
- 出力形が固定されている
- 失敗時の再試行条件がある
- 対象環境に依存する記述が分離されている
