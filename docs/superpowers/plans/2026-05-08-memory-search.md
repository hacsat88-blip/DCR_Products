# Memory Search System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SQLite FTS5 による日本語対応メモリ検索 + Claude Code フックによる自動コンテキスト注入で、過去の類似作業を能動的に提案できるようにする。

**Architecture:** `mem-cli.py` が SQLite FTS5 を操作する単一ファイルツール。`.md` ファイルが正の情報源で `mem.db` はインデックス。`UserPromptSubmit` フックがセッション開始時に `search-hook` を呼び出し、上位3件をコンテキストに注入する。

**Tech Stack:** Python 3.9+ 標準ライブラリのみ（sqlite3, argparse, json, pathlib, re）, pytest（テスト用）

---

## File Map

| ファイル | 役割 |
|---------|------|
| `memory/mem-cli.py` （新規作成） | CLI ツール本体。MemoryDB クラス + 各コマンド |
| `memory/mem.db` （自動生成） | SQLite FTS5 データベース（gitignore 対象） |
| `memory/tests/test_mem_cli.py` （新規作成） | pytest テスト |
| `~/.claude/settings.json` （変更） | UserPromptSubmit フックを追加 |

> パス共通定義:
> - `MEMORY_DIR` = `C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/`
> - `DB_PATH` = `MEMORY_DIR/mem.db`

---

## Task 1: テストディレクトリ + mem-cli.py スケルトン + parse_frontmatter

**Files:**
- Create: `memory/tests/__init__.py`
- Create: `memory/tests/test_mem_cli.py`
- Create: `memory/mem-cli.py`

### Step 1-1: tests ディレクトリ + __init__.py を作成

```bash
mkdir "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/tests"
echo "" > "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/tests/__init__.py"
```

### Step 1-2: `parse_frontmatter` のテストを書く

`memory/tests/test_mem_cli.py` を作成：

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import tempfile
import sqlite3
from mem_cli import parse_frontmatter, MemoryDB


# ── parse_frontmatter ──────────────────────────────────────────

def test_parse_frontmatter_with_valid_frontmatter():
    text = "---\nname: テスト\ntype: project\ndescription: 説明文\n---\n\n本文です。"
    meta, body = parse_frontmatter(text)
    assert meta["name"] == "テスト"
    assert meta["type"] == "project"
    assert meta["description"] == "説明文"
    assert body == "本文です。"


def test_parse_frontmatter_without_frontmatter():
    text = "フロントマターなしの本文"
    meta, body = parse_frontmatter(text)
    assert meta == {}
    assert body == "フロントマターなしの本文"


def test_parse_frontmatter_missing_key_returns_empty_string():
    text = "---\nname: テスト\n---\n\n本文"
    meta, body = parse_frontmatter(text)
    assert meta.get("type", "") == ""
```

- [ ] **Step 1-3: テストが失敗することを確認**

```bash
cd "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory"
python -m pytest tests/test_mem_cli.py::test_parse_frontmatter_with_valid_frontmatter -v
```

期待: `ModuleNotFoundError: No module named 'mem_cli'` または `ImportError`

- [ ] **Step 1-4: `mem-cli.py` スケルトンと `parse_frontmatter` を実装**

`memory/mem-cli.py` を作成：

```python
"""Memory CLI for Claude Code - SQLite FTS5 based search and indexing."""

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

MEMORY_DIR = Path(__file__).parent
DB_PATH = MEMORY_DIR / "mem.db"


def parse_frontmatter(text: str) -> tuple:
    """Parse YAML-like frontmatter from markdown. Returns (meta_dict, body)."""
    match = re.match(r"^---\n(.*?)\n---\n?(.*)", text, re.DOTALL)
    if not match:
        return {}, text.strip()
    meta_text, body = match.group(1), match.group(2)
    meta = {}
    for line in meta_text.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
    return meta, body.strip()
