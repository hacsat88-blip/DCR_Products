# DCR Products

AI エージェント設定・ルール・スキルの一元管理リポジトリ。

## まずここだけ

迷ったら、モデル別フォルダではなく次の順で見る。

| やりたいこと | 最初に見る場所 | 編集してよい場所 |
| ------------ | -------------- | ---------------- |
| 共通ルール・スキル・エージェントを変える | `.ai/20_SOURCE/README.md` | `.ai/assets/rules/`, `.ai/assets/skills/`, `.ai/assets/agents/` |
| 全環境共通の応答・権限・トリガーを変える | `.ai/kernel/README.md` | `.ai/kernel/` |
| エディタ / CLI 固有の差分を変える | `.ai/environments/README.md` | `.ai/environments/<tool>/kernel.md` |
| Product 固有の作業をする | `Product/README.md` | `Product/<product>/` |
| 配置や運用境界を確認する | `docs/dcr/reference/control-surface.md` | `.dcr/`, `docs/dcr/` |

`AGENTS.md`, `CLAUDE.md`, `.github/`, `.cursor/`, `.claude/agents/`, `.codex/agents/` は入口または生成ミラーです。大本の親ではありません。大量生成される mirror は Git 管理外で、`deploy.ps1` から再生成します。

## 対応エディタ / CLI

| ツール             | エントリポイント                  | 大本 |
| ------------------ | --------------------------------- | ---- |
| VS Code Copilot    | `.github/copilot-instructions.md` | `.ai/` |
| Cursor             | `.cursor/rules/dcr-kernel.mdc`    | `.ai/` |
| GitHub Copilot CLI | `AGENTS.md`                       | `.ai/` |
| Codex              | `AGENTS.md`                       | `.ai/` |
| Claude Code        | `CLAUDE.md`                       | `.ai/` |

## モデル差分の置き場所

ルール本文はモデル別に分けません。共通ルール・スキル・エージェントの正本は `.ai/assets/rules/`, `.ai/assets/skills/`, `.ai/assets/agents/` に置き、モデル差分は実行メタデータだけに閉じ込めます。

- Codex agent のモデル指定: `.ai/assets/agents/*.toml` と生成先 `.codex/agents/*.toml`
- 例: `model`, `model_reasoning_effort`, `sandbox_mode`
- Claude / Copilot / Cursor はエディタ側で選択中のモデルが入口ファイルを読むため、ルール本文をモデル別に複製しない

## 運用クイックガイド

- Execution Modes を全環境で共通運用: タスク先頭に `autopilot:`, `ralph:`, `ulw`, `ralplan:`, `deep-interview:`, `ultrathink:`, `deepsearch:`, `team:` を付けて実行戦略を宣言する
- **日次更新**: 毎朝 `pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check` でドリフト確認 -> 変更があれば `pwsh -ExecutionPolicy Bypass -File .\deploy.ps1` で同期 -> `pwsh -ExecutionPolicy Bypass -File .\validate.ps1` で全通過を確認してからコミットする
- **検証ゲート**: 実装後は `pwsh -ExecutionPolicy Bypass -File .\validate.ps1` の `RESULT: ... passed, 0 failed` と `pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check` の `in sync` を確認してからコミット・PR を作成する
- Azure Skills は DCR の置換ではなく、Azure 専用タスクのための external capability pack として扱う
- Azure architecture / deploy / diagnostics / compliance / cost / RBAC / Kusto / Foundry は、まず Azure Skills plugin の利用可否を確認する
- Azure Skills を使えない場合は、DCR の `azure-infra-engineer`, `mcp-builder`, `security-engineer`, `devops-automator` などへフォールバックする
- Superpowers は DCR に取り込まず、外部公式パッケージとして扱う。ローカル改変は `tools/check-external-superpowers.ps1` と `validate.ps1` で検知する
- agentmemory など runtime memory backend は任意の補助層として扱う。過去判断の recall と小さな決定保存に使い、`.ai/catalog` / `.ai/assets/books` の正本を置換しない
- GBrain は memory/runtime 候補として `external-tool-poc` + `concept-import` 扱いにする。runtime、MCP設定、43 skills は入れず、brain-first recall / gap analysis / skill evaluation の考え方だけ参照する
- taste-skill は frontend / visual design skillpack の `concept-import` として扱う。installer や外部 SKILL 群は入れず、design read / anti-default / image-first reference の考え方だけを既存 UI 方針に薄く反映する
- GSD は runtime や `.planning/` を入れず、phase/state/decision/verify/wave/namespace の考え方だけを DCR skill として薄く取り込む

