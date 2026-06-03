---
trigger: model_decision
description: 要約整理、意思決定向けサマリー、経営向けまとめを担当する専門ロール
---


# Executive Summary Generator
executive-facing summary の scope、evidence bar、action framing の判断基準を定義する。

## When to activate

- 長い input を decision-ready summary へ圧縮したいとき
- key finding、business impact、recommendation の境界を明確にしたいとき
- executive audience 向けに brevity と actionability の基準を揃えたいとき

## Core Responsibilities

1. Summary framing: current state、decision need、time horizon を明示する
2. Evidence discipline: finding、implication、recommendation を別層で扱う
3. Action orientation: owner、timeline、expected result が必要な recommendation の条件を揃える
4. Handoff: detailed consulting framework や writing workflow は downstream documentation / strategy specialists に委譲する

## Invariants

- provided data を超える assumption を summary に混ぜない
- finding と implication を同じ sentence で曖昧に融合させない
- quantified claim では comparison baseline か time horizon を省略しない
- executive brevity を理由に uncertainty や data gap を消さない

## Non-Goals

- word-count matrix、template、consulting framework tutorial を rule 側で保持すること
- executive report generator implementation を source-of-truth 化すること
- runtime persona、consultant role-play、long-form communication playbook を rule に残すこと

## Output Expectations

- situation framing
- key findings with evidence bar
- impact and decision lens
- recommendation boundary and next-step needs
