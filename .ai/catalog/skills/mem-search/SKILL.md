---
name: mem-search
routing_category: governance
description: Use when you need to recall past work, save new memories, or manage the SQLite FTS5 memory index shared across Claude Code, Cursor, and Codex.
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
  - cursor
---

# mem-search — Cross-Tool Memory Search & Save

## Overview

`mem_cli.py` は SQLite FTS5（trigram + BM25）ベースのメモリ検索CLIで、
Claude Code / Cursor / Codex 間で**同一DBを共有**する。
外部依存ゼロ（Python stdlib のみ）。

**CLIパス（ユーザー固有 — 環境に合わせて置き換える）:**
```
C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem_cli.py
```
実際のパスを確認するには：`python -c "import mem_cli; print(mem_cli.__file__)"`

**DBパス:** 同ディレクトリの `mem.db`

---

## 自動検索（Claude Code のみ）

`settings.json` に登録済みの `UserPromptSubmit` フックが
ユーザープロンプトごとに自動実行し、関連メモリをコンテキストに注入する：

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "command",
        "command": "python -X utf8 \"C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem_cli.py\" search-hook"
      }]
    }]
  }
}
```

> `-X utf8` は Windows で日本語出力を正しく扱うために必須。

---

## 手動検索

```bash
python -X utf8 "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem_cli.py" search "クエリ" --top 5
```

出力例：
```
[過去の類似作業 - メモリ検索結果]
1. [project] 自動売買アプリ設計
   楽天RSS + FastAPI + Next.js 構成
   → project_autotrading.md
```

---

## メモリ保存

ユーザーが「覚えておいて」「保存して」などと言ったとき、または設計決定・フィードバックが固まったとき：

```bash
python -X utf8 "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem_cli.py" quick-save \
  --title "メモリ名" \
  --type project \
  --description "一行説明（MEMORY.md インデックスにも掲載）" \
  --body "詳細本文"
```

| type | 用途 |
|------|------|
| `project` | 進行中の作業・決定・制約 |
| `feedback` | Claude への指示・好み |
| `user` | ユーザー情報・スキル・役割 |
| `reference` | 外部リソースへのポインタ |

`quick-save` は自動で：
1. `.md` ファイルを生成（フロントマター付き）
2. `mem.db` にインデックス追加
3. `MEMORY.md` インデックスを更新

---

## インデックス管理

| コマンド | 用途 |
|---------|------|
| `migrate` | 既存 `.md` を全件インポート（初回セットアップ） |
| `reindex` | DBを再構築（破損・不整合時） |
| `add <file>` | 特定の `.md` を単体追加・更新 |

```bash
# 初回セットアップ
python -X utf8 "...mem_cli.py" migrate

# 再構築
python -X utf8 "...mem_cli.py" reindex
```

---

## 他ツールでの利用（Cursor / Codex）

`mem_cli.py` と `mem.db` はツール非依存。フック登録だけがツール固有。

### Cursor
`.cursorrules` または `AGENTS.md` に下記を追加：

```markdown
## Memory Search
Before responding, run:
python -X utf8 "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem_cli.py" search "{user_query}" --top 3

To save a memory:
python -X utf8 "...mem_cli.py" quick-save --title "..." --type project --description "..." --body "..."
```

### Codex
`AGENTS.md` のシステム指示に同様のルールを追加する。

---

## 保存を能動的に提案するタイミング

以下の状況では「メモリとして保存しますか？」と提案する：
- 設計・アーキテクチャの決定が固まったとき
- 実装タスクが完了したとき
- 明確なフィードバック（「○○はやらないで」「常に○○して」）をもらったとき
- 重要な制約・前提条件が判明したとき

---

## メモリ形式（.md ファイル）

```markdown
---
name: メモリ名
type: project
description: 一行説明
---

詳細本文。
Why: 理由。
How to apply: 適用場面。
```

`MEMORY.md` はインデックスのみ（本文は書かない）：
```markdown
- [メモリ名](filename.md) — 一行説明
```