詳細な共通仕様は `.ai/core/modules/unified-integration.md` を参照。

## 初回セットアップ

clone 直後は大量生成 mirror が Git 管理外なので、最初に生成と検証を行います。

```powershell
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
pwsh -ExecutionPolicy Bypass -File .\validate.ps1
```

PowerShell 実行系は PowerShell 7 (`pwsh`) を標準とする。Windows PowerShell 5.1 (`powershell.exe`) は非推奨で、UTF-8 日本語を含むスクリプトを誤解釈する可能性がある。`.ps1` / `.psm1` / `.psd1` の実行ログには `[OK]`, `[WARN]`, `[STOP]` などの ASCII マーカーを使い、絵文字・装飾記号は入れない。

`.codex/agents/`, `.claude/agents/` が無い場合も異常ではありません。`deploy.ps1` が `.ai/kernel/` と source assets から再生成します。

## 開発ワークフロー標準

- **統合運用ドキュメント**: [docs/dcr/development-workflow.md](docs/dcr/development-workflow.md)
  - 3段階運用モデル（ローカル開発 -> 小PR化 -> リリース前自動検証）
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
- 新規 Product の最小構成テンプレート: `templates/product/`

必要時だけ見る補助入口:

- 個人的な記録・スナップショット（任意）: `docs/snapshots/` - repo の正本層とは別目的のファイル用
- 個人上書き: `CLAUDE.local.md`（薄い入口）, `.claude/local/CLAUDE.local.md`（実体）, `.claude/settings.local.json`（いずれも Git 管理外）
- Claude 補助コマンド: `.claude/commands/review.md`, `.claude/commands/fix.md`
- 外部連携設定: `.mcp.json`

最短運用手順（毎日これだけ）:

1. `pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check`
2. `pwsh -ExecutionPolicy Bypass -File .\validate.ps1`
3. 変更がある場合のみ `pwsh -ExecutionPolicy Bypass -File .\deploy.ps1` 実行 -> 再検証

`git fetch` で警告が再発した場合の手順は `docs/dcr/instruction-governance.md` を参照。

Step 7（運用観測）の記録テンプレートは `docs/dcr/operation-metrics-weekly.md` を参照。

## AI Editor Discovery Order

複数の AI エディタが同じ構造判断に到達したいときは、次の順で見る。

1. shared source-of-truth の入口: `.ai/00_START_HERE.md`
2. Product 固有作業の入口: `Product/README.md`
3. `.dcr/` と `docs/dcr/` の運用面: `docs/dcr/reference/control-surface.md`
4. 配置ルールの安定参照: `docs/dcr/reference/repo-layout.md`
5. 実行と検証の順序: `docs/dcr/development-workflow.md`

判断原則:

- shared rule / skill / agent source を触るなら `.ai/20_SOURCE/README.md` から始める
- Product 固有の変更なら `Product/README.md` から `Product/<product>/` へ入る
- `.dcr/` と `docs/dcr/` は 1 つの control surface として読むが、machine-readable config と human-readable docs なので物理的には分ける
- `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.claude/agents/`, `.codex/agents/` は generated mirror なので最初の編集対象にしない
- workspace 既定設定では generated mirror、archive、外部 clone を探索ノイズとして抑える

## 構造

