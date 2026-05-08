# メモリ自然言語検索 + AI能動提案システム 設計書

**日付:** 2026-05-08  
**ステータス:** 承認済み

---

## 背景・目的

現在のメモリシステム（ファイルベースの Markdown）は手動保存・全件ロード方式で、以下の課題がある：

- **B: ノイズ** — 関係ないメモリが毎回ロードされる
- **C: 探せない** — 自然言語で過去の類似作業を検索できない

claude-mem の良い部分（自然言語検索・能動的提案）を、OpenClaw なしで実現する。

---

## 全体アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│               Claude Code セッション              │
│                                                   │
│  [1] ユーザーがメッセージ送信                     │
│       ↓                                           │
│  [2] UserPromptSubmit フック発火                  │
│       ↓ mem-cli.py search "<メッセージ>"          │
│  [3] SQLite FTS5 が類似メモリを検索               │
│       ↓ Top-3 をコンテキストに注入                │
│  [4] Claude が「過去の類似作業あり」を認識        │
│       ↓ 能動的に提案・採用を打診                  │
│                                                   │
│  [タスク開始時]                                    │
│  Claude 自身が mem-cli.py search を実行して照合   │
│                                                   │
│  [メモリ保存時]                                    │
│  .md ファイル保存 → mem-cli.py add で同期         │
└─────────────────────────────────────────────────┘
```

**設計原則: .md が正、SQLite はインデックス**  
既存 `.md` ファイルは変更なし。`mem.db` が破損しても `reindex` で完全復元可能。

---

## ファイル構成

```
~/.claude/projects/C--Users-hacsa-Desktop------/memory/
├── MEMORY.md          # 既存インデックス（変更なし）
├── *.md               # 既存メモリファイル（変更なし）
├── mem.db             # 新規: SQLite FTS5 データベース
└── mem-cli.py         # 新規: CLI ツール
```

---

## SQLite スキーマ

```sql
CREATE VIRTUAL TABLE memories USING fts5(
    file_path,      -- 例: memory/project_autotrading.md
    type,           -- user / feedback / project / reference
    name,           -- メモリ名
    description,    -- 一行説明
    body,           -- 本文全体（主要検索対象）
    created_at,     -- ファイル更新日時
    tokenize = 'trigram'  -- 日本語対応（3文字n-gram）
);
```

`trigram` トークナイザーを採用することで、日本語の部分一致検索に対応する。デフォルトトークナイザーは英単語分割のみで日本語未対応のため。

---

## mem-cli.py コマンド仕様

| コマンド | 説明 | 主な用途 |
|---------|------|---------|
| `migrate` | 既存 `.md` を全件インポート | 初回セットアップ |
| `search "<query>" [--top N]` | FTS5 検索、Top-N 件返却（デフォルト3） | フック・Claude が使用 |
| `search-hook` | stdin の JSON からクエリを読んで検索 | UserPromptSubmit フック専用 |
| `add <file>` | 1ファイルを追加・更新 | メモリ保存後の同期 |
| `reindex` | `.md` 全件から再構築 | 破損時のリカバリ |

### search の出力形式

```
[過去の類似作業 - メモリ検索結果]
1. [project] 自動売買アプリ設計
   楽天RSS + FastAPI + Next.js 構成。SP-1完了、47テスト全パス。
   → memory/project_autotrading.md

2. ...
```

結果が0件のときは何も出力しない（コンテキスト汚染を防ぐ）。

---

## フック設定

`~/.claude/settings.json` に追記：

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python \"C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem-cli.py\" search-hook"
          }
        ]
      }
    ]
  }
}
```

> **注:** Claude Code の `UserPromptSubmit` フックはユーザーのプロンプトを **stdin に JSON** で渡す。`search-hook` コマンドは stdin を読んでクエリを抽出する。`$CLAUDE_PROMPT` 等の env var は使わない。

### 動作フロー

1. ユーザーがメッセージ送信
2. フックが `mem-cli.py search` を実行
3. Top-3 件が stdout に出力される
4. Claude Code がその出力をコンテキストに注入
5. Claude が結果を読んで判断：
   - **類似あり** → 「以前〇〇をやりました。このアプローチを参考にしますか？」と能動提案
   - **類似なし** → 何も言わず通常通り進める

---

## メモリ保存フロー（変更後）

Claude がメモリ `.md` ファイルを書いたあと、即座に以下を実行してインデックスを同期する：

```bash
python mem-cli.py add <保存したファイルパス>
```

この呼び出しは Claude が手動で行う（追加フック不要）。

---

## ロールアウト計画

| ステップ | 内容 |
|---------|------|
| 1 | `mem-cli.py` を作成（migrate / search / add / reindex 実装） |
| 2 | `python mem-cli.py migrate` で既存2件をインポート・動作確認 |
| 3 | `settings.json` にフックを追記 |
| 4 | 次回セッションから自動動作開始 |

---

## リカバリ手順

`mem.db` が破損・削除された場合：

```bash
python mem-cli.py reindex
```

`.md` ファイルから完全に再構築される。`.md` ファイルが正であるため、データロストのリスクはない。
