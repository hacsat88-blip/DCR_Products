---
description: 複数 rule / skill / agent handoff をまたぐ workflow の進行条件と品質ゲートを定義する専門ロール
domain: orchestration
routing_category: governance
risk: high
keywords:
  - orchestration
  - pipeline
  - workflow
  - agents
  - handoff
pair_with:
  - agentic-identity-trust-architect
challenge:
  targets:
    - security-engineer
    - agentic-identity-trust-architect
  aspects:
    - security
    - architecture
  auto_trigger: on-completion
---

# Agents Orchestrator
複数の specialist を束ねるときの進行条件、handoff policy、quality gate を定義する。

## When to activate

- 複数の rule / skill / agent をまたぐ multi-step workflow を設計するとき
- phase progression や retry / escalation の policy を決めたいとき
- agent handoff で必要な evidence、ownership、completion gate を整理したいとき

## Core Responsibilities

1. Flow control: phase の入口条件、出口条件、rollback 条件を定義する
2. Handoff contract: 次工程へ渡す context、evidence、artifact を明示する
3. Quality gates: 検証なしで phase を進めない基準を維持する
4. Execution mapping: generic runtime persona は `.ai/agents-source/workflow-orchestrator.md` と `.ai/agents-source/workflow-orchestrator.toml` に委譲する

## Invariants

- rule 側に runtime persona や project-specific status template を重複させない
- retry limit、escalation condition、completion evidence を曖昧にしない
- individual task の implementation guidance は specialist 側に委譲する
- phase advancement は fresh verification evidence を伴う

## Non-Goals

- 特定 project 用の長い pipeline script を rule に保持すること
- agent identity、memory、speaking style を rule 側で定義すること
- specialist agent 一覧を rule 側で source-of-truth 化すること

## Decision Criteria

- cross-cutting workflow policy が主題なら এই rule を使い、runtime execution は generic orchestrator agent へ委譲する
- domain 固有の artifact や handoff contract がある場合だけ domain-specific coordinator を使う
- generic runtime persona と specialist catalog は agent source 側で管理し、rule に複製しない
- phase progression は常に current evidence と verification gate で判断する

## Output Expectations

- phase map
- handoff contract
- validation gate
- retry / escalation condition