```

- [ ] **Step 1-5: テストが通ることを確認**

```bash
python -m pytest tests/test_mem_cli.py -k "parse_frontmatter" -v
```

期待: `3 passed`

- [ ] **Step 1-6: コミット**

```bash
cd "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory"
git -C "C:/Users/hacsa/Desktop/サトシ開発" add .
git -C "C:/Users/hacsa/Desktop/サトシ開発" commit -m "feat: add mem-cli skeleton with parse_frontmatter"
```

---

## Task 2: MemoryDB スキーマ + add_file

**Files:**
- Modify: `memory/mem-cli.py`
- Modify: `memory/tests/test_mem_cli.py`

- [ ] **Step 2-1: MemoryDB のテストを追加**

`test_mem_cli.py` に追記：

```python
# ── MemoryDB ──────────────────────────────────────────────────

@pytest.fixture
def tmp_db(tmp_path):
    """一時ディレクトリに DB を作成し、テスト用 .md ファイルを配置。"""
    return tmp_path


def test_memory_db_creates_fts5_table(tmp_db):
    db = MemoryDB(tmp_db / "test.db")
    conn = sqlite3.connect(tmp_db / "test.db")
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='memories'"
    )
    assert cursor.fetchone() is not None
    conn.close()
    db.close()


def test_add_file_indexes_memory(tmp_db):
    # テスト用 .md ファイルを作成
    md_file = tmp_db / "test_project.md"
    md_file.write_text(
        "---\nname: テストプロジェクト\ntype: project\ndescription: テスト用の説明\n---\n\nプロジェクト本文。",
        encoding="utf-8",
    )
    db = MemoryDB(tmp_db / "test.db")
    db.add_file(md_file, base_dir=tmp_db)

    conn = sqlite3.connect(tmp_db / "test.db")
    cursor = conn.execute("SELECT name, type FROM memories")
    row = cursor.fetchone()
    assert row is not None
    assert row[0] == "テストプロジェクト"
    assert row[1] == "project"
    conn.close()
    db.close()


def test_add_file_overwrites_existing_entry(tmp_db):
    md_file = tmp_db / "test_project.md"
    md_file.write_text(
        "---\nname: 初期名\ntype: project\ndescription: 初期\n---\n\n本文",
        encoding="utf-8",
    )
    db = MemoryDB(tmp_db / "test.db")
    db.add_file(md_file, base_dir=tmp_db)

    # 更新
    md_file.write_text(
        "---\nname: 更新後の名前\ntype: project\ndescription: 更新済み\n---\n\n本文",
        encoding="utf-8",
    )
    db.add_file(md_file, base_dir=tmp_db)

    conn = sqlite3.connect(tmp_db / "test.db")
    cursor = conn.execute("SELECT COUNT(*) FROM memories")
    count = cursor.fetchone()[0]
    assert count == 1  # 重複なし

    cursor = conn.execute("SELECT name FROM memories")
    assert cursor.fetchone()[0] == "更新後の名前"
    conn.close()
    db.close()
