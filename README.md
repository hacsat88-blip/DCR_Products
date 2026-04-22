# DCR Products

AI エージェント設定・ルール・スキルの一元管理リポジトリ。

## 対応エディタ / CLI

| ツール               | エントリポイント                  |
| -------------------- | --------------------------------- |
| VS Code Copilot      | `.github/copilot-instructions.md` |
| GitHub Copilot CLI   | `AGENTS.md`                       |
| Codex                | `AGENTS.md`                       |
| Claude Code          | `CLAUDE.md`                       |
| Cursor               | `.cursor/rules/`                  |
| Gemini / Antigravity | `.gemini/settings.json`           |

## 運用クイックガイド

- Execution Modes を全環境で共通運用: タスク先頭に `autopilot:`, `ralph:`, `ulw`, `ralplan:`, `deep-interview:`, `ultrathink:`, `deepsearch:`, `team:` を付けて実行戦略を宣言する
- **日次更新**: 毎朝 `deploy.ps1 -Check` でドリフト確認 → 変更があれば `deploy.ps1` で同期 → `validate.ps1` で全通過を確認してからコミットする
- **検証ゲート**: 実装後は `validate.ps1` の `RESULT: ... passed, 0 failed` と `deploy.ps1 -Check` の `in sync` を確認してからコミット・PR を作成する
- Azure Skills は DCR の置換ではなく、Azure 専用タスクのための external capability pack として扱う
- Azure architecture / deploy / diagnostics / compliance / cost / RBAC / Kusto / Foundry は、まず Azure Skills plugin の利用可否を確認する
- Azure Skills を使えない場合は、DCR の `azure-infra-engineer`, `mcp-builder`, `security-engineer`, `devops-automator` などへフォールバックする

詳細な共通仕様は `.ai/module/unified-integration.md` を参照。

## 開発ワークフロー標準

- **統合運用ドキュメント**: [docs/dcr/development-workflow.md](docs/dcr/development-workflow.md)
  - 3段階運用モデル（ローカル開発 → 小PR化 → リリース前自動検証）
  - 必須チェックリスト
  - Branch Protection推奨設定
  - Copilot Agent 自動化オプション
- **PRテンプレート**: [.github/pull_request_template.md](.github/pull_request_template.md)
  - 背景・変更内容・テスト結果の必須記載
  - Pre-Review チェックリスト

## 個人運用の入口 (Step 6)

- 運用方針の正本: `docs/dcr/instruction-governance.md`
- `.dcr/` と `docs/dcr/` の共通入口: `docs/dcr/reference/control-surface.md`
- 構成の安定リファレンス: `docs/dcr/reference/repo-layout.md`
- 構成の理想形: `docs/dcr/specs/2026-04-21-dcr-target-repo-layout-design.md`
- 新規 Product の最小構成: `Product/_template/`

必要時だけ見る補助入口:

- 個人上書き: `CLAUDE.local.md`, `.claude/settings.local.json`（どちらも Git 管理外）
- Claude 補助コマンド: `.claude/commands/review.md`, `.claude/commands/fix.md`
- 外部連携設定: `.mcp.json`

最短運用手順（毎日これだけ）:

1. `powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check`
2. `powershell -ExecutionPolicy Bypass -File .\validate.ps1`
3. 変更がある場合のみ `deploy.ps1` 実行 → 再検証

`git fetch` で警告が再発した場合の手順は `docs/dcr/instruction-governance.md` を参照。

Step 7（運用観測）の記録テンプレートは `docs/dcr/operation-metrics-weekly.md` を参照。

## AI Editor Discovery Order

複数の AI エディタが同じ構造判断に到達したいときは、次の順で見る。

1. shared source-of-truth の入口: `.ai/catalog/README.md`
2. Product 固有作業の入口: `Product/README.md`
3. `.dcr/` と `docs/dcr/` の運用面: `docs/dcr/reference/control-surface.md`
4. 配置ルールの安定参照: `docs/dcr/reference/repo-layout.md`
5. 実行と検証の順序: `docs/dcr/development-workflow.md`

判断原則:

- shared rule / skill / agent source を触るなら `.ai/catalog/` から始める
- Product 固有の変更なら `Product/README.md` から `Product/<product>/` へ入る
- `.dcr/` と `docs/dcr/` は 1 つの control surface として読むが、machine-readable config と human-readable docs なので物理的には分ける
- `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/`, `.claude/agents/`, `.codex/agents/` は generated mirror なので最初の編集対象にしない
- workspace 既定設定では generated mirror、archive、外部 clone を探索ノイズとして抑える

## 構造

```text
Source layer
  .ai/              共通カーネル・モジュール・構造マップ
  .ai/catalog/      共有 source-of-truth の親フォルダ
  .ai/kernel/gates/ トリガーゲート (a/ i/ r/ s/ d/ p/ q/ sh/)
  DESIGN.md         UI/UX の見た目とトーンの正本
  .ai/catalog/rules/        エージェントルールの正本
  .ai/catalog/skills/       スキル定義の正本
  .ai/catalog/agents-source/ エージェント定義の正本
  templates/        init-project.ps1 用テンプレート入力

Runtime / generated layer
  .github/          VS Code Copilot 実行エントリポイント
  .cursor/rules/    Cursor 用生成ミラー (.mdc)
  .claude/agents/   Claude 用生成ミラー
  .codex/agents/    Codex 用生成ミラー
  AGENTS.md         Codex / GitHub Copilot CLI 実行エントリポイント
  CLAUDE.md         Claude Code 実行エントリポイント

Workspace / operations layer
  .vscode/          ワークスペース設定
  docs/             設計・仕様・計画書
  deploy.ps1        エディタへの一方向同期
  validate.ps1      source assets の構造検証
  init-project.ps1  新規プロジェクト初期化
```

