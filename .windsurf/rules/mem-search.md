---
trigger: always_on
description: Memory search — recall past work and save new memories via SQLite FTS5 CLI
---

# Memory Search

## 概要

`mem_cli.py` は SQLite FTS5（trigram + BM25）ベースのメモリ検索CLI。
Claude Code / Windsurf / Cursor / Codex 間で同一DBを共有する。

**CLIパス:**
```
C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem_cli.py
```

---

## 会話開始時の動作

ユーザーのメッセージを受け取ったとき、関連する過去の記録があれば参照する：

```bash
python -X utf8 "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem_cli.py" search "<ユーザーの質問キーワード>" --top 3
```

結果が返ってきた場合は、その内容を踏まえて回答する。
結果が空の場合は無視してよい。

---

## メモリ保存

設計決定・フィードバック・重要な制約が確定したとき、または
ユーザーが「覚えておいて」「保存して」「記録して」と言ったとき：

```bash
python -X utf8 "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem_cli.py" quick-save \
  --title "タイトル" \
  --type project \
  --description "一行説明" \
  --body "詳細"
```

| type | 用途 |
|------|------|
| `project` | 進行中の作業・決定・制約 |
| `feedback` | Cascade への指示・好み |
| `user` | ユーザー情報 |
| `reference` | 外部リソースへのポインタ |

---

## 保存を能動的に提案するタイミング

以下の状況では「メモリとして保存しますか？」と提案する：
- 設計・アーキテクチャの決定が固まったとき
- 実装タスクが完了したとき
- 明確なフィードバックをもらったとき
- 重要な制約・前提条件が判明したとき