```

- [ ] **Step 2-2: テストが失敗することを確認**

```bash
python -m pytest tests/test_mem_cli.py -k "MemoryDB or add_file" -v
```

期待: `ImportError` または `AttributeError: MemoryDB not defined`

- [ ] **Step 2-3: `MemoryDB` クラスを実装**

`mem-cli.py` の `parse_frontmatter` の下に追加：

```python
class MemoryDB:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.conn = sqlite3.connect(str(db_path))
        self._init_schema()

    def _init_schema(self):
        try:
            self.conn.execute(
                """CREATE VIRTUAL TABLE IF NOT EXISTS memories USING fts5(
                    file_path,
                    type,
                    name,
                    description,
                    body,
                    created_at,
                    tokenize = 'trigram'
                )"""
            )
        except sqlite3.OperationalError:
            # SQLite が trigram 未対応の場合のフォールバック
            self.conn.execute(
                """CREATE VIRTUAL TABLE IF NOT EXISTS memories USING fts5(
                    file_path,
                    type,
                    name,
                    description,
                    body,
                    created_at
                )"""
            )
        self.conn.commit()

    def add_file(self, md_path: Path, base_dir: Path = None):
        """Add or update a memory file in the index."""
        base = base_dir or MEMORY_DIR
        text = md_path.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(text)

        file_path = str(md_path.relative_to(base))
        created_at = datetime.fromtimestamp(md_path.stat().st_mtime).isoformat()

        # FTS5 は UPDATE 非対応のため DELETE → INSERT
        self.conn.execute("DELETE FROM memories WHERE file_path = ?", (file_path,))
        self.conn.execute(
            "INSERT INTO memories VALUES (?, ?, ?, ?, ?, ?)",
            (
                file_path,
                meta.get("type", ""),
                meta.get("name", md_path.stem),
                meta.get("description", ""),
                body,
                created_at,
            ),
        )
        self.conn.commit()

    def close(self):
        self.conn.close()
```

- [ ] **Step 2-4: テストが通ることを確認**

```bash
python -m pytest tests/test_mem_cli.py -k "MemoryDB or add_file" -v
```

期待: `3 passed`

- [ ] **Step 2-5: コミット**

```bash
git -C "C:/Users/hacsa/Desktop/サトシ開発" add .
git -C "C:/Users/hacsa/Desktop/サトシ開発" commit -m "feat: add MemoryDB with FTS5 schema and add_file"
```

---

## Task 3: migrate / reindex / add CLI コマンド

**Files:**
- Modify: `memory/mem-cli.py`
- Modify: `memory/tests/test_mem_cli.py`

- [ ] **Step 3-1: migrate のテストを追加**

`test_mem_cli.py` に追記：

```python
# ── migrate / reindex ─────────────────────────────────────────


def test_migrate_indexes_all_md_files(tmp_db):
    # MEMORY.md は除外、他の .md は全件インポート
    (tmp_db / "MEMORY.md").write_text("# Index", encoding="utf-8")
    (tmp_db / "project_a.md").write_text(
        "---\nname: プロジェクトA\ntype: project\ndescription: Aの説明\n---\n\nA本文",
        encoding="utf-8",
    )
    (tmp_db / "feedback_b.md").write_text(
        "---\nname: フィードバックB\ntype: feedback\ndescription: Bの説明\n---\n\nB本文",
        encoding="utf-8",
    )

    db = MemoryDB(tmp_db / "test.db")
    # memory_dir を tmp_db に向ける
    _migrate(db, memory_dir=tmp_db)

    conn = sqlite3.connect(tmp_db / "test.db")
    cursor = conn.execute("SELECT COUNT(*) FROM memories")
    assert cursor.fetchone()[0] == 2  # MEMORY.md は除外
    conn.close()
    db.close()


def test_reindex_rebuilds_from_scratch(tmp_db):
    md_file = tmp_db / "project_a.md"
    md_file.write_text(
        "---\nname: プロジェクトA\ntype: project\ndescription: A\n---\n\nA本文",
        encoding="utf-8",
    )

    db = MemoryDB(tmp_db / "test.db")
    _migrate(db, memory_dir=tmp_db)

    # 全削除 → 再インポート（reindex の動作）
    db.conn.execute("DELETE FROM memories")
    db.conn.commit()
    _migrate(db, memory_dir=tmp_db)

    conn = sqlite3.connect(tmp_db / "test.db")
    cursor = conn.execute("SELECT COUNT(*) FROM memories")
    assert cursor.fetchone()[0] == 1
    conn.close()
    db.close()
