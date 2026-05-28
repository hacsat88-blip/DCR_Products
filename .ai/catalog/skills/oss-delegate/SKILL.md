---
name: oss-delegate
description: OSSモデルへのタスク委任フロー。ユーザー確認→承認→MCP実行のハイブリッドモデル。
triggers:
  - "OSSに"
  - "安いモデルで"
  - "委任して"
  - "OpenCodeで"
  - "DeepSeekで"
  - "DeepSeek Flashで"
  - "DeepSeek Proで"
  - "Kimiで"
  - "GLMで"
  - "コスト削減"
targets:
  - codex
  - claude
  - cursor
  - windsurf
mcp_server: opencode-bridge
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
  - windsurf
  - opencode
  - gemini-cli
---

# OSSモデル委任スキル

OpenCode Go API 経由のOSSモデル（Kimi K2.6 / DeepSeek V4 Flash / DeepSeek V4 Pro / GLM-5.1）に
タスクを委任するための判断ルールと実行フローを定義する。

`task` と `context` は外部の OpenCode Go API に送信される。秘密情報、認証情報、顧客データ、
未公開の事業情報、外部共有できないソースコードは渡さないこと。

## 利用可能なMCPツール

| ツール | モデル | 用途 |
|---|---|---|
| `oss_explore` | Kimi K2.6 | コード探索・要約・呼び出し関係調査 |
| `oss_document` | DeepSeek V4 Flash | ドキュメント生成・CHANGELOG・翻訳・コメント |
| `oss_implement` | DeepSeek V4 Pro | 単体テスト作成・限定実装・リファクタリング提案 |
| `oss_agentic` | GLM-5.1 | 複数ステップの実装計画・検証戦略・リスク分解 |

---

## 実行フロー

### パターンA: ユーザーが明示的に要求 → 確認なしで即実行

**トリガーキーワード**: 「OSSに」「安いモデルで」「委任して」「OpenCodeで」「DeepSeekで」「DeepSeek Flashで」「DeepSeek Proで」「Kimiで」「GLMで」

```
User: 「OSSでこのファイルの関数一覧を出して」
Claude: → oss_explore ツールを直接呼び出す → 結果を報告
```

明示モデル名がある場合（例: `OpenCodeの glm-5.1 で...`）は、タスク種別に合うツールを選び、
指定モデル名を `model_override` に渡す。

`DeepSeek Flashで...` は `oss_document`、`DeepSeek Proで...` は `oss_implement` を優先する。
`DeepSeekで...` のように曖昧な場合は、要約・文書化なら `oss_document`、コード・テスト案なら
`oss_implement` を使う。

### パターンB: 主担当AIが自動判断 → ユーザー確認 → 承認後に実行

**条件**: タスクが下記の「委任推奨条件」に該当し、ユーザーが明示要求していない場合

```
主担当AI: タスクの性質を分析
主担当AI: 利用可能な確認UIまたは通常の質問で委任提案
User:  「委任する」を選択
主担当AI: → MCPツール実行 → 結果統合 → ユーザーに報告
```

**確認テンプレート**:

```
質問: 「このタスクを [モデル名] に委任できます。[理由]。委任しますか？」
選択肢:
  - 「委任する（[モデル名]）」: 推奨、コスト効率が高い
  - 「別のモデルで委任」: oss_explore / oss_document / oss_implement / oss_agentic から選択
  - 「Claude が自分で実行」: コンテキスト依存が強い場合
```

---

## 委任推奨条件

### oss_explore → Kimi K2.6

| 条件 | 例 |
|---|---|
| ファイル/ディレクトリ構造の把握 | 「src/ の全ファイルを列挙して」 |
| 関数・クラスの一覧取得 | 「utils.ts のエクスポート関数一覧」 |
| 呼び出し関係の調査 | 「formatName を呼ぶ箇所を全部探して」 |
| コードサマリー作成 | 「このモジュールの概要を説明して」 |
| ログ・設定の確認 | 「ログ出力箇所を全列挙して」 |

### oss_document → DeepSeek V4 Flash

| 条件 | 例 |
|---|---|
| CHANGELOG 生成 | 「直近3コミットの変更履歴を書いて」 |
| JSDoc / docstring 追加 | 「この関数のドキュメントコメントを書いて」 |
| README 更新 | 「Installation セクションを最新に更新して」 |
| 翻訳 | 「英語の説明を日本語に翻訳して」 |
| コミットメッセージ作成 | 「この diff のコミットメッセージを書いて」 |

### oss_implement → DeepSeek V4 Pro

| 条件 | 例 |
|---|---|
| 単体テスト雛形作成 | 「validateToken のテストを既存パターンで書いて」 |
| 単一ファイルのリファクタリング案 | 「この関数を UTC 対応にして」 |
| ボイラープレート生成 | 「新しい API エンドポイントの雛形を作って」 |
| コードレビュー補助 | 「このコードの改善点を教えて」 |

### oss_agentic → GLM-5.1

| 条件 | 例 |
|---|---|
| 複数ステップの実装計画 | 「この機能を安全に段階実装する計画を作って」 |
| 検証戦略・リスク分解 | 「MCP追加後の検証観点と失敗時の切り分けを出して」 |
| ツール利用設計 | 「サブエージェントとMCPをどう組み合わせるか提案して」 |
| 長い反復が必要な設計補助 | 「複雑なリファクタの進め方を分解して」 |

---

## 委任しない条件（主担当AI自身が処理すること）

以下に該当する場合は委任せず、主担当AIが直接処理する:

- **認証・セキュリティ関連**: auth、session、token、暗号化コード
- **秘密情報・非公開データ**: APIキー、顧客データ、社外共有できないコードや文書
- **複数モジュール横断**: 3つ以上のモジュールに影響する変更
- **過去のコンテキスト依存**: 会話中の判断や決定を踏まえた作業
- **スキーマ変更**: DB マイグレーション、API 破壊的変更
- **CI/CD パイプライン**: デプロイ・ビルド設定の変更
- **ユーザー固有の指示を要する作業**: CLAUDE.local.md の設定に依存する判断

---

## 結果統合フォーマット

OSSモデルの結果をユーザーに報告する際のフォーマット:

```
[OSS委任結果 - {モデル名}]

{OSSモデルの応答内容}

---
*{入力トークン} → {出力トークン} tok | コスト節約: Claude実行比 約X倍*

上記の結果を踏まえて、[Claudeによる追加分析や統合コメント]
```

OSSモデルの応答をそのまま渡すのではなく、必ず主担当AIが検証・統合してからユーザーに提示すること。

---

## セットアップ確認

初回使用時は以下を確認する:

1. `tools/mcp-servers/opencode-bridge/.env` が存在し `OPENCODE_GO_API_KEY` が設定されている
2. `pip install -r tools/mcp-servers/opencode-bridge/requirements.txt` 完了済み
3. 利用するAI環境（Codex / Claude Code / Cursor / Windsurf）を再起動して MCP ツールが認識されている

設定が未完了の場合はユーザーに `tools/mcp-servers/opencode-bridge/.env.example` を参照するよう案内する。
