# DCR Architecture

## 概要

DCR (Dynamic Context Router) は、5つの AI 開発環境に統一的なルール・スキル・エージェント設定を配信するシステムです。

## システム構成図

```
                   ┌─────────────────────┐
                   │   .ai/kernel/        │
                   │   (Source of Truth)   │
                   │   _base.md           │
                   │   _permissions.md    │
                   │   _safety-boundaries │
                   │   gates/             │
                   │   environments/      │
                   └──────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐
        │  rules/    │  │  skills/   │  │  agents-  │
        │  (80+)     │  │  (76)      │  │  source/  │
        │  *.md      │  │  */SKILL.md│  │  *.toml   │
        └─────┬──────┘  └─────┬──────┘  └─────┬─────┘
              │               │               │
              └───────┬───────┘               │
                      │                       │
              ┌───────┴───────┐       ┌───────┴────────┐
              │  deploy.ps1   │       │ sync-agents.ps1│
              └───────┬───────┘       └───────┬────────┘
                      │                       │
         ┌────────────┼────────────┐          │
         │            │            │          │
    ┌────┴────┐  ┌────┴────┐  ┌───┴────┐  ┌──┴──────────┐
    │ VS Code │  │ Cursor  │  │ CLI/   │  │ .codex/     │
    │ Copilot │  │ .mdc    │  │ Codex  │  │ .claude/    │
    └─────────┘  └─────────┘  └────────┘  └─────────────┘
```

## レイヤー構造

### 1. Kernel Layer (`.ai/kernel/`)

不変の共通仕様。全環境が参照する唯一の正本。

| ファイル | 責務 |
|---------|------|
| `_base.md` | シグナル、トリガー、実行モード、ツール優先順位 |
| `_permissions.md` | P1/P2/P3 権限モデル |
| `_safety-boundaries.md` | 安全境界の定義 |
| `_module-behaviors.md` | モジュール動作定義 |
| `gates/` | ゲートトリガー (p/, q/, sh/ 等) |
| `environments/` | 環境固有の差分定義 |

### 2. Source Layer

編集対象のカノニカルアセット。

- **rules/** — 専門ロール定義 (YAML frontmatter + Markdown body)
- **skills/** — 実行可能なワークフロー定義 (SKILL.md)
- **.ai/agents-source/** — エージェント定義 (TOML + MD)

### 3. Runtime Layer

各エディタが直接読む入口ファイル。

| 環境 | Entrypoint |
|------|-----------|
| VS Code Copilot | `.github/copilot-instructions.md` |
| Copilot CLI | `COPILOT_CLI.md` |
| Codex | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursor/rules/dcr-kernel.md` |

### 4. Generated Layer

`deploy.ps1` / `sync-agents.ps1` が自動生成。手編集禁止。

- `.cursor/rules/*.mdc` — Cursor rules (deploy.ps1 生成)
- `.codex/agents/` — Codex agent files (sync-agents.ps1 生成)
- `.claude/agents/` — Claude agent files (sync-agents.ps1 生成)

## ルーティングアーキテクチャ

### Skill Router (Layer 1 + Layer 3)

```
ユーザーリクエスト
    │
    ├─ 明示指定 (/skill-name) → 即時実行
    │
    ├─ Layer 1 (18 skills) → モデルが自動選択可能
    │   brainstorming, code-review, writing-plans, etc.
    │
    └─ Layer 3 (58+ skills) → skill-router 経由 or 明示呼び出し
        │
        ├─ routing_category マッチ → 親カテゴリ決定
        ├─ keywords マッチ → スコアリング
        └─ 最大3候補を提案 → ユーザー選択
```

### Rule Routing

```
1. ユーザー指定の role/skill (最優先)
2. skills/* の一致
3. rules/*.md の強一致 (最大2件)
4. 直接処理 (デフォルト)
```

## Gate Chain

```
p/ (Plan) ──→ 実装 ──→ q/ (QA) ──→ sh/ (Ship)
    │                      │              │
    │ plan_approved: true   │ qa_passed    │ hard block
    │ → gate-state.md       │ → gate-state │ if !qa_passed
    │                      │              │
    │ scope change →       │ 🔴=0 required│ ship checklist
    │ reset + replan       │              │ verified
```

- **p/ gate**: スコープと計画を確定。3ステップ以上は `docs/dcr/plans/` に保存
- **q/ gate**: 証跡ベースの検証。🔴 = 0 で通過
- **sh/ gate**: q/ 通過が必須 (hard block)。ship checklist で最終確認

## Adversarial Review

高リスクロール (`risk: high`) は `challenge:` メタデータで敵対レビューを定義可能。

```yaml
challenge:
  targets: [backend-architect]
  aspects: [security, architecture]
  auto_trigger: on-completion
```

## Decision Log

| 日付 | 決定 | 理由 |
|------|------|------|
| 2025-01 | Kernel を `.ai/kernel/` に分離 | 環境差分の管理を容易にするため |
| 2025-01 | TOML + MD でエージェント定義 | Codex (TOML) と Claude (MD) の双方に対応 |
| 2025-06 | Gate state persistence 導入 | ゲートがガイダンスのみで強制力がなかった問題を解決 |
| 2025-06 | challenge metadata 拡充 | 高リスクルールの品質保証を自動化 |
| 2025-06 | deprecated/prefer lifecycle | スキル/ルールの段階的廃止を安全に管理 |
| 2025-06 | deploy.ps1 に Watch/Backup 追加 | 開発体験の向上とロールバック安全性の確保 |
| 2025-06 | validate.ps1 を 13 checks に拡張 | 重複検出、エージェントバージョン、説明品質の検証 |
