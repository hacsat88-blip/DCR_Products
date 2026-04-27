# Supermemory Multi-Client Setup

## Goal

Copilot CLI、Cursor で同じ project-scoped memory を使い、クライアント間で文脈を共有しつつ Product 混線を防ぐ。

## Scope Strategy

- satoshi-dev
- dcr-core
- product-cyber-stock-dashboard
- product-dexter-jp

各クライアントで server 名を統一し、同じ project_id を使う。

## Shared MCP Server Definitions

次の定義を各クライアントの MCP server 設定へ登録する。

```json
{
  "mcpServers": {
    "supermemory-satoshi-dev": {
      "url": "https://mcp.supermemory.ai/mcp",
      "headers": {
        "x-sm-project": "satoshi-dev"
      }
    },
    "supermemory-dcr-core": {
      "url": "https://mcp.supermemory.ai/mcp",
      "headers": {
        "x-sm-project": "dcr-core"
      }
    },
    "supermemory-product-cyber-stock-dashboard": {
      "url": "https://mcp.supermemory.ai/mcp",
      "headers": {
        "x-sm-project": "product-cyber-stock-dashboard"
      }
    },
    "supermemory-product-dexter-jp": {
      "url": "https://mcp.supermemory.ai/mcp",
      "headers": {
        "x-sm-project": "product-dexter-jp"
      }
    }
  }
}
```

API key を使う場合は各 server に Authorization header を追加する。

## Client Notes

### Copilot CLI

- ルートの .mcp.json を正本として利用する
- 作業対象に応じて対応する supermemory server を使う

### Cursor

- Cursor 側の MCP 設定画面で同じ server 定義を追加する
- Copilot CLI と同じ project_id を使う

## Operation Rules

1. サトシ開発全体の横断判断は supermemory-satoshi-dev
2. DCR core 固有の運用判断は supermemory-dcr-core
3. Product 作業は該当 Product の server を使う
4. 高リスク情報は Y/N 確認を必須にする
5. 正本判断は常に repo source of truth と CI を優先する

## Verification

1. 各クライアントで whoAmI を実行し接続できること
2. satoshi-dev と各 server で memory save を実行し project が分離されること
3. recall で他 Product の記憶が混在しないこと
