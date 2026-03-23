---
name: copilot
description: |
  GitHub Copilot CLI を使用してコードレビュー・分析・設計相談を行う。
  複雑さに応じて並列エージェントモードを自動選択する。
  トリガー: "copilot", "copilotで", "copilotに聞いて", "並列レビュー", "fleetで"
  使用場面: (1) コードレビュー、(2) 設計相談、(3) バグ調査、(4) 複数ファイル並列分析、(5) リファクタリング計画
---

# Copilot CLI スキル

GitHub Copilot CLI（`gh copilot` コマンド）を使用してコードレビュー・分析を実行するスキル。
タスクの複雑さに応じて並列エージェントモードを自動選択する。

## 事前チェック（必須）

スキル実行前に以下を確認すること。一つでも失敗したら実行を中止し、ユーザーに理由を伝える。

```bash
# 1. Copilot CLI インストール確認（gh extension として確認）
gh copilot --version 2>/dev/null || {
  echo "❌ GitHub Copilot CLI が見つかりません。"
  echo "  インストール: gh extension install github/gh-copilot"
  echo "  初期化: gh copilot init"
  exit 1
}

# 2. GitHub 認証確認
gh auth status 2>/dev/null || {
  echo "❌ GitHub 認証が必要です。gh auth login を実行してください。"
  exit 1
}

# 3. 対象ディレクトリ確認
TARGET_DIR="${1:-$(pwd)}"
[ -d "$TARGET_DIR" ] || {
  echo "❌ ディレクトリが存在しません: $TARGET_DIR"
  exit 1
}
```

## 複雑さ判定ルール（自動選択）

以下のいずれかに該当する場合は並列エージェントモードを使用する。

| 条件 | 判定 |
|------|------|
| 変更ファイル数 ≥ 3 | 🚀 並列実行 |
| 複数モジュール・パッケージを跨ぐ | 🚀 並列実行 |
| テスト + 実装を同時に分析する | 🚀 並列実行 |
| 「全体を」「横断して」「一気に」等の指示 | 🚀 並列実行 |
| 上記に該当しない単一ファイル・単純タスク | ✅ 通常実行 |

## 実行パターン

> **注記**: `gh copilot suggest` / `gh copilot explain` が実際のコマンドです。
> 「計画」「並列実行」はワークフローの概念であり、複数の `gh copilot` 呼び出しに分解して実現します。

### A. 通常実行（シンプルなタスク）

```bash
cd <project_directory>
gh copilot suggest "<リクエスト>"
# または説明・解析の場合:
gh copilot explain "<対象コードや質問>"
```

### B. 並列実行（複雑なタスク）

複数の対象を独立したリクエストに分割して順次・並行して実行する:

```bash
cd <project_directory>
# 対象ごとに分割して実行
gh copilot suggest "src/api/ のレビュー: <リクエスト>"
gh copilot suggest "src/auth/ のレビュー: <リクエスト>"
gh copilot suggest "tests/ のレビュー: <リクエスト>"
```

## プロンプトのルール

Copilot に渡すリクエストには以下を必ず含めること:

> 「確認や質問は不要です。具体的な提案・修正案・コード例まで自主的に出力してください。」

## 機密ファイルの除外

以下のファイルが対象ディレクトリに含まれる場合、リクエストに除外指示を追記すること:

```
.env, .env.*, *.key, *.pem, secrets.*, credentials.*, auth.json
```

追記例:
> 「.env や *.key などの機密ファイルは分析対象から除外してください。」

## エラーハンドリング

| エラー | 対処 |
|--------|------|
| `command not found: gh` | `gh` CLI をインストール後、`gh extension install github/gh-copilot` を案内 |
| `gh copilot` が見つからない | `gh extension install github/gh-copilot` を促す |
| GitHub 認証エラー | `gh auth login` を促す |
| タイムアウト | タスクを分割して個別に再実行 |
| 空の出力 | プロンプトを具体化して再試行 |

## 利用可能なモデルの確認

使用できるモデルは環境・プラン・時期によって異なります。実行時に以下で確認してください:

```bash
gh copilot --help
# または公式ドキュメントを参照: https://docs.github.com/copilot/using-github-copilot/using-github-copilot-in-the-command-line
```

## Claude と Copilot の使い分け

両者の回答が矛盾した場合の判断基準:

| 観点 | 優先すべき回答 |
|------|---------------|
| プロジェクト文脈・仕様 | Claude（コンテキストをより保持） |
| 一般的なコードパターン | どちらも参考にして判断 |
| セキュリティ指摘 | より厳しい方を採用 |
| 矛盾が解消しない場合 | ユーザーに両案を提示して判断を委ねる |

## 使用例

### 単一ファイルのレビュー（通常実行）

```bash
cd /path/to/project
gh copilot suggest "auth.ts の認証処理をレビューしてください。.envは除外。確認不要、具体的な修正案まで出力してください。"
```

### 複数モジュール横断レビュー（並列実行）

```bash
cd /path/to/project
gh copilot suggest "src/api/ をレビューして一貫性の問題・セキュリティリスクを洗い出してください。確認不要、修正案まで出力してください。"
gh copilot suggest "src/auth/ をレビューして一貫性の問題・セキュリティリスクを洗い出してください。確認不要、修正案まで出力してください。"
gh copilot suggest "tests/ をレビューしてカバレッジの抜けを指摘してください。確認不要、修正案まで出力してください。"
```

### バグ調査（通常実行）

```bash
cd /path/to/project
gh copilot suggest "ログイン処理で 401 が返る原因を調査してください。確認不要、原因特定と修正案まで出力してください。"
```

## 実行手順

1. 事前チェックを実行（CLI 存在・GitHub 認証・ディレクトリ）
2. ユーザーから依頼内容を受け取る
3. 複雑さ判定ルールに従い通常実行 or 並列実行を選択
4. 機密ファイルが存在する場合は除外指示をプロンプトに追記する
5. プロンプト末尾に「確認や質問は不要です。具体的な提案まで自主的に出力してください。」を追加
6. コマンドを実行し、終了コードを確認する
7. エラー時はエラーハンドリング表に従って対処する
8. 結果をユーザーに報告し、Claude の見解と矛盾がある場合は使い分け基準を適用する
