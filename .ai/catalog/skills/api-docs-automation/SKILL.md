---
name: api-docs-automation
routing_category: documents
deprecated: true
successor: documents-ops
deprecation_reason: "Folded into documents-ops API and Architecture lane for OpenAI Skills baseline slimming."
description: "APIドキュメント自動生成：OpenAPI 3.x・Redoc/Swagger UI・スキーマ駆動開発・ドキュメントCI"
disable-model-invocation: true
---

# API Docs Automation

## 基本原則

- コードとドキュメントは常に同期させる（手動更新は必ず漏れる）
- Design-First でAPIを設計し、コードを生成する
- ドキュメントは開発者の体験を決める——UXとして設計する

## Design-First vs Code-First

| アプローチ | 手順 | メリット | デメリット |
|----------|------|---------|-----------|
| Design-First | 仕様→実装 | 先行合意・整合性保証 | 初期コスト高 |
| Code-First | 実装→仕様生成 | 開発速度優先 | 仕様と実装のズレリスク |

## OpenAPI 3.x 自動生成

### FastAPI（Python）
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="My API",
    version="1.0.0",
    description="## Overview\nThis API manages users.",
)

class UserResponse(BaseModel):
    """ユーザー情報"""
    id: int
    name: str
    email: str

@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="ユーザー取得",
    description="指定IDのユーザー情報を返します",
    tags=["users"],
)
async def get_user(user_id: int):
    ...

# → /docs (Swagger UI), /redoc (ReDoc), /openapi.json が自動生成
```

### NestJS（TypeScript）
```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get(':id')
  @ApiOperation({ summary: 'ユーザー取得' })
  @ApiResponse({ status: 200, type: UserResponse })
  findOne(@Param('id') id: string) { ... }
}
```

## Redoc / Swagger UI 設定

```yaml
# redoc-config.yaml
theme:
  colors:
    primary: { main: '#0066cc' }
  typography:
    fontSize: '16px'
    fontFamily: 'Noto Sans JP, sans-serif'

# 推奨: Redoc（読みやすい）を公開向け、Swagger UI を開発向けに使い分け
```

## ドキュメント CI（変更時の自動更新）

```yaml
# GitHub Actions: OpenAPI 仕様の差分チェック
name: API Docs Check
on: [pull_request]
jobs:
  check:
    steps:
      - name: Generate OpenAPI spec
        run: python -m pytest --generate-openapi openapi.json
      - name: Detect breaking changes
        uses: oasdiff/oasdiff-action@main
        with:
          base: main/openapi.json
          revision: openapi.json
          fail-on-diff: breaking
      - name: Deploy docs to GitHub Pages
        if: github.ref == 'refs/heads/main'
        run: npx redoc-cli bundle openapi.json -o docs/index.html
```

## チェックリスト

- [ ] 全エンドポイントに `summary` と `description` を設定
- [ ] レスポンス型に `response_model` / `@ApiResponse` を設定
- [ ] エラーレスポンス（400/401/404/500）をドキュメント化
- [ ] Breaking change チェックを CI に組み込み
- [ ] ドキュメントを公開URL（GitHub Pages/Netlify）にデプロイ
