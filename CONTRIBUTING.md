# Contributing to DCR Products

## はじめに

DCR Products は AI プロンプト・エージェント構成を管理するリポジトリです。
VS Code Copilot, Copilot CLI, Claude Code, Codex, Cursor の5環境に対応しています。

## ディレクトリ構造

| Layer     | Path                                                                      | 説明                                              |
| --------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| Source    | `.ai/catalog/rules/`, `.ai/catalog/skills/`, `.ai/catalog/agents-source/` | 編集対象の正本                                    |
| Kernel    | `.ai/kernel/`                                                             | 共通仕様の正本（_base.md, gates/, environments/） |
| Runtime   | `.github/`, `AGENTS.md`, `CLAUDE.md`                                      | エディタが読む入口                                |
| Generated | `.cursor/rules/*.mdc`, `.claude/agents/`, `.codex/agents/`                | deploy.ps1 の出力（手編集禁止）                   |

## 最初に見る場所

複数の AI エディタや contributor が同じ判断順で repo を読むため、次を既定の入口にします。

1. shared source-of-truth: `.ai/catalog/README.md`
2. Product 固有作業: `Product/README.md`
3. 配置ルール: `docs/dcr/reference/repo-layout.md`
4. 実行・検証: `docs/dcr/development-workflow.md`

generated mirror や archive は既定の探索起点にしません。

## ルールの追加・変更

### 新しいルールを追加する

1. `.ai/catalog/rules/<name>.md` を作成する
2. YAML frontmatter を記述する（必須: `description`, `domain`, `routing_category`, `risk`, `keywords`）
3. `inherits:` で継承する trait を指定する（コード生成ルールは `coding-standards` を推奨）
4. `pwsh -ExecutionPolicy Bypass -File .\validate.ps1 -Verbose` を実行して構造チェックを通過させる（検証項目はスクリプト改修により増減し得ます）
5. `pwsh -ExecutionPolicy Bypass -File .\deploy.ps1` を実行して各エディタへ配布する

### frontmatter テンプレート

```yaml
---
description: [ロールの概要を日本語で]
domain: [single English slug]
routing_category: growth | documents | ui-ux | devops | governance
risk: low | medium | high
keywords:
  - [keyword1]
  - [keyword2]
pair_with:
  - [companion-role]
avoid_with:
  - [conflicting-role]
inherits:
  - coding-standards
  - testing-standards
---
```

## スキルの追加・変更

### 新しいスキルを追加する

1. `.ai/catalog/skills/<name>/SKILL.md` を作成する
2. YAML frontmatter に `name`, `description` を記述する（任意: `contract`, `composable`, `package`）
3. ルーティングや依存関係を変える場合は [.ai/module/unified-router.md](.ai/module/unified-router.md) の決定木に沿い、pied-piper 経由の 3 行報告（採用名・理由・期待効果）を前提にする（旧 skill-router は deprecated）
4. `pwsh -ExecutionPolicy Bypass -File .\validate.ps1 -Verbose` で検証する

## エージェントの追加

1. `.ai/catalog/agents-source/<name>.toml` と `.ai/catalog/agents-source/<name>.md` を作成する
2. `.toml` には必須フィールド: `name`, `description`, `version`
3. `pwsh -ExecutionPolicy Bypass -File .\validate.ps1` で検証する

## 検証とデプロイ

**Windows ローカル**: PowerShell 実行系は **PowerShell 7（`pwsh`）** を標準とします。Windows PowerShell 5.1（`powershell.exe`）は UTF-8 日本語を含む `.ps1` を誤解釈する可能性があるため非推奨です。PowerShell 実行ファイルのステータス表示は `[OK]`, `[WARN]`, `[STOP]` などの ASCII マーカーに統一し、絵文字・装飾記号は入れません。

```powershell
# 構造検証
pwsh -ExecutionPolicy Bypass -File .\validate.ps1 -Verbose

# デプロイ（すべてのターゲット: VS Code + Cursor + Agents）
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1

# エージェントのみデプロイ
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Target agents

# デプロイ前にバックアップ
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Backup

# ファイル変更を監視して自動デプロイ
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Watch
```

## コミット規約

- Conventional Commits に従う: `feat:`, `fix:`, `docs:`, `chore:`
- 1タスク1コミットを原則とする
- コミット前に `pwsh -ExecutionPolicy Bypass -File .\validate.ps1` を実行する

## Gate Chain

大きな変更は以下のゲートチェーンに従う:

1. **p/ (Plan Gate)** — スコープと計画を確定
2. **実装** — 計画に沿って変更
3. **q/ (QA Gate)** — 証跡ベースで検証
4. **sh/ (Ship Gate)** — q/ 通過後に出荷判断

## 権限モデル

| Level | 内容                 | 例                                   |
| ----- | -------------------- | ------------------------------------ |
| P1    | 自律実行（報告不要） | ファイル読み取り、検索、git status   |
| P2    | 実行→事後報告        | ファイル編集、新規作成               |
| P3    | 計画→承認→実行       | ファイル削除、依存関係変更、設定変更 |
