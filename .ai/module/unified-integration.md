# Unified Integration Module

このモジュールは、VS Code の GitHub Copilot、GitHub Copilot CLI、Codex、Windsurf、Claude Code の
5環境で同じ運用を再現するための共通仕様です。

## 目的

- 環境差分で運用品質がぶれないようにする
- gstack 的な「計画 → 実装 → レビュー → QA → 出荷」の流れを共通化する
- 既存の `.ai/catalog/rules/` と `.ai/catalog/skills/` を活かし、全面置換ではなく統合で進める
- 全モデルで同じ思考と実行判断を再現し、個性・口調・利用可能ツールだけを環境差分として残す

## Shared Book Rule

`.ai/kernel/_base.md` を共通正本とし、環境別 kernel は次だけを書く。

- entrypoint と自動ロード仕様
- 使えるツール・使えないツール
- セッション状態や計画の保存先
- 口調、表示密度、UI 制約

判断基準、trigger 解釈、権限、gate、外部確認条件、検証姿勢は環境別に再定義しない。差分が必要な場合も、共通正本への追加可否を先に検討する。

## Common Flow

1. `p/` Plan Gate
   - `.ai/catalog/skills/writing-plans` を優先
   - 3ステップ以上は計画を明示してから実装
2. 実装
   - 既存の skill と rules の優先順位に従う
3. `a/` Review Gate
   - 既存 review/debug ルールを適用
4. `q/` QA Gate
   - `.ai/catalog/skills/webapp-testing` を優先
   - 画面検証は証跡を残す
5. `sh/` Ship Gate
    - `.ai/catalog/skills/verification-before-completion` と
       `.ai/catalog/skills/finishing-a-development-branch` を優先

## Execution Modes (共通定義)

全環境で使用可能なキーワードプレフィクス。tmux 不要、動作戦略の宣言のみ。

| Keyword           | Mode                 | 適用環境                                    |
| ----------------- | -------------------- | ------------------------------------------- |
| `autopilot:`      | 自律実行             | VS Code / Copilot CLI / Claude Code / Codex |
| `ralph:`          | 完了保証ループ       | 同上（`ulw` 内包）                          |
| `ulw`             | 超並列バッチ処理     | 同上                                        |
| `ralplan:`        | 反復プラン精度向上   | 同上                                        |
| `deep-interview:` | ソクラテス式要件整理 | 同上                                        |
| `ultrathink:`     | 深層推論             | 同上                                        |
| `deepsearch:`     | コード全域調査       | 同上                                        |
| `team:`           | チームパイプライン   | 同上                                        |

## Team Pipeline（チームパイプライン詳細）

`team:` プレフィクス使用時、または大規模実装タスクで自動適用:

```
team-plan → team-prd → team-exec → team-verify → team-fix (loop)
```

| フェーズ    | 内容                   | DCR対応                                |
| ----------- | ---------------------- | -------------------------------------- |
| team-plan   | 要件分析・依存関係整理 | p/ Plan Gate                           |
| team-prd    | 実装仕様書（PRD）生成  | writing-plans skill                    |
| team-exec   | 実装（チャンク分割）   | P2実行                                 |
| team-verify | 全チェックリスト検証   | q/ QA Gate                             |
| team-fix    | 不合格項目修正ループ   | systematic-debugging skill → re-verify |

## Canonical Priority

1. ユーザーの明示要求
2. skills
3. rules
4. 直接処理

## Unified Coordinator（統一調整層）

**全タスクの入口**は [pied-piper](../catalog/agents-source/pied-piper.md) agent で受ける。
詳細は [unified-coordinator.md](unified-coordinator.md) と [unified-router.md](unified-router.md) を参照。

採用前に以下3行報告を必ず先に出す：

```
🎯 採用：<rule|skill|agent名>（信頼度 0.XX）
📌 理由：<routing_category 一致 + match keywords/domain>
✨ 期待効果：<1行で見込まれる成果物・短縮時間・品質ゲート>
```

旧オーケストレーター（workflow-orchestrator / multi-agent-coordinator / task-distributor）は
すべて pied-piper に統合済み。alias 経由で旧名呼び出しも動作する。

## External Capability Packs

外部 plugin / skill pack は DCR の置換ではなく、ドメイン特化の拡張として扱う。

### Azure Skills plugin

- 位置づけ: Azure 専用 capability pack
- 役割: Azure workflows, Azure MCP Server, Foundry MCP を提供する実行専門層
- DCR との関係: DCR が制御層、Azure Skills が Azure 専門層

### Routing Rule

以下に強く一致する場合、Azure Skills plugin の利用可否を先に確認する:

- Azure architecture / service selection
- Azure prepare / validate / deploy workflows
- Azure diagnostics / observability / compliance
- Azure cost optimization
- Azure RBAC / storage / Kusto
- Microsoft Foundry / model deployment / agent workflows

利用可能な場合:

- Azure 専用 guidance と MCP 実行は Azure Skills を優先
- ただし signal protocol, permission model, p/ → q/ → sh/ は DCR を維持する

利用不可の場合:

- `azure-infra-engineer`, `mcp-builder`, `security-engineer`, `devops-automator` など既存 DCR 資産へフォールバックする

## Notes

- Copilot CLI は `AGENTS.md` を入口とし、CLI 固有差分は `.ai/environments/copilot-cli/kernel.md` を参照する
- VS Code Copilot は `.github/copilot-instructions.md` を優先
- Codex は `AGENTS.md` を優先
- Windsurf は `.windsurf/rules/`（`deploy.ps1` 生成）を優先
- Claude Code は `CLAUDE.md` を優先
- ただし、上記5つはこのモジュールを共通参照し、差分を最小化する