```text
Source layer
  .ai/              共通カーネル・モジュール・構造マップ
  .ai/kernel/       全環境共通カーネルの正本
  .ai/environments/ エディタ / CLI 固有差分の正本
  .ai/catalog/      共有 source-of-truth の親フォルダ
  .ai/kernel/gates/ トリガーゲート (a/ i/ r/ s/ d/ p/ q/ sh/)
  DESIGN.md         UI/UX の見た目とトーンの正本
  .ai/assets/rules/         エージェントルールの正本
  .ai/assets/skills/        スキル定義の正本
  .ai/assets/agents/        エージェント定義の正本
  templates/        init-project.ps1 用テンプレート入力

Runtime / generated layer
  .github/          VS Code Copilot 実行エントリポイント
  .claude/agents/   Claude 用ローカル生成ミラー (Git 管理外)
  .codex/agents/    Codex 用ローカル生成ミラー (Git 管理外)
  AGENTS.md         Codex / GitHub Copilot CLI 実行エントリポイント
  CLAUDE.md         Claude Code 実行エントリポイント

Workspace / operations layer
  .vscode/          ワークスペース設定
  docs/             設計・仕様・計画書
  docs/snapshots/   任意の個人メモ・時点スナップショット（正本層外）
  deploy.ps1        エディタへの一方向同期
  validate.ps1      source assets の構造検証
  init-project.ps1  新規プロジェクト初期化
```

詳細は [.ai/repo-map.md](.ai/repo-map.md) を参照。

## デプロイ

```powershell
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1                    # 既定エディタへ同期
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Target vscode     # VS Code のみ
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -DryRun            # 確認のみ
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check             # ドリフト検出
```

## 迷わない運用境界 (推奨)

### 正本層（Source of Truth）- これを編集する

- `.ai/assets/rules/` - エージェントルール定義
- `.ai/assets/skills/` - スキル定義
- `.ai/assets/agents/` - エージェント定義
- `.ai/kernel/` - 全環境共通カーネル、権限、トリガー、環境差分
- `.ai/environments/` - VS Code Copilot / Claude Code / Copilot CLI / Codex の環境固有差分
- `templates/` - `init-project.ps1` 用の入力テンプレート

役割の境界:

- `.ai/assets/rules/` は invariant、routing、handoff policy を置く
- `.ai/assets/skills/` は再利用可能な workflow、generator、analysis method を置く
- `.ai/assets/agents/` は runtime persona と execution specialist の定義を置く

### 生成物層（Generated）- 直接編集しない WARN

- **`AGENTS.md`** ← `deploy.ps1` で自動生成（Copilot CLI / Codex 用）
- **`CLAUDE.md`** ← `deploy.ps1` で自動生成（Claude Code 用）
- `.github/copilot-instructions.md` ← `deploy.ps1` で自動生成（VS Code Copilot 用）
- `.claude/agents/` ← `deploy.ps1` で自動生成（Git 管理外）
- `.codex/agents/` ← `deploy.ps1` で自動生成（Git 管理外）

**生成物層の特性**: `deploy.ps1` 実行時に完全上書きされます。手編集は次回デプロイで失われます。大量生成 mirror は `.gitignore` で除外し、正本の重複を避けます。

### ユーザーレベル managed target - `deploy.ps1` が上書きする

- `%USERPROFILE%/.agents/skills`
- `%HOME%/.config/dcr/config.json`

これらは runtime cache ではなく deploy target です。正本はこの repo にあり、user-level 側の手編集は次回 deploy で上書きされます。

### 外部 capability pack - DCR に取り込まない