詳細は [.ai/repo-map.md](.ai/repo-map.md) を参照。

## デプロイ

```powershell
.\deploy.ps1                    # 全エディタへ同期
.\deploy.ps1 -Target vscode     # VS Code のみ
.\deploy.ps1 -Target cursor     # Cursor のみ
.\deploy.ps1 -DryRun            # 確認のみ
.\deploy.ps1 -Check             # ドリフト検出
```

## 迷わない運用境界 (推奨)

### 正本層（Source of Truth）— これを編集する

- `.ai/catalog/rules/` — エージェントルール定義
- `.ai/catalog/skills/` — スキル定義
- `.ai/catalog/agents-source/` — エージェント定義
- `templates/` — `init-project.ps1` 用の入力テンプレート

役割の境界:

- `.ai/catalog/rules/` は invariant、routing、handoff policy を置く
- `.ai/catalog/skills/` は再利用可能な workflow、generator、analysis method を置く
- `.ai/catalog/agents-source/` は runtime persona と execution specialist の定義を置く

### 生成物層（In-Repo Generated）— 直接編集しない ⚠️

- **`AGENTS.md`** ← `deploy.ps1` で自動生成（Copilot CLI / Codex 用）
- **`CLAUDE.md`** ← `deploy.ps1` で自動生成（Claude Code 用）
- `.github/copilot-instructions.md` ← `deploy.ps1` で自動生成（VS Code Copilot 用）
- `.cursor/rules/*.mdc` ← `deploy.ps1` で自動生成（Cursor 用）
- `.claude/agents/` ← `deploy.ps1` で自動生成
- `.codex/agents/` ← `deploy.ps1` で自動生成

**生成物層の特性**: `deploy.ps1` 実行時に完全上書きされます。手編集は次回デプロイで失われます。

### ユーザーレベル managed target — `deploy.ps1` が上書きする

- `%USERPROFILE%/.agents/skills`
- `%USERPROFILE%/.cursor/rules`
- `%HOME%/.config/dcr/config.json`

これらは runtime cache ではなく deploy target です。正本はこの repo にあり、user-level 側の手編集は次回 deploy で上書きされます。

### 設定層（Configuration）— 個人設定のみ

- `.claude/settings.local.json` — Claude Code の個人設定（Git 管理外）
- `CLAUDE.local.md` — 個人運用ガイド（Git 管理外、参考例）

### その他のルール

- `templates/` は `init-project.ps1` の入力契約であり、スクリプト更新なしに削除しない
- repo 全体の置き場所に迷ったら `docs/dcr/reference/repo-layout.md` を先に参照する
- 新規 active spec / plan は `docs/dcr/specs/` と `docs/dcr/plans/` の直下へ保存し、完了済み・低頻度文書だけ `archive/` へ移す
- 外部/検証系リポジトリは DCR 本体と分離する
- `Product/` 配下の standalone clone は DCR の正本に含めない。併置する場合も external path として ignore し、shared 化が必要な asset だけ `.ai/catalog/rules/` / `.ai/catalog/skills/` / `.ai/catalog/agents-source/` へ昇格する

unsafe migration と見なすもの:

- `.ai/catalog/rules/` を `.cursor/` 配下へ移す
- `.ai/catalog/skills/` を `.cursor/` 配下へ移す
- `templates/` を削除する
- `templates/vscode-copilot/.github/copilot-instructions.md` で `.github/copilot-instructions.md` を上書きする

上記は `deploy.ps1`, `validate.ps1`, `init-project.ps1` の参照先を同時に更新しない限り実施しない。

安全フロー:

1. 正本を編集する
2. `deploy.ps1 -Target ...` で反映する
3. `deploy.ps1 -Check` で整合性を確認する
4. 問題なければコミットする

注意:

- `prototypes/` や外部クローンを同じルートに置く場合、検索・コミット対象を毎回明示して誤操作を防ぐ
- `~/.config/dcr/worktrees/` などのセッション生成物は Git 管理対象にしない
- リポジトリ内の `.dcr/` は実行時生成物ではなく、DCR 設定とテンプレートの正本として扱う

将来 `.github/instructions/` を追加することは可能だが、これは VS Code Copilot 専用の補助レイヤーであり、このリポジトリでは `.ai/catalog/rules/` や `.ai/catalog/skills/` の正本を置き換えない。

構成移行が必要になった場合の安全な順序:

1. 新パスへ copy する
2. `deploy.ps1`, `validate.ps1`, `init-project.ps1` を両対応にする
3. `deploy.ps1 -Check` と `validate.ps1` を通す
4. ドキュメントを切り替える
5. 後続変更で旧パスを削除する

move と overwrite と delete を一発で行うコマンドによる構成移行は、このリポジトリでは許容しない。
