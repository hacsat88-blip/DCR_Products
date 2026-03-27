# Python Standards — 言語固有ベースライン

> origin: ECC python/coding-style.md + python/testing.md (DCR 向けに再構成)
> extends: `_coding-standards.md`（共通ルール）を前提とする
> deploy.ps1: `_` プレフィクスのため deploy 対象外（参照ドキュメント）

## コーディング規約

### PEP 8 準拠

- PEP 8 に従う（インデント 4 スペース、行長 88 文字 — black デフォルト）
- 全関数シグネチャに型アノテーションを付ける

```python
# NG: 型なし
def calculate_total(items, tax_rate):
    return sum(i.price for i in items) * (1 + tax_rate)

# OK: 型あり
def calculate_total(items: list[Item], tax_rate: float) -> float:
    return sum(i.price for i in items) * (1 + tax_rate)
```

### 不変データ構造

デフォルトで不変なデータクラスを使う:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    email: str

from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

### フォーマッター / リンター

| ツール | 用途 |
|--------|------|
| `black` | コードフォーマット |
| `isort` | import の整列 |
| `ruff` | リント（flake8 + isort + pyupgrade 統合） |
| `mypy` | 静的型チェック |

> `ruff` は `black` + `isort` の機能も含むため、単一ツールに統合可能。

## エラー処理

- 広すぎる `except Exception` を避け、具体的な例外を捕捉する
- ログに traceback を含める (`logger.exception()`)
- ユーザー向けメッセージと内部エラーを分離する

```python
import logging

logger = logging.getLogger(__name__)

async def fetch_user(user_id: str) -> User:
    try:
        return await db.get_user(user_id)
    except UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except DatabaseError:
        logger.exception("DB error fetching user %s", user_id)
        raise HTTPException(status_code=500, detail="Internal error")
```

## テスト

### フレームワーク

- **pytest** を標準とする
- `pytest.mark` でテストを分類する

```python
import pytest

@pytest.mark.unit
def test_calculate_total():
    items = [Item(price=100), Item(price=200)]
    assert calculate_total(items, 0.1) == 330.0

@pytest.mark.integration
def test_database_connection():
    ...
```

### カバレッジ

```bash
pytest --cov=src --cov-report=term-missing
```

### フィクスチャの原則

- テスト間で共有する前提条件は `conftest.py` に fixture として定義
- DB フィクスチャはテストごとにロールバックする（トランザクション分離）
- モックは外部境界（API, DB）のみに限定し、内部ロジックのモックは避ける

### ディレクトリ構成

```
src/
  users/
    service.py
tests/
  unit/
    test_service.py
  integration/
    test_api.py
  conftest.py
```