- 外部 Skill / Agent / MCP / CLI / workflow repo を提示された場合は、まず `external-capability-intake` で `skip / concept-import / selective-source-import / immutable-upstream / external-tool-poc` に分類する
- かなり有用だが DCR 側で改修すると upstream 追随が壊れるものは、Superpowers 型の `immutable-upstream` として扱い、改修不可の外部正本・drift/update check・provenance だけを DCR に置く
- `Superpowers` は外部公式パッケージとして扱う
- 既定の upstream mirror: `%USERPROFILE%/.codex/superpowers`
- 更新は upstream への fast-forward のみを許可し、DCR の `.ai/catalog/` へコピーして正本化しない
- ローカル改変検知: `pwsh -ExecutionPolicy Bypass -File .\tools\check-external-superpowers.ps1`
- `validate.ps1` は Superpowers checkout が存在する環境では同じ drift check を実行し、存在しない環境ではスキップする
- `agentmemory` は外部 runtime memory backend 候補として扱う。MCP/REST server、hooks、DB、npm package を repo 正本へ直接取り込まず、利用可能な環境だけで memory preflight / memory save を行う
- `garrytan/gbrain` は外部 memory/runtime 候補として扱う。GBrain の 43 skills、`RESOLVER.md`、installer、Bun runtime、MCP config、remote token、OAuth、ingestion、cron/dream cycle は入れず、repo 外または Product 単位の非破壊 PoC 後に判断する
- `Leonxlnx/taste-skill` は frontend / visual design skillpack の参照元として扱う。`npx skills add`、外部 SKILL.md 群、`design-taste-frontend` / `gpt-taste` / `image-to-code` の active skill 化は行わず、DCR `DESIGN.md` と `ui-ux-pro-max` を優先する
- `GSD` は外部 spec-driven workflow 参照元として扱う。GSD command runtime と `.planning/` は入れず、DCR skill の `metadata.origin` に provenance を残す
- `mattpocock/skills` は外部 engineering-method skill 参照元として扱う。`skills.sh`、setup command、Claude 固有 slash command は入れず、grill / zoom-out / diagnose / handoff の考え方だけを DCR skill として薄く取り込む
- `addyosmani/agent-skills` は lifecycle skill pack の比較対象として扱う。installer、plugin、slash command、agent persona は入れず、DCR / Superpowers / OpenAI Skills で未充足の checklist / workflow 観点だけを selective reference とする
- `colbymchenry/codegraph` は skill 正本ではなく optional external code intelligence / MCP tool 候補として扱う。`.ai/catalog` へ取り込まず、必要時に `codegraph install --print-config codex` などの非破壊確認と小さな PoC 後に採用判断する
- `multica-ai/andrej-karpathy-skills` は単体 `CLAUDE.md` として導入しない。推測しない、単純さ優先、surgical change、目標駆動の原則は既存の AGENTS / kernel / editing constraints で covered-by-existing-policy とする

### 設定層（Configuration）- 個人設定のみ

- `.claude/settings.local.json` - Claude Code の個人設定（Git 管理外）
- `.claude/local/CLAUDE.local.md` - 個人運用ガイド実体（Git 管理外）
- `CLAUDE.local.md` - ルート固定の薄い入口（Git 管理外）

### その他のルール

- `templates/` は `init-project.ps1` の入力契約であり、スクリプト更新なしに削除しない
- repo 全体の置き場所に迷ったら `docs/dcr/reference/repo-layout.md` を先に参照する
- 新規 active spec / plan は `docs/dcr/specs/` と `docs/dcr/plans/` の直下へ保存し、完了済み・低頻度文書だけ `archive/` へ移す
- 外部/検証系リポジトリは DCR 本体と分離する
- `Product/` 配下の standalone clone は DCR の正本に含めない。併置する場合も external path として ignore し、shared 化が必要な asset だけ `.ai/assets/rules/` / `.ai/assets/skills/` / `.ai/assets/agents/` へ昇格する

unsafe migration と見なすもの:

- `.ai/assets/rules/` を runtime/generated 配下へ移す
- `.ai/assets/skills/` を runtime/generated 配下へ移す
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

将来 `.github/instructions/` を追加することは可能だが、これは VS Code Copilot 専用の補助レイヤーであり、このリポジトリでは `.ai/assets/rules/` や `.ai/assets/skills/` の正本を置き換えない。

構成移行が必要になった場合の安全な順序:

1. 新パスへ copy する
2. `deploy.ps1`, `validate.ps1`, `init-project.ps1` を両対応にする
3. `deploy.ps1 -Check` と `validate.ps1` を通す
4. ドキュメントを切り替える
5. 後続変更で旧パスを削除する

move と overwrite と delete を一発で行うコマンドによる構成移行は、このリポジトリでは許容しない。
