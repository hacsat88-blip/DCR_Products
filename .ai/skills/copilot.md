---
name: copilot
description: |
  GitHub Copilot CLI を使用してコードレビュー・分析・設計相談を行う。
  複雑さに応じて /fleet（並列エージェント）を自動選択する。
  トリガー: "copilot", "copilotで", "copilotに聞いて", "並列レビュー", "fleetで"
  使用場面: (1) コードレビュー、(2) 設計相談、(3) バグ調査、(4) 複数ファイル並列分析、(5) リファクタリング計画
---

# Copilot CLI スキル

GitHub Copilot CLI（`copilot` コマンド）を使用してコードレビュー・分析を実行するスキル。
モデルはデフォルトで **GPT-5.3-Codex**（Pro+ 加入済みのため自動選択）。
タスクの複雑さに応じて `/fleet` 並列エージェントを自動発火する。

## 事前チェック（必須）

スキル実行前に以下を確認すること。一つでも失敗したら実行を中止し、ユーザーに理由を伝える。

```bash
# 1. Copilot CLI インストール確認
which copilot || gh copilot --version 2>/dev/null || {
  echo "❌ Copilot CLI が見つかりません。"
  echo "  - 新CLI: gh extension install github/gh-copilot のあと gh copilot init"
  echo "  - または: https://github.com/github/copilot-cli を参照"
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

以下のいずれかに該当する場合は `/fleet`（並列エージェント）を使用する。

| 条件 | 判定 |
|------|------|
| 変更ファイル数 ≥ 3 | 🚀 `/fleet` |
| 複数モジュール・パッケージを跨ぐ | 🚀 `/fleet` |
| テスト + 実装を同時に分析する | 🚀 `/fleet` |
| 「全体を」「横断して」「一気に」等の指示 | 🚀 `/fleet` |
| 上記に該当しない単一ファイル・単純タスク | ✅ 通常実行 |

## 実行パターン

### A. 通常実行（シンプルなタスク）

```bash
cd <project_directory>
copilot -p "<リクエスト>"
```

### B. 並列実行（複雑なタスク） `/fleet` 使用

```bash
# Step 1: 計画を立てる
cd <project_directory>
copilot /plan "<リクエスト>"

# Step 2: 計画を確認・承認後に並列実行
copilot /fleet
```

または一発で実行する場合:

```bash
cd <project_directory>
copilot /fleet "<リクエスト>"
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
| `command not found: copilot` | `gh extension install github/gh-copilot` を案内 |
| GitHub 認証エラー | `gh auth login` を促す |
| `/fleet` でタイムアウト | タスクを分割して個別に再実行 |
| モデル応答なし | `/model` で利用可能なモデルを確認し再試行 |
| 空の出力 | プロンプトを具体化して再試行 |

## モデルについて

- Pro+ 加入済みのため **GPT-5.3-Codex がデフォルト**で自動選択される
- モデルを明示的に変更する場合: `--model <model-name>` または `/model` コマンドで一覧確認
- LTS 期間: 2026/02/05 〜 2027/02/04

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
copilot -p "auth.ts の認証処理をレビューしてください。.envは除外。確認不要、具体的な修正案まで出力してください。"
```

### 複数モジュール横断レビュー（`/fleet`）

```bash
cd /path/to/project
copilot /fleet "src/api/ と src/auth/ と tests/ を横断的にレビューして、一貫性の問題・セキュリティリスクを洗い出してください。確認不要、具体的な修正案まで出力してください。"
```

### 計画 → 並列実行フロー

```bash
cd /path/to/project
copilot /plan "全コンポーネントのTypeScript型安全性を改善する計画を立ててください。"
# → 計画内容を確認・承認
copilot /fleet
```

### バグ調査（通常実行）

```bash
cd /path/to/project
copilot -p "ログイン処理で 401 が返る原因を調査してください。確認不要、原因特定と修正案まで出力してください。"
```

## 実行手順

1. 事前チェックを実行（CLI 存在・GitHub 認証・ディレクトリ）
2. ユーザーから依頼内容を受け取る
3. 複雑さ判定ルールに従い通常実行 or `/fleet` を選択
4. 機密ファイルが存在する場合は除外指示をプロンプトに追記する
5. プロンプト末尾に「確認や質問は不要です。具体的な提案まで自主的に出力してください。」を追加
6. コマンドを実行し、終了コードを確認する
7. エラー時はエラーハンドリング表に従って対処する
8. 結果をユーザーに報告し、Claude の見解と矛盾がある場合は使い分け基準を適用する