```

- [ ] **Step 3-2: テストが失敗することを確認**

```bash
python -m pytest tests/test_mem_cli.py -k "migrate or reindex" -v
```

期待: `ImportError` または `NameError: _migrate not defined`

- [ ] **Step 3-3: `_migrate` ヘルパーと CLI コマンドを実装**

`mem-cli.py` の `MemoryDB` クラスの後に追加：

```python
def _migrate(db: "MemoryDB", memory_dir: Path = None):
    """memory_dir の .md ファイルを全件インデックスする内部関数。"""
    base = memory_dir or MEMORY_DIR
    md_files = [f for f in base.glob("*.md") if f.name != "MEMORY.md"]
    for f in md_files:
        db.add_file(f, base_dir=base)
    return md_files


def cmd_migrate(args):
    db = MemoryDB()
    files = _migrate(db)
    for f in files:
        print(f"Indexed: {f.name}")
    print(f"Done. {len(files)} file(s) indexed.")
    db.close()


def cmd_add(args):
    path = Path(args.file).resolve()
    if not path.exists():
        print(f"Error: {path} not found", file=sys.stderr)
        sys.exit(1)
    db = MemoryDB()
    db.add_file(path)
    print(f"Indexed: {path.name}")
    db.close()


def cmd_reindex(args):
    db = MemoryDB()
    db.conn.execute("DELETE FROM memories")
    db.conn.commit()
    files = _migrate(db)
    for f in files:
        print(f"Indexed: {f.name}")
    print(f"Reindex complete. {len(files)} file(s).")
    db.close()
```

テストの import 行も更新：

```python
from mem_cli import parse_frontmatter, MemoryDB, _migrate
```

- [ ] **Step 3-4: テストが通ることを確認**

```bash
python -m pytest tests/test_mem_cli.py -k "migrate or reindex" -v
```

期待: `2 passed`

- [ ] **Step 3-5: コミット**

```bash
git -C "C:/Users/hacsa/Desktop/サトシ開発" add .
git -C "C:/Users/hacsa/Desktop/サトシ開発" commit -m "feat: add migrate/reindex/add commands"
```

---

## Task 4: search + format_results + search-hook

**Files:**
- Modify: `memory/mem-cli.py`
- Modify: `memory/tests/test_mem_cli.py`

- [ ] **Step 4-1: search と format_results のテストを追加**

`test_mem_cli.py` に追記：

```python
# ── search / format_results ───────────────────────────────────

from mem_cli import format_results


def _make_db_with_memories(tmp_db):
    """テスト用 DB に2件のメモリを挿入して返す。"""
    db = MemoryDB(tmp_db / "test.db")
    for name, typ, desc, body in [
        ("自動売買アプリ", "project", "楽天RSS + FastAPI", "FastAPI で自動売買。47テスト全パス。"),
        ("テスト方針", "feedback", "DBモックは禁止", "本番DBのみ使用すること。"),
    ]:
        md = tmp_db / f"{name}.md"
        md.write_text(
            f"---\nname: {name}\ntype: {typ}\ndescription: {desc}\n---\n\n{body}",
            encoding="utf-8",
        )
        db.add_file(md, base_dir=tmp_db)
    return db


def test_search_returns_relevant_result(tmp_db):
    db = _make_db_with_memories(tmp_db)
    results = db.search("自動売買", top=3)
    assert len(results) >= 1
    assert results[0]["name"] == "自動売買アプリ"
    db.close()


def test_search_returns_empty_for_no_match(tmp_db):
    db = _make_db_with_memories(tmp_db)
    results = db.search("存在しないキーワードXYZ123", top=3)
    assert results == []
    db.close()


def test_format_results_empty_returns_empty_string():
    assert format_results([]) == ""


def test_format_results_nonempty_includes_header():
    results = [
        {"type": "project", "name": "テスト", "description": "説明", "file_path": "test.md", "body": ""}
    ]
    output = format_results(results)
    assert "[過去の類似作業" in output
    assert "テスト" in output
    assert "test.md" in output
```

- [ ] **Step 4-2: テストが失敗することを確認**

```bash
python -m pytest tests/test_mem_cli.py -k "search or format_results" -v
```

期待: `ImportError` または `AttributeError: 'MemoryDB' object has no attribute 'search'`

- [ ] **Step 4-3: `search`、`format_results`、`cmd_search`、`cmd_search_hook` を実装**

`mem-cli.py` の `_migrate` より前に追加：

```python
def format_results(results: list) -> str:
    """Format search results for context injection. Returns empty string if no results."""
    if not results:
        return ""
    lines = ["[過去の類似作業 - メモリ検索結果]"]
    for i, r in enumerate(results, 1):
        snippet = r["description"] or r["body"][:100].replace("\n", " ")
        lines.append(f"{i}. [{r['type']}] {r['name']}")
        lines.append(f"   {snippet}")
        lines.append(f"   → {r['file_path']}")
        if i < len(results):
            lines.append("")
    return "\n".join(lines)
```

`MemoryDB` クラスに `search` メソッドを追加（`add_file` の後）：

```python
    def search(self, query: str, top: int = 3) -> list:
        """Search memories using FTS5 BM25 ranking. Returns list of dicts."""
        try:
            cursor = self.conn.execute(
                """SELECT file_path, type, name, description, body
                   FROM memories
                   WHERE memories MATCH ?
                   ORDER BY rank
                   LIMIT ?""",
                (query, top),
            )
            rows = cursor.fetchall()
        except sqlite3.OperationalError:
            return []
        return [
            {
                "file_path": r[0],
                "type": r[1],
                "name": r[2],
                "description": r[3],
                "body": r[4],
            }
            for r in rows
        ]
```

CLI コマンドを `cmd_reindex` の後に追加：

```python
def cmd_search(args):
    if not DB_PATH.exists():
        sys.exit(0)
    db = MemoryDB()
    results = db.search(args.query, top=args.top)
    output = format_results(results)
    if output:
        print(output)
    db.close()


def cmd_search_hook(args):
    """Read stdin JSON from Claude Code UserPromptSubmit hook, search, print results."""
    if not DB_PATH.exists():
        sys.exit(0)
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
        query = data.get("prompt", "")
    except (json.JSONDecodeError, KeyError, ValueError):
        sys.exit(0)  # 無音終了 - セッションを壊さない

    if not query.strip():
        sys.exit(0)

    db = MemoryDB()
    results = db.search(query, top=3)
    output = format_results(results)
    if output:
        print(output)
    db.close()
```

- [ ] **Step 4-4: テストが通ることを確認**

```bash
python -m pytest tests/test_mem_cli.py -v
```

期待: 全テスト `passed`

- [ ] **Step 4-5: argparse の main() を追加**

`mem-cli.py` の末尾に追加：

```python
def main():
    parser = argparse.ArgumentParser(description="Memory CLI for Claude Code")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("migrate", help="Import all .md files into SQLite")
    sub.add_parser("reindex", help="Rebuild index from .md files")
    sub.add_parser("search-hook", help="Search via stdin JSON (for hooks)")

    sp = sub.add_parser("search", help="Search memories")
    sp.add_argument("query")
    sp.add_argument("--top", type=int, default=3)

    ap = sub.add_parser("add", help="Add/update a .md file")
    ap.add_argument("file")

    args = parser.parse_args()
    dispatch = {
        "migrate": cmd_migrate,
        "reindex": cmd_reindex,
        "search": cmd_search,
        "search-hook": cmd_search_hook,
        "add": cmd_add,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4-6: 全テスト再確認**

```bash
python -m pytest tests/test_mem_cli.py -v
```

期待: 全テスト `passed`

- [ ] **Step 4-7: コミット**

```bash
git -C "C:/Users/hacsa/Desktop/サトシ開発" add .
git -C "C:/Users/hacsa/Desktop/サトシ開発" commit -m "feat: add search, format_results, search-hook, CLI main"
```

---

## Task 5: settings.json にフックを追加

**Files:**
- Modify: `~/.claude/settings.json`

- [ ] **Step 5-1: 現在の settings.json を確認**

`C:/Users/hacsa/.claude/settings.json` の現在の内容（変更前のバックアップ用に手元に控えておく）：

```json
{
  "model": "opusplan",
  "enabledPlugins": { ... },
  "extraKnownMarketplaces": { ... },
  "effortLevel": "high",
  "autoUpdatesChannel": "latest"
}
```

- [ ] **Step 5-2: `hooks` セクションを追加**

`C:/Users/hacsa/.claude/settings.json` を以下に更新（既存キーはそのまま維持）：

```json
{
  "model": "opusplan",
  "enabledPlugins": {
    "github@claude-plugins-official": true,
    "agent-sdk-dev@claude-plugins-official": true,
    "superpowers@claude-plugins-official": true,
    "warp@claude-code-warp": true
  },
  "extraKnownMarketplaces": {
    "claude-code-warp": {
      "source": {
        "source": "github",
        "repo": "warpdotdev/claude-code-warp"
      }
    }
  },
  "effortLevel": "high",
  "autoUpdatesChannel": "latest",
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

- [ ] **Step 5-3: フックを手動でテスト**

stdin に JSON を渡して動作確認：

```bash
echo '{"prompt": "自動売買アプリ FastAPI"}' | python "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem-cli.py" search-hook
```

> DB がまだ空のため `migrate` 実行後に再テスト（Task 6 で行う）。

- [ ] **Step 5-4: コミット**

```bash
git -C "C:/Users/hacsa/Desktop/サトシ開発" add .
git -C "C:/Users/hacsa/Desktop/サトシ開発" commit -m "feat: add UserPromptSubmit hook to settings.json"
```

---

## Task 6: 初回 migrate + スモークテスト

**Files:**
- 生成: `memory/mem.db`

- [ ] **Step 6-1: 初回 migrate を実行**

```bash
python "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem-cli.py" migrate
```

期待出力：
```
Indexed: project_autotrading.md
Done. 1 file(s) indexed.
```

- [ ] **Step 6-2: search コマンドで動作確認**

```bash
python "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem-cli.py" search "自動売買 FastAPI"
```

期待出力：
```
[過去の類似作業 - メモリ検索結果]
1. [project] 自動売買アプリ設計（SP-1完了）
   楽天RSS + Python FastAPI + Next.js 構成の AI 自動売買アプリ。SP-1（Pythonサーバー）実装完了。
   → project_autotrading.md
```

- [ ] **Step 6-3: search-hook の動作確認**

```bash
echo '{"prompt": "自動売買アプリ FastAPI"}' | python "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem-cli.py" search-hook
```

期待: Step 6-2 と同じ出力

- [ ] **Step 6-4: 関係ないクエリで結果0件を確認**

```bash
echo '{"prompt": "今日の天気"}' | python "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem-cli.py" search-hook
```

期待: **出力なし**（コンテキスト汚染なし）

- [ ] **Step 6-5: mem.db を .gitignore に追加**

`C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/.gitignore` を作成（なければ）：

```
mem.db
```

- [ ] **Step 6-6: 最終コミット**

```bash
git -C "C:/Users/hacsa/Desktop/サトシ開発" add .
git -C "C:/Users/hacsa/Desktop/サトシ開発" commit -m "feat: complete memory search system - initial migration done"
```

---

## 完成後の運用フロー

### メモリ保存時（私が行う）

`.md` ファイルを保存したあと必ず実行：
```bash
python "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem-cli.py" add "<保存したファイルのフルパス>"
```

### DB 破損時のリカバリ

```bash
python "C:/Users/hacsa/.claude/projects/C--Users-hacsa-Desktop------/memory/mem-cli.py" reindex
```

### セッション開始時の自動動作（設定済み）

ユーザーが最初のメッセージを送信 → フックが `search-hook` を呼び出し → 関連メモリがあれば私が能動的に提案。
